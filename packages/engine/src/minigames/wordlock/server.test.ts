/**
 * Tests for the Word Lock server half: board sizing at init, capture and
 * rejection through `apply`, roster gating, refresh catch-up, the absence of
 * a game-decided outcome, and per-viewer redaction of server-only bookkeeping.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { wordLockGame, type WordLockState } from "./server";
import { installWordList, resetWordListForTests } from "./dictionary";
import { findWords } from "./solver";
import { REFRESH_PERIOD_MS } from "./tuning";
import { installBundledWordList } from "./install-words";

const ROSTER = { teamA: ["a1", "a2"], teamB: ["b1", "b2"] };
const START = 1_700_000_000_000;

function init(): WordLockState {
  return wordLockGame.init(ROSTER, "seed", START) as WordLockState;
}

describe("wordLockGame", () => {
  beforeAll(() => {
    resetWordListForTests();
    installBundledWordList();
  });

  it("sizes the board from the combined roster", () => {
    const state = init();
    expect(state.side).toBe(10);
    expect(state.letters).toHaveLength(100);
    expect(state.startedAt).toBe(START);
  });

  it("scores every roster member at zero before any play", () => {
    expect(wordLockGame.scores(init())).toEqual({
      a1: 0,
      a2: 0,
      b1: 0,
      b2: 0,
    });
  });

  it("captures a real word found on its own board", () => {
    const state = init();
    const found = findWords(state.letters, state.side, { limit: 1 })[0]!;
    const next = wordLockGame.apply(
      state,
      "a1",
      { type: "submit", path: found.path },
      START + 1000,
    ) as WordLockState;
    expect(next.words).toHaveLength(1);
    expect(wordLockGame.scores(next).a1).toBe(found.path.length);
  });

  it("records a rejection instead of capturing when the word is bogus", () => {
    const state = init();
    const next = wordLockGame.apply(
      state,
      "a1",
      { type: "submit", path: [0, 1, 2] },
      START + 1000,
    ) as WordLockState;
    if (next.words.length > 0) return; // the board happened to spell a word
    expect(next.lastReject.a1?.reason).toBe("not-a-word");
  });

  it("ignores actions from a player outside the roster", () => {
    const state = init();
    expect(
      wordLockGame.apply(
        state,
        "ghost",
        { type: "submit", path: [0, 1, 2] },
        START,
      ),
    ).toBe(state);
  });

  it("catches the board up through elapsed refresh epochs", () => {
    const state = init();
    const next = wordLockGame.apply(
      state,
      "a1",
      { type: "submit", path: [0, 1, 2] },
      START + REFRESH_PERIOD_MS * 2 + 5,
    ) as WordLockState;
    expect(next.epoch).toBe(2);
    expect(next.letters).not.toBe(state.letters);
  });

  it("advances the board on a tick with no player action", () => {
    const state = init();
    const ticked = wordLockGame.tick!(
      state,
      START + REFRESH_PERIOD_MS * 2 + 5,
    ) as WordLockState;
    expect(ticked.epoch).toBe(2);
    expect(ticked.letters).not.toBe(state.letters);
  });

  it("returns the same state when no refresh period has elapsed", () => {
    const state = init();
    expect(wordLockGame.tick!(state, START + 5)).toBe(state);
  });

  it("never finishes on its own — the slot timer decides", () => {
    expect(wordLockGame.isFinished(init(), START + 999_999)).toBe(false);
  });

  it("declares no outcome, deferring to the normalized means", () => {
    expect(wordLockGame.outcome).toBeUndefined();
  });

  it("projects only the viewer's own bookkeeping", () => {
    const state = init();
    state.played.a1 = ["CAT"];
    state.played.b1 = ["DOG"];
    const view = wordLockGame.redact!(state, "a1") as {
      played: string[];
    };
    expect(view.played).toEqual(["CAT"]);
    expect(JSON.stringify(view)).not.toContain("DOG");
  });
});
