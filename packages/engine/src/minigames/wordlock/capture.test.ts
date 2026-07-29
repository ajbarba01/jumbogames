/**
 * Coverage for Word Lock capture resolution: path validity, word reading,
 * neutral capture, breaking shorter words, the strictly-longer block
 * (including against the capturing player's own team), all-or-nothing
 * resolution across multiple crossed words, and the no-repeat gate.
 */
import { beforeAll, describe, expect, it } from "vitest";
import {
  isContiguousSimplePath,
  pathWord,
  resolveCapture,
  tileOwnerIndex,
  type CapturedWord,
} from "./capture";
import { installWordList, resetWordListForTests } from "./dictionary";

// C A T S
// R O B E
// A N T S
// M E A D
const LETTERS = "CATSROBEANTSMEAD";
const SIDE = 4;

function submit(
  path: number[],
  words: CapturedWord[] = [],
  team: "A" | "B" = "A",
  played: string[] = [],
  enforceNoRepeat = false,
) {
  return resolveCapture({
    letters: LETTERS,
    side: SIDE,
    words,
    path,
    playerId: "p1",
    team,
    played,
    enforceNoRepeat,
  });
}

describe("path validity", () => {
  it("accepts orthogonal and diagonal steps", () => {
    expect(isContiguousSimplePath([0, 1, 2], SIDE)).toBe(true);
    expect(isContiguousSimplePath([0, 5, 10], SIDE)).toBe(true);
  });

  it("rejects gaps, repeats and row wraps", () => {
    expect(isContiguousSimplePath([0, 2], SIDE)).toBe(false);
    expect(isContiguousSimplePath([0, 1, 0], SIDE)).toBe(false);
    expect(isContiguousSimplePath([3, 4], SIDE)).toBe(false);
  });
});

describe("pathWord", () => {
  it("reads letters along the path", () => {
    expect(pathWord(LETTERS, [0, 1, 2])).toBe("CAT");
  });
});

describe("resolveCapture", () => {
  beforeAll(() => {
    resetWordListForTests();
    installWordList("CAT\nCATS\nROBE\nANTS\nOBE\nANT\nTAB");
  });

  it("captures neutral tiles", () => {
    const result = submit([0, 1, 2]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.words).toHaveLength(1);
    expect(result.words[0]!.word).toBe("CAT");
    expect(result.words[0]!.side).toBe("A");
  });

  it("rejects words under the minimum length", () => {
    const result = submit([0, 1]);
    expect(result).toMatchObject({ ok: false, reason: "too-short" });
  });

  it("rejects non-words", () => {
    const result = submit([0, 4, 8]);
    expect(result).toMatchObject({ ok: false, reason: "not-a-word" });
  });

  it("rejects discontinuous paths", () => {
    const result = submit([0, 2, 3]);
    expect(result).toMatchObject({ ok: false, reason: "bad-path" });
  });

  it("breaks a shorter word and returns every tile of it to neutral", () => {
    const held: CapturedWord[] = [
      { path: [0, 1, 2], word: "CAT", by: "p9", side: "B" },
    ];
    const result = submit([0, 1, 2, 3], held);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.words).toHaveLength(1);
    expect(result.words[0]!.word).toBe("CATS");
    expect(result.words[0]!.side).toBe("A");
  });

  it("frees the non-overlapping tiles of a broken word", () => {
    const held: CapturedWord[] = [
      { path: [4, 5, 6, 7], word: "ROBE", by: "p9", side: "B" },
    ];
    const result = submit([0, 1, 2, 3], [...held]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // CATS does not cross ROBE, so ROBE survives untouched.
    expect(result.words).toHaveLength(2);
  });

  it("rejects a word that is not strictly longer than a crossed word", () => {
    const held: CapturedWord[] = [
      { path: [0, 1, 2, 3], word: "CATS", by: "p9", side: "B" },
    ];
    const result = submit([0, 1, 2], held);
    expect(result).toMatchObject({ ok: false, reason: "blocked" });
    if (result.ok) return;
    expect(result.blockedBy).toEqual([0, 1, 2, 3]);
  });

  it("applies the longer rule to your own team's words too", () => {
    const held: CapturedWord[] = [
      { path: [0, 1, 2, 3], word: "CATS", by: "p1", side: "A" },
    ];
    const result = submit([0, 1, 2], held, "A");
    expect(result).toMatchObject({ ok: false, reason: "blocked" });
  });

  it("is all-or-nothing across several crossed words", () => {
    const held: CapturedWord[] = [
      { path: [1, 2], word: "AT", by: "p9", side: "B" },
      { path: [0, 4, 8, 12], word: "CRAM", by: "p9", side: "B" },
    ];
    // CAT crosses both: it beats AT (2) but loses to CRAM (4), so nothing
    // lands — not even the tiles it would have won from AT.
    const result = submit([0, 1, 2], held);
    expect(result).toMatchObject({ ok: false, reason: "blocked" });
    if (result.ok) return;
    // The first blocker encountered walking the path decides; tile 0 belongs
    // to CRAM, so that is the word the surface flashes back at the player.
    expect(result.blockedBy).toEqual([0, 4, 8, 12]);
  });

  it("rejects a repeat only when the flag is on", () => {
    expect(submit([0, 1, 2], [], "A", ["CAT"], false).ok).toBe(true);
    expect(submit([0, 1, 2], [], "A", ["CAT"], true)).toMatchObject({
      ok: false,
      reason: "already-played",
    });
  });
});

describe("tileOwnerIndex", () => {
  it("maps tiles to their live word, -1 for neutral", () => {
    const index = tileOwnerIndex(
      [{ path: [0, 1, 2], word: "CAT", by: "p1", side: "A" }],
      16,
    );
    expect(index[0]).toBe(0);
    expect(index[2]).toBe(0);
    expect(index[3]).toBe(-1);
  });
});
