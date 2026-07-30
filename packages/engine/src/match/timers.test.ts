/**
 * Tests for the lazy-advance selectors: `pendingAdvance` — given a match and
 * now, which timer event (if any) is due — countdown end, play deadline,
 * scoring end — mirroring the server's advance route and the client's
 * ticker; and `nextTickAt` — when the active slot's game next needs a
 * clock-driven advance, and its clamp to the slot's deadline.
 */
import { describe, expect, it } from "vitest";
import { MINIGAMES } from "../minigames/registry";
import { nextTickAt, pendingAdvance } from "./timers";
import type { MinigameKind, MinigameServer } from "../minigames/types";
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

describe("nextTickAt", () => {
  function withFakeTick(at: number): Record<MinigameKind, MinigameServer> {
    const fake: MinigameServer = {
      ...MINIGAMES.stub,
      nextTickAt: () => at,
    } as MinigameServer;
    return { ...MINIGAMES, stub: fake };
  }

  it("is null for a game that declares no nextTickAt", () => {
    const m = match(slot({ phase: "playing", deadline: 20_000 }));
    expect(nextTickAt(m, MINIGAMES, 10_000)).toBeNull();
  });

  it("is null when the active slot is not playing", () => {
    const games = withFakeTick(15_000);
    const m = match(slot({ phase: "countdown", countdownEndsAt: 20_000 }));
    expect(nextTickAt(m, games, 10_000)).toBeNull();
  });

  it("returns the game's boundary when it falls before the deadline", () => {
    const games = withFakeTick(15_000);
    const m = match(slot({ phase: "playing", deadline: 20_000 }));
    expect(nextTickAt(m, games, 10_000)).toBe(15_000);
  });

  // The clamp that stops the room waking a game's clock after its slot has
  // ended: without `Math.min(at, slot.deadline)` in the implementation, this
  // would return the game's boundary (25_000) instead of the deadline.
  it("clamps to the slot's deadline when the boundary falls after it", () => {
    const games = withFakeTick(25_000);
    const m = match(slot({ phase: "playing", deadline: 20_000 }));
    expect(nextTickAt(m, games, 10_000)).toBe(20_000);
  });
});
