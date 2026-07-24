/**
 * Tests for the trivia tug-of-war server half: opening hands deal from a
 * shared per-team deck, answers score and pull the rope, a wall touch pins
 * the match and reports the winning side, and redaction hides every hand but
 * the viewer's own.
 */
import { describe, expect, it } from "vitest";
import { triviaGame, SCORE_CORRECT, SCORE_WRONG } from "./server";
import type { TriviaState } from "./server";
import type { TriviaView } from "./view";
import type { BankQuestion } from "./deal";
import { ROPE_PULL, WRONG_PULL_FRACTION } from "./rope";

const bank: BankQuestion[] = Array.from({ length: 8 }, (_, i) => ({
  id: `q${i}`,
  prompt: `prompt ${i}`,
  correctAnswer: `correct${i}`,
  incorrectAnswers: [`wrong${i}a`, `wrong${i}b`, `wrong${i}c`],
}));

const snapshot = { teamA: ["a1", "a2"], teamB: ["b1"] };

function initGame(seed = "seed"): TriviaState {
  return triviaGame.init(snapshot, seed, bank);
}

function answer(
  state: TriviaState,
  playerId: string,
  correct: boolean,
  now: number,
): TriviaState {
  const current = state.players[playerId]!.current!;
  const card = state.deck[current]!;
  const choiceIndex = correct ? card.correctIndex : (card.correctIndex + 1) % 4;
  return triviaGame.apply(
    state,
    playerId,
    { type: "answer", deckIndex: current, choiceIndex },
    now,
  );
}

describe("trivia server", () => {
  it("init deals every player a distinct opening card from their team's shared deck", () => {
    const state = initGame();
    expect(state.players.a1!.current).toBe(0);
    expect(state.players.a2!.current).toBe(1);
    expect(state.cursorA).toBe(2);
    expect(state.players.b1!.current).toBe(0);
    expect(state.cursorB).toBe(1);
    expect(state.rope).toEqual({ p: 0, at: 0 });
    expect(state.pinned).toBeNull();
  });

  it("init without context yields an empty deck and null hands", () => {
    const state = triviaGame.init(snapshot, "seed");
    expect(state.deck).toEqual([]);
    expect(state.cursorA).toBe(0);
    expect(state.cursorB).toBe(0);
    expect(state.players.a1!.current).toBeNull();
    expect(state.players.a2!.current).toBeNull();
    expect(state.players.b1!.current).toBeNull();
  });

  it("a correct answer scores +3, pulls toward the answering side, and deals the next card", () => {
    const s0 = initGame();
    const s1 = answer(s0, "a1", true, 1000);
    expect(s1.players.a1!.score).toBe(SCORE_CORRECT);
    expect(s1.players.a1!.lastResult).toBe("correct");
    expect(s1.rope.p).toBeCloseTo(ROPE_PULL / 2, 10);
    expect(s1.rope.at).toBe(1000);
    expect(s1.players.a1!.current).not.toBeNull();
    expect(s1.players.a1!.current).not.toBe(0);
    expect(s1.players.a1!.seen).toEqual([0]);
    // Immutable: original state untouched.
    expect(s0.players.a1!.score).toBe(0);
  });

  it("a wrong answer scores -1 and pushes backward by a third", () => {
    const s0 = initGame();
    const s1 = answer(s0, "a1", false, 1000);
    expect(s1.players.a1!.score).toBe(SCORE_WRONG);
    expect(s1.players.a1!.lastResult).toBe("wrong");
    expect(s1.rope.p).toBeCloseTo(-(ROPE_PULL / 2) * WRONG_PULL_FRACTION, 10);
  });

  it("a stale deckIndex is a no-op", () => {
    const s0 = initGame();
    const current = s0.players.a1!.current!;
    const staleIndex = (current + 1) % s0.deck.length;
    const result = triviaGame.apply(
      s0,
      "a1",
      { type: "answer", deckIndex: staleIndex, choiceIndex: 0 },
      1000,
    );
    expect(result).toBe(s0);
  });

  it("answers after a pin are no-ops", () => {
    let s = initGame();
    // b1 is alone on team B (teamSize 1): three quick corrects pin at -1.
    s = answer(s, "b1", true, 1000);
    s = answer(s, "b1", true, 1000);
    s = answer(s, "b1", true, 1000);
    expect(s.pinned).toBe("B");
    const after = answer(s, "b1", true, 1000);
    expect(after).toBe(s);
  });

  it("pins end the game and outcome reports the pinned side", () => {
    let s = initGame();
    s = answer(s, "b1", true, 1000);
    expect(s.pinned).toBeNull();
    s = answer(s, "b1", true, 1000);
    expect(Math.abs(s.rope.p)).toBeCloseTo(0.9, 10);
    expect(s.pinned).toBeNull();
    s = answer(s, "b1", true, 1000);
    expect(s.rope.p).toBe(-1);
    expect(s.pinned).toBe("B");
    expect(triviaGame.isFinished(s, 999999)).toBe(true);
    expect(triviaGame.outcome!(s)).toBe("B");
  });

  it("scores returns the per-player map", () => {
    let s = initGame();
    s = answer(s, "a1", true, 1000);
    s = answer(s, "b1", false, 1000);
    expect(triviaGame.scores(s)).toEqual({
      a1: SCORE_CORRECT,
      a2: 0,
      b1: SCORE_WRONG,
    });
  });

  it("redact hides answers and other hands", () => {
    const s = initGame();
    const viewA1 = triviaGame.redact!(s, "a1") as TriviaView;
    expect(viewA1.question).toEqual({
      deckIndex: 0,
      prompt: s.deck[0]!.prompt,
      choices: s.deck[0]!.choices,
    });
    expect(viewA1.lastResult).toBeNull();
    expect(viewA1.scores).toEqual({ a1: 0, a2: 0, b1: 0 });
    expect(viewA1.rope).toEqual(s.rope);
    expect(viewA1.pinned).toBeNull();

    const json = JSON.stringify(viewA1);
    s.deck.forEach((card, i) => {
      if (i === s.players.a1!.current) return; // a1's own hand is legitimate
      expect(json).not.toContain(card.choices[card.correctIndex]);
    });

    const spectatorView = triviaGame.redact!(s, null) as TriviaView;
    expect(spectatorView.question).toBeNull();
    expect(spectatorView.lastResult).toBeNull();
  });

  it("wrap deals personally-unseen cards", () => {
    const tinyBank: BankQuestion[] = Array.from({ length: 3 }, (_, i) => ({
      id: `t${i}`,
      prompt: `tiny ${i}`,
      correctAnswer: `tcorrect${i}`,
      incorrectAnswers: [`ta${i}`, `tb${i}`, `tc${i}`],
    }));
    let s = triviaGame.init(snapshot, "tiny-seed", tinyBank);
    expect(s.deck).toHaveLength(3);
    // Space answers a half-life apart so the rope decays and stays unpinned
    // long enough to walk the whole tiny deck once.
    const seenIndexes = new Set<number>();
    for (let i = 0; i < 3; i++) {
      const current = s.players.b1!.current!;
      expect(seenIndexes.has(current)).toBe(false);
      seenIndexes.add(current);
      s = answer(s, "b1", true, i * 10_000);
      expect(s.pinned).toBeNull();
    }
    expect(seenIndexes.size).toBe(3);
    // Every card personally seen: the next deal repeats one of them.
    expect(s.players.b1!.seen).toHaveLength(3);
    expect(s.players.b1!.current).not.toBeNull();
    expect(seenIndexes.has(s.players.b1!.current!)).toBe(true);
  });
});
