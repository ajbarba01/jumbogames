/**
 * Tests for the trivia server half under the tier model. What matters here is
 * the seam between the pure engines and the game: that an answer advances the
 * rope before it changes the tiers (so a tier bump is never applied
 * retroactively over the interval that preceded it), that a lockout is enforced
 * server-side rather than trusted from the client, and that the slot's winner
 * comes from rope position rather than the score means.
 */
import { describe, expect, it } from "vitest";
import { triviaGame, SCORE_CORRECT } from "./server";
import type { TriviaState } from "./server";
import type { TriviaView } from "./view";
import type { BankQuestion } from "./deal";
import { INITIAL_ROPE, ropeK } from "./rope";
import { INITIAL_TIER, resolveTier } from "./tiers";
import { CHARGE_PER_TIER, LOCKOUT_MS, TIE_EPSILON } from "./tuning";

const bank: BankQuestion[] = Array.from({ length: 8 }, (_, i) => ({
  id: `q${i}`,
  prompt: `prompt ${i}`,
  correctAnswer: `correct${i}`,
  incorrectAnswers: [`wrong${i}a`, `wrong${i}b`, `wrong${i}c`],
}));

const snapshot = { teamA: ["a1", "a2", "a3"], teamB: ["b1"] };

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

describe("init", () => {
  it("seats both teams at tier 1 with unstarted timers, a centred rope, and a roster-derived k", () => {
    const state = initGame();
    expect(state.tierA).toEqual(INITIAL_TIER);
    expect(state.tierB).toEqual(INITIAL_TIER);
    expect(state.rope).toEqual(INITIAL_ROPE);
    expect(state.k).toBeCloseTo(ropeK(3, 1), 12);
    // The deal is unchanged by the tier model.
    expect(state.players.a1!.current).toBe(0);
    expect(state.players.a2!.current).toBe(1);
    expect(state.players.b1!.current).toBe(0);
  });

  it("gives every player a clear lockout and no answers yet", () => {
    const state = initGame();
    expect(state.players.a1!.lockedUntil).toBe(0);
    expect(state.players.a1!.answers).toBe(0);
    expect(state.players.a1!.score).toBe(0);
  });
});

describe("charge", () => {
  it("a correct answer adds 1/teamSize charge to the answering side only", () => {
    const s = answer(initGame(), "a1", true, 1000);
    expect(s.tierA.charge).toBeCloseTo(1 / 3, 10);
    expect(s.tierA.enteredAt).toBe(1000);
    expect(s.tierB).toEqual(INITIAL_TIER);
  });

  it("a wrong answer adds no charge, scores nothing, and stamps a lockout", () => {
    const s = answer(initGame(), "a1", false, 1000);
    expect(s.tierA.charge).toBeCloseTo(0, 10);
    expect(s.players.a1!.score).toBe(0);
    expect(s.players.a1!.lockedUntil).toBe(1000 + LOCKOUT_MS);
    expect(s.players.a1!.lastResult).toBe("wrong");
  });

  it("a wrong answer still deals a fresh card", () => {
    const s0 = initGame();
    const before = s0.players.a1!.current;
    const s1 = answer(s0, "a1", false, 1000);
    expect(s1.players.a1!.current).not.toBe(before);
    expect(s1.players.a1!.seen).toEqual([before]);
  });
});

describe("lockout", () => {
  it("rejects an answer inside the lockout window outright", () => {
    const locked = answer(initGame(), "a1", false, 1000);
    const current = locked.players.a1!.current!;
    const again = triviaGame.apply(
      locked,
      "a1",
      { type: "answer", deckIndex: current, choiceIndex: 0 },
      1000 + LOCKOUT_MS - 1,
    );
    expect(again).toBe(locked);
  });

  it("accepts an answer at exactly lockedUntil", () => {
    const locked = answer(initGame(), "a1", false, 1000);
    const after = answer(locked, "a1", true, 1000 + LOCKOUT_MS);
    expect(after).not.toBe(locked);
    expect(after.players.a1!.score).toBe(SCORE_CORRECT);
  });

  it("locks only the offending player, not their team", () => {
    const locked = answer(initGame(), "a1", false, 1000);
    expect(locked.players.a2!.lockedUntil).toBe(0);
    const teammate = answer(locked, "a2", true, 1500);
    expect(teammate.players.a2!.score).toBe(SCORE_CORRECT);
  });
});

describe("rope", () => {
  it("advances at the tier gap in force during the interval, not the one the answer produces", () => {
    const s0 = initGame();
    // b1 is alone, so one correct answer is a full CHARGE_PER_TIER... only if
    // teamSize is 1. Charge 1/1 per answer, so CHARGE_PER_TIER answers promote.
    let s = s0;
    for (let i = 0; i < CHARGE_PER_TIER; i += 1) {
      s = answer(s, "b1", true, 1000 + i);
    }
    expect(resolveTier(s.tierB, 1000).tier).toBe(2);

    // From here B out-tiers A by one. Advance a long idle stretch with a single
    // further answer at the end and check the integral over that stretch used
    // the gap of 1 that held throughout it. The window starts at rope.at — the
    // instant the integral was last carried to — not at the last answer's
    // timestamp, which the promoting answer already consumed.
    const t2 = s.rope.at + 10_000;
    const before = s.rope.p;
    const elapsedSeconds = (t2 - s.rope.at) / 1000;
    const after = answer(s, "b1", true, t2);
    // B leads, so the rope moves negative.
    expect(after.rope.p).toBeCloseTo(before - s.k * 1 * elapsedSeconds, 10);
  });

  it("does not move while the teams are level", () => {
    let s = initGame();
    // Both timers must start at the same instant. Staggered first answers
    // stagger the demotions too, and the seconds between one team dropping to
    // the floor and the other following are a real one-tier gap — the rope is
    // supposed to move there.
    s = answer(s, "a1", true, 1000);
    s = answer(s, "b1", true, 1000);
    const later = answer(s, "b1", true, 40_000);
    expect(later.rope.p).toBeCloseTo(0, 10);
  });

  it("leaves a team that stalled level with one that never played", () => {
    let s = initGame();
    // b1 climbs, then everyone stops. However long the match idles, B must
    // settle level with A rather than decaying below it — otherwise having
    // played at all would be a penalty.
    for (let i = 0; i < CHARGE_PER_TIER * 3; i += 1) {
      s = answer(s, "b1", true, 1000 + i);
    }
    const idled = 10_000_000;
    expect(resolveTier(s.tierB, idled).tier).toBe(
      resolveTier(s.tierA, idled).tier,
    );
  });
});

describe("finish", () => {
  it("reports a pin that occurred with no action since the last answer", () => {
    let s = initGame();
    // Drive B to a high tier so the gap is wide and the rope runs to the wall
    // on its own, with no further action.
    for (let i = 0; i < CHARGE_PER_TIER * 4; i += 1) {
      s = answer(s, "b1", true, 1000 + i);
    }
    expect(triviaGame.isFinished(s, 1000)).toBe(false);
    expect(triviaGame.isFinished(s, 10_000_000)).toBe(true);
    expect(triviaGame.outcome!(s, 10_000_000)).toBe("B");
  });

  it("returns the leading side at the buzzer without a pin", () => {
    let s = initGame();
    for (let i = 0; i < CHARGE_PER_TIER; i += 1) {
      s = answer(s, "b1", true, 1000 + i);
    }
    const buzzer = 1000 + CHARGE_PER_TIER + 5000;
    const rope = triviaGame.redact!(s, null) as TriviaView;
    expect(rope.pinned).toBeNull();
    expect(triviaGame.outcome!(s, buzzer)).toBe("B");
  });

  it("defers to the score means inside TIE_EPSILON", () => {
    const s = initGame();
    // Nobody has answered: both tiers unstarted, the rope dead centre.
    expect(Math.abs(s.rope.p)).toBeLessThan(TIE_EPSILON);
    expect(triviaGame.outcome!(s, 120_000)).toBeNull();
  });
});

describe("scores", () => {
  it("counts correct answers and ignores wrong ones", () => {
    let s = initGame();
    s = answer(s, "a1", true, 1000);
    s = answer(s, "a2", false, 1000);
    expect(triviaGame.scores(s)).toEqual({
      a1: SCORE_CORRECT,
      a2: 0,
      a3: 0,
      b1: 0,
    });
    expect(SCORE_CORRECT).toBe(1);
  });
});

describe("redact", () => {
  it("hides the deck and every hand but the viewer's own", () => {
    const s = initGame();
    const viewA1 = triviaGame.redact!(s, "a1") as TriviaView;
    expect(viewA1.question).toEqual({
      deckIndex: 0,
      prompt: s.deck[0]!.prompt,
      choices: s.deck[0]!.choices,
    });
    expect(viewA1.tierA).toEqual(s.tierA);
    expect(viewA1.k).toBe(s.k);

    const json = JSON.stringify(viewA1);
    s.deck.forEach((card, i) => {
      if (i === s.players.a1!.current) return; // a1's own hand is legitimate
      expect(json).not.toContain(card.choices[card.correctIndex]);
    });
  });

  it("never ships a correct index for any card", () => {
    const s = answer(initGame(), "a1", false, 1000);
    const view = triviaGame.redact!(s, "a1") as TriviaView;
    expect(JSON.stringify(view)).not.toContain("correctIndex");
  });

  it("reports the viewer's own answers and lockout", () => {
    const s = answer(initGame(), "a1", false, 1000);
    const mine = triviaGame.redact!(s, "a1") as TriviaView;
    expect(mine.answers).toBe(1);
    expect(mine.lockedUntil).toBe(1000 + LOCKOUT_MS);

    // A teammate sees their own zeroes, not a1's.
    const theirs = triviaGame.redact!(s, "a2") as TriviaView;
    expect(theirs.answers).toBe(0);
    expect(theirs.lockedUntil).toBe(0);
  });

  it("gives a spectator no hand at all", () => {
    const s = initGame();
    const view = triviaGame.redact!(s, null) as TriviaView;
    expect(view.question).toBeNull();
    expect(view.answers).toBe(0);
    expect(view.lockedUntil).toBe(0);
    expect(view.lastResult).toBeNull();
  });
});

describe("guards", () => {
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

  it("an unknown player is a no-op", () => {
    const s0 = initGame();
    const result = triviaGame.apply(
      s0,
      "nobody",
      { type: "answer", deckIndex: 0, choiceIndex: 0 },
      1000,
    );
    expect(result).toBe(s0);
  });

  it("answers after a pin are no-ops", () => {
    let s = initGame();
    for (let i = 0; i < CHARGE_PER_TIER * 4; i += 1) {
      s = answer(s, "b1", true, 1000 + i);
    }
    // Far enough ahead that the rope has run to B's wall.
    const pinnedNow = 10_000_000;
    const after = answer(s, "b1", true, pinnedNow);
    expect(after).toBe(s);
  });

  it("init without context yields an empty deck and null hands", () => {
    const state = triviaGame.init(snapshot, "seed");
    expect(state.deck).toEqual([]);
    expect(state.players.a1!.current).toBeNull();
  });
});
