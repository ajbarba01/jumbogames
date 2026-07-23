/**
 * Tests for the pure match lifecycle reducer: gates, roster changes,
 * snapshots at countdown, deadline enforcement, scoring, slot advancement.
 */
import { describe, expect, it } from "vitest";
import { MINIGAMES } from "@/lib/minigames/registry";
import { applyMatchEvent, createMatch, type MatchDeps } from "./lifecycle";
import { derivePhase } from "./derive";
import type { MinigameKind, MinigameServer } from "@/lib/minigames/types";
import type { MatchState } from "./types";

const T0 = 1_000_000;
const deps = (now: number): MatchDeps => ({ now, games: MINIGAMES });

function fresh(kinds: MinigameKind[] = ["stub"]): MatchState {
  return createMatch({
    matchId: "m1",
    seed: "seed",
    teamA: { id: "ta", name: "A", colorIndex: 1, members: ["a1", "a2"] },
    teamB: { id: "tb", name: "B", colorIndex: 2, members: ["b1"] },
    kinds,
  });
}

function readyAll(state: MatchState, now: number): MatchState {
  for (const id of ["a1", "a2", "b1"]) {
    state = applyMatchEvent(
      state,
      { type: "playerReady", ordinal: 0, playerId: id },
      deps(now),
    );
  }
  return state;
}

describe("createMatch", () => {
  it("opens slot 0 at the gate and locks the rest", () => {
    const m = fresh(["stub", "stub"]);
    expect(m.slots[0]!.phase).toBe("gate");
    expect(m.slots[1]!.phase).toBe("upcoming");
  });
});

describe("gate", () => {
  it("starts the countdown and snapshots the roster once all are ready", () => {
    const m = readyAll(fresh(), T0);
    const slot = m.slots[0]!;
    expect(slot.phase).toBe("countdown");
    expect(slot.snapshot).toEqual({ teamA: ["a1", "a2"], teamB: ["b1"] });
    expect(slot.countdownEndsAt).toBe(T0 + 3000);
    expect(slot.payload).toEqual({ counts: { a1: 0, a2: 0, b1: 0 } });
  });

  it("ignores ready from non-members and duplicates", () => {
    let m = fresh();
    m = applyMatchEvent(
      m,
      { type: "playerReady", ordinal: 0, playerId: "ghost" },
      deps(T0),
    );
    expect(m.slots[0]!.ready).toEqual([]);
    m = applyMatchEvent(
      m,
      { type: "playerReady", ordinal: 0, playerId: "a1" },
      deps(T0),
    );
    const again = applyMatchEvent(
      m,
      { type: "playerReady", ordinal: 0, playerId: "a1" },
      deps(T0),
    );
    expect(again).toBe(m);
  });

  it("prunes ready and re-evaluates when the roster changes (kick unblocks)", () => {
    let m = fresh();
    m = applyMatchEvent(
      m,
      { type: "playerReady", ordinal: 0, playerId: "a1" },
      deps(T0),
    );
    m = applyMatchEvent(
      m,
      { type: "playerReady", ordinal: 0, playerId: "b1" },
      deps(T0),
    );
    // a2 never readies; kicking a2 satisfies the gate
    m = applyMatchEvent(
      m,
      { type: "rosterChanged", teamA: ["a1"], teamB: ["b1"] },
      deps(T0),
    );
    expect(m.slots[0]!.phase).toBe("countdown");
    expect(m.slots[0]!.snapshot).toEqual({ teamA: ["a1"], teamB: ["b1"] });
  });

  it("force-start skips unready players", () => {
    let m = fresh();
    m = applyMatchEvent(m, { type: "hostForceStart", ordinal: 0 }, deps(T0));
    expect(m.slots[0]!.phase).toBe("countdown");
  });
});

describe("countdown and play", () => {
  function playing(): { m: MatchState; now: number } {
    let m = readyAll(fresh(), T0);
    const now = T0 + 3000;
    m = applyMatchEvent(m, { type: "countdownElapsed", ordinal: 0 }, deps(now));
    return { m, now };
  }

  it("countdownElapsed before its time is a no-op", () => {
    const m = readyAll(fresh(), T0);
    expect(
      applyMatchEvent(m, { type: "countdownElapsed", ordinal: 0 }, deps(T0)),
    ).toBe(m);
  });

  it("moves to playing with the game's deadline", () => {
    const { m, now } = playing();
    expect(m.slots[0]!.phase).toBe("playing");
    expect(m.slots[0]!.deadline).toBe(now + 10_000);
  });

  it("applies snapshot members' actions and ignores others", () => {
    const { m, now } = playing();
    const acted = applyMatchEvent(
      m,
      {
        type: "gameAction",
        ordinal: 0,
        playerId: "a1",
        action: { type: "mash" },
      },
      deps(now + 100),
    );
    expect(acted.slots[0]!.payload).toEqual({
      counts: { a1: 1, a2: 0, b1: 0 },
    });
    const ghost = applyMatchEvent(
      acted,
      {
        type: "gameAction",
        ordinal: 0,
        playerId: "zz",
        action: { type: "mash" },
      },
      deps(now + 100),
    );
    expect(ghost).toBe(acted);
  });

  it("rejects actions at or past the deadline", () => {
    const { m, now } = playing();
    expect(
      applyMatchEvent(
        m,
        {
          type: "gameAction",
          ordinal: 0,
          playerId: "a1",
          action: { type: "mash" },
        },
        deps(now + 10_000),
      ),
    ).toBe(m);
  });

  it("roster changes mid-play do not touch the snapshot", () => {
    const { m, now } = playing();
    const changed = applyMatchEvent(
      m,
      { type: "rosterChanged", teamA: ["a1"], teamB: ["b1", "late"] },
      deps(now + 100),
    );
    expect(changed.teamB.members).toEqual(["b1", "late"]);
    expect(changed.slots[0]!.snapshot).toEqual({
      teamA: ["a1", "a2"],
      teamB: ["b1"],
    });
  });
});

describe("finalize and advancement", () => {
  function scored(kinds: MinigameKind[] = ["stub"]): {
    m: MatchState;
    now: number;
  } {
    let m = createMatch({
      matchId: "m1",
      seed: "seed",
      teamA: { id: "ta", name: "A", colorIndex: 1, members: ["a1", "a2"] },
      teamB: { id: "tb", name: "B", colorIndex: 2, members: ["b1"] },
      kinds,
    });
    m = readyAll(m, T0);
    let now = T0 + 3000;
    m = applyMatchEvent(m, { type: "countdownElapsed", ordinal: 0 }, deps(now));
    // a1 mashes twice, b1 mashes three times → A mean 1, B mean 3
    for (let i = 0; i < 2; i++)
      m = applyMatchEvent(
        m,
        {
          type: "gameAction",
          ordinal: 0,
          playerId: "a1",
          action: { type: "mash" },
        },
        deps(now + 1),
      );
    for (let i = 0; i < 3; i++)
      m = applyMatchEvent(
        m,
        {
          type: "gameAction",
          ordinal: 0,
          playerId: "b1",
          action: { type: "mash" },
        },
        deps(now + 1),
      );
    now += 10_000;
    m = applyMatchEvent(m, { type: "finalize", ordinal: 0 }, deps(now));
    return { m, now };
  }

  it("finalize before the deadline is a no-op for a timer-only game", () => {
    let m = readyAll(fresh(), T0);
    m = applyMatchEvent(
      m,
      { type: "countdownElapsed", ordinal: 0 },
      deps(T0 + 3000),
    );
    expect(
      applyMatchEvent(m, { type: "finalize", ordinal: 0 }, deps(T0 + 4000)),
    ).toBe(m);
  });

  it("scores normalized means and picks the winner", () => {
    const { m, now } = scored();
    const slot = m.slots[0]!;
    expect(slot.phase).toBe("scoring");
    expect(slot.normA).toBe(1);
    expect(slot.normB).toBe(3);
    expect(slot.winner).toBe("B");
    expect(slot.scoringEndsAt).toBe(now + 5000);
  });

  it("duplicate finalize is a no-op", () => {
    const { m, now } = scored();
    expect(
      applyMatchEvent(m, { type: "finalize", ordinal: 0 }, deps(now)),
    ).toBe(m);
  });

  it("scoringElapsed opens the next gate, or completes the match", () => {
    const two = scored(["stub", "stub"]);
    const advanced = applyMatchEvent(
      two.m,
      { type: "scoringElapsed", ordinal: 0 },
      deps(two.now + 5000),
    );
    expect(advanced.slots[0]!.phase).toBe("done");
    expect(advanced.slots[1]!.phase).toBe("gate");

    const one = scored(["stub"]);
    const finished = applyMatchEvent(
      one.m,
      { type: "scoringElapsed", ordinal: 0 },
      deps(one.now + 5000),
    );
    expect(derivePhase(finished).kind).toBe("complete");
  });
});

// Contract hooks added for content games (trivia onward): server-stamped now
// in apply, an outcome override at finalize, and init context from the deps.
describe("contract hooks", () => {
  function withFake(
    overrides: Partial<MinigameServer>,
  ): Record<MinigameKind, MinigameServer> {
    const fake: MinigameServer = {
      ...MINIGAMES.stub,
      ...overrides,
    } as MinigameServer;
    return { ...MINIGAMES, stub: fake };
  }

  function playingWith(
    games: Record<MinigameKind, MinigameServer>,
    initContext?: MatchDeps["initContext"],
  ): { m: MatchState; now: number } {
    let m = readyAllWith(fresh(), T0, games, initContext);
    const now = T0 + 3000;
    m = applyMatchEvent(
      m,
      { type: "countdownElapsed", ordinal: 0 },
      { now, games, initContext },
    );
    return { m, now };
  }

  function readyAllWith(
    state: MatchState,
    now: number,
    games: Record<MinigameKind, MinigameServer>,
    initContext?: MatchDeps["initContext"],
  ): MatchState {
    for (const id of ["a1", "a2", "b1"]) {
      state = applyMatchEvent(
        state,
        { type: "playerReady", ordinal: 0, playerId: id },
        { now, games, initContext },
      );
    }
    return state;
  }

  it("passes now to the game's apply on gameAction", () => {
    const games = withFake({
      init: () => ({ sawNow: 0 }),
      apply: (_s, _p, _a, now) => ({ sawNow: now }),
    });
    const { m, now } = playingWith(games);
    const acted = applyMatchEvent(
      m,
      { type: "gameAction", ordinal: 0, playerId: "a1", action: {} },
      { now: now + 123, games },
    );
    expect(acted.slots[0]!.payload).toEqual({ sawNow: now + 123 });
  });

  it("lets a game's outcome override the normalized-mean winner", () => {
    const games = withFake({
      init: () => ({}),
      scores: () => ({ a1: 5, a2: 5, b1: 1 }), // A has the higher mean
      outcome: () => "B",
    });
    const { m, now } = playingWith(games);
    const done = applyMatchEvent(
      m,
      { type: "finalize", ordinal: 0 },
      { now: now + 10_000, games },
    );
    expect(done.slots[0]!.winner).toBe("B");
    expect(done.slots[0]!.normA).toBe(5);
    expect(done.slots[0]!.normB).toBe(1);
  });

  it("falls back to means when outcome returns null", () => {
    const games = withFake({
      init: () => ({}),
      scores: () => ({ a1: 5, a2: 5, b1: 1 }),
      outcome: () => null,
    });
    const { m, now } = playingWith(games);
    const done = applyMatchEvent(
      m,
      { type: "finalize", ordinal: 0 },
      { now: now + 10_000, games },
    );
    expect(done.slots[0]!.winner).toBe("A");
  });

  it("passes initContext[kind] to init at countdown start", () => {
    const games = withFake({
      init: (_snapshot, _seed, context) => ({ sawContext: context }),
    });
    const m = readyAllWith(fresh(), T0, games, { stub: ["ctx"] });
    expect(m.slots[0]!.payload).toEqual({ sawContext: ["ctx"] });
  });
});
