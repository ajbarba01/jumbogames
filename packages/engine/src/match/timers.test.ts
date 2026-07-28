/**
 * Tests for the lazy-advance selector: given a match and now, which timer event
 * (if any) is due — countdown end, play deadline, scoring end — mirroring the
 * server's advance route and the client's ticker.
 */
import { describe, expect, it } from "vitest";
import { pendingAdvance } from "./timers";
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

function match(s: SlotState): MatchState {
  return {
    matchId: "m",
    seed: "m",
    teamA: { id: "ta", name: "A", colorIndex: 1, members: ["a1"] },
    teamB: { id: "tb", name: "B", colorIndex: 2, members: ["b1"] },
    slots: [s],
  };
}

describe("pendingAdvance", () => {
  it("is null at a gate", () => {
    expect(pendingAdvance(match(slot({ phase: "gate" })), 10_000)).toBeNull();
  });

  it("returns countdownElapsed once the countdown time has passed", () => {
    const m = match(slot({ phase: "countdown", countdownEndsAt: 3000 }));
    expect(pendingAdvance(m, 2999)).toBeNull();
    expect(pendingAdvance(m, 3000)).toEqual({
      event: { type: "countdownElapsed", ordinal: 0 },
    });
  });

  it("returns finalize once the play deadline has passed", () => {
    const m = match(
      slot({
        phase: "playing",
        deadline: 13000,
        snapshot: { teamA: ["a1"], teamB: ["b1"] },
      }),
    );
    expect(pendingAdvance(m, 12_999)).toBeNull();
    expect(pendingAdvance(m, 13_000)).toEqual({
      event: { type: "finalize", ordinal: 0 },
    });
  });

  it("returns scoringElapsed once the scoring time has passed", () => {
    const m = match(slot({ phase: "scoring", scoringEndsAt: 18000 }));
    expect(pendingAdvance(m, 17_999)).toBeNull();
    expect(pendingAdvance(m, 18_000)).toEqual({
      event: { type: "scoringElapsed", ordinal: 0 },
    });
  });

  it("is null when the match is complete", () => {
    expect(pendingAdvance(match(slot({ phase: "done" })), 99_999)).toBeNull();
  });
});
