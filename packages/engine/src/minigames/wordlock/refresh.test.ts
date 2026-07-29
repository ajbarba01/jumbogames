/**
 * Coverage for the staleness-targeted refresh: epoch counting, the neutral
 * mask, and the reroll/stale-rewrite behavior of a multi-epoch catch-up.
 */
import { describe, expect, it } from "vitest";
import { advanceRefresh, neutralMask, refreshEpochAt } from "./refresh";
import type { CapturedWord } from "./capture";
import { REFRESH_PERIOD_MS } from "./tuning";

const LETTERS = "ABCDEFGHI";

describe("refreshEpochAt", () => {
  it("counts elapsed periods since the slot started", () => {
    expect(refreshEpochAt(1000, 1000)).toBe(0);
    expect(refreshEpochAt(1000 + REFRESH_PERIOD_MS, 1000)).toBe(1);
    expect(refreshEpochAt(1000 + REFRESH_PERIOD_MS * 3.5, 1000)).toBe(3);
  });

  it("throws on a non-finite clock rather than returning a NaN epoch", () => {
    // Asserted through `advanceRefresh` as well as directly, because the
    // damage was never the NaN itself: a stored NaN epoch makes every later
    // `targetEpoch <= epoch` comparison false, so the board silently stops
    // rerolling for the rest of the match.
    expect(() => refreshEpochAt(NaN, 1000)).toThrow(/finite/);
    expect(() => refreshEpochAt(1000, NaN)).toThrow(/finite/);
    expect(() => refreshEpochAt(Infinity, 1000)).toThrow(/finite/);

    expect(() =>
      advanceRefresh({
        letters: LETTERS,
        stale: "1".repeat(9),
        words: [],
        seed: "s",
        epoch: 0,
        targetEpoch: NaN,
      }),
    ).toThrow(/finite/);
  });
});

describe("neutralMask", () => {
  it("marks unowned tiles", () => {
    const words: CapturedWord[] = [
      { path: [0, 1, 2], word: "ABC", by: "p1", side: "A" },
    ];
    expect(neutralMask(words, 9)).toBe("000111111");
  });
});

describe("advanceRefresh", () => {
  const words: CapturedWord[] = [
    { path: [0, 1, 2], word: "ABC", by: "p1", side: "A" },
  ];

  it("is a no-op when no epoch has elapsed", () => {
    const result = advanceRefresh({
      letters: LETTERS,
      stale: "111111111",
      words,
      seed: "s",
      epoch: 0,
      targetEpoch: 0,
    });
    expect(result.letters).toBe(LETTERS);
  });

  it("rerolls only tiles neutral now and at the previous tick", () => {
    const result = advanceRefresh({
      letters: LETTERS,
      stale: "000111000",
      words,
      seed: "s",
      epoch: 0,
      targetEpoch: 1,
    });
    // Tiles 0-2 are captured, 6-8 were not stale, so only 3-5 reroll.
    expect(result.letters.slice(0, 3)).toBe("ABC");
    expect(result.letters.slice(6)).toBe("GHI");
    expect(result.letters.slice(3, 6)).not.toBe("DEF");
  });

  it("never rerolls a captured tile", () => {
    const result = advanceRefresh({
      letters: LETTERS,
      stale: "111111111",
      words,
      seed: "s",
      epoch: 0,
      targetEpoch: 1,
    });
    expect(result.letters.slice(0, 3)).toBe("ABC");
  });

  it("rewrites the stale mask to the current neutral set", () => {
    const result = advanceRefresh({
      letters: LETTERS,
      stale: "000000000",
      words,
      seed: "s",
      epoch: 0,
      targetEpoch: 1,
    });
    expect(result.stale).toBe("000111111");
    expect(result.epoch).toBe(1);
  });

  it("catches an idle stretch up to the same board the client steps to", () => {
    // The property that matters: a server catching up 0 -> 3 on one action
    // must land on the board a client reached by stepping 0 -> 1 -> 2 -> 3 on
    // its own clock. Comparing one call to an identical call proves nothing —
    // a reroll keyed on a loop counter rather than the absolute epoch would
    // pass that and still diverge here.
    const jump = advanceRefresh({
      letters: LETTERS,
      stale: "111111111",
      words,
      seed: "s",
      epoch: 0,
      targetEpoch: 3,
    });

    let stepped = { letters: LETTERS, stale: "111111111", epoch: 0 };
    for (const targetEpoch of [1, 2, 3]) {
      stepped = advanceRefresh({ ...stepped, words, seed: "s", targetEpoch });
    }

    expect(jump.letters).toBe(stepped.letters);
    expect(jump.stale).toBe(stepped.stale);
    expect(jump.epoch).toBe(3);
  });
});
