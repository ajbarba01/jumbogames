/**
 * Tests for match selectors: derived phase, gate satisfaction against
 * current membership, and the minigames-won tally.
 */
import { describe, expect, it } from "vitest";
import { derivePhase, isGateSatisfied, minigamesWon } from "./derive";
import type { MatchState, SlotState } from "./types";

function slot(overrides: Partial<SlotState>): SlotState {
  return {
    ordinal: 0,
    kind: "stub",
    phase: "gate",
    ready: [],
    snapshot: null,
    countdownEndsAt: null,
    deadline: null,
    scoringEndsAt: null,
    payload: null,
    normA: null,
    normB: null,
    winner: null,
    ...overrides,
  };
}

function match(
  slots: SlotState[],
  membersA = ["a1"],
  membersB = ["b1"],
): MatchState {
  return {
    matchId: "m1",
    seed: "s",
    teamA: { id: "ta", name: "A", colorIndex: 1, members: membersA },
    teamB: { id: "tb", name: "B", colorIndex: 2, members: membersB },
    slots,
  };
}

describe("derivePhase", () => {
  it("returns the first non-done slot", () => {
    const m = match([
      slot({ ordinal: 0, phase: "done" }),
      slot({ ordinal: 1, phase: "gate" }),
    ]);
    const phase = derivePhase(m);
    expect(phase.kind).toBe("slot");
    if (phase.kind === "slot") expect(phase.slot.ordinal).toBe(1);
  });

  it("returns complete when all slots are done", () => {
    expect(derivePhase(match([slot({ phase: "done" })])).kind).toBe("complete");
  });
});

describe("isGateSatisfied", () => {
  it("requires every current member of both teams", () => {
    const m = match([slot({ ready: ["a1"] })], ["a1"], ["b1"]);
    expect(isGateSatisfied(m, m.slots[0]!)).toBe(false);
    const m2 = match([slot({ ready: ["a1", "b1"] })], ["a1"], ["b1"]);
    expect(isGateSatisfied(m2, m2.slots[0]!)).toBe(true);
  });

  it("is never satisfied with zero members", () => {
    const m = match([slot({})], [], []);
    expect(isGateSatisfied(m, m.slots[0]!)).toBe(false);
  });
});

describe("minigamesWon", () => {
  it("tallies slot winners, ignoring ties", () => {
    const m = match([
      slot({ ordinal: 0, phase: "done", winner: "A" }),
      slot({ ordinal: 1, phase: "done", winner: "tie" }),
      slot({ ordinal: 2, phase: "done", winner: "B" }),
      slot({ ordinal: 3, phase: "done", winner: "B" }),
    ]);
    expect(minigamesWon(m)).toEqual({ a: 1, b: 2 });
  });
});
