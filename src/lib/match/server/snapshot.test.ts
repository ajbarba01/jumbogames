/**
 * Tests for the pure DB ⇄ MatchState mapping: row snapshots become a MatchState
 * (timestamps to epoch ms, JSON to typed), a MatchView carries viewer/role/
 * labels, and a SlotState renders back to Prisma update data.
 */
import { describe, expect, it } from "vitest";
import {
  rowsToMatchState,
  slotUpdateData,
  toMatchView,
  type MatchRows,
} from "./snapshot";
import { MINIGAMES } from "@/lib/minigames/registry";
import type { MinigameKind, MinigameServer } from "@/lib/minigames/types";
import type { SlotState } from "@/lib/match/types";

const rows: MatchRows = {
  id: "match-1",
  round: { drawnGames: ["stub", "stub"] },
  teamA: { id: "ta", name: "A", colorIndex: 1, memberIds: ["a1", "a2"] },
  teamB: { id: "tb", name: "B", colorIndex: 2, memberIds: ["b1"] },
  slots: [
    {
      ordinal: 0,
      kind: "stub",
      phase: "countdown",
      ready: ["a1", "a2", "b1"],
      snapshot: { teamA: ["a1", "a2"], teamB: ["b1"] },
      countdownEndsAt: new Date(3000),
      deadline: null,
      scoringEndsAt: null,
      payload: { counts: { a1: 0, a2: 0, b1: 0 } },
      normA: null,
      normB: null,
      winner: null,
    },
    {
      ordinal: 1,
      kind: "stub",
      phase: "upcoming",
      ready: [],
      snapshot: null,
      countdownEndsAt: null,
      deadline: null,
      scoringEndsAt: null,
      payload: null,
      normA: null,
      normB: null,
      winner: null,
    },
  ],
};

describe("rowsToMatchState", () => {
  it("maps rows into a MatchState with epoch-ms timestamps and current members", () => {
    const state = rowsToMatchState(rows);
    expect(state.matchId).toBe("match-1");
    expect(state.seed).toBe("match-1");
    expect(state.teamA.members).toEqual(["a1", "a2"]);
    expect(state.teamB.members).toEqual(["b1"]);
    expect(state.slots).toHaveLength(2);
    expect(state.slots[0]!.phase).toBe("countdown");
    expect(state.slots[0]!.countdownEndsAt).toBe(3000);
    expect(state.slots[0]!.snapshot).toEqual({
      teamA: ["a1", "a2"],
      teamB: ["b1"],
    });
    expect(state.slots[0]!.payload).toEqual({
      counts: { a1: 0, a2: 0, b1: 0 },
    });
    expect(state.slots[1]!.phase).toBe("upcoming");
    expect(state.slots[1]!.countdownEndsAt).toBeNull();
    expect(state.slots[1]!.deadline).toBeNull();
    expect(state.slots[1]!.scoringEndsAt).toBeNull();
    expect(state.slots[1]!.snapshot).toBeNull();
    expect(state.slots[1]!.payload).toBeNull();
  });

  it("orders slots by ordinal regardless of row order", () => {
    const shuffled = { ...rows, slots: [rows.slots[1]!, rows.slots[0]!] };
    const state = rowsToMatchState(shuffled);
    expect(state.slots.map((s) => s.ordinal)).toEqual([0, 1]);
  });

  it("throws for a bye match (no team B)", () => {
    expect(() => rowsToMatchState({ ...rows, teamB: null })).toThrow(/bye/i);
  });
});

describe("toMatchView", () => {
  it("marks a member as a player with their own id", () => {
    const state = rowsToMatchState(rows);
    const view = toMatchView(state, {
      viewerId: "a1",
      role: "player",
      labels: { a1: "a1@x" },
    });
    expect(view.viewerId).toBe("a1");
    expect(view.role).toBe("player");
    expect(view.playerLabels).toEqual({ a1: "a1@x" });
  });

  it("gives a spectator a null viewer id", () => {
    const state = rowsToMatchState(rows);
    const view = toMatchView(state, {
      viewerId: null,
      role: "spectator",
      labels: {},
    });
    expect(view.viewerId).toBeNull();
    expect(view.role).toBe("spectator");
  });

  it("redacts slot payloads per viewer when the game defines redact", () => {
    const games: Record<MinigameKind, MinigameServer> = {
      ...MINIGAMES,
      stub: {
        ...MINIGAMES.stub,
        redact: (_state, viewerId) => ({ redactedFor: viewerId }),
      } as MinigameServer,
    };
    const state = rowsToMatchState(rows);
    const view = toMatchView(state, {
      viewerId: "a1",
      role: "player",
      labels: {},
      games,
    });
    expect(view.match.slots[0]!.payload).toEqual({ redactedFor: "a1" });
    // Slot 1 has no payload — redaction must not conjure one.
    expect(view.match.slots[1]!.payload).toBeNull();
  });

  it("ships payload as-is when the game defines no redact", () => {
    const state = rowsToMatchState(rows);
    const view = toMatchView(state, {
      viewerId: "a1",
      role: "player",
      labels: {},
    });
    expect(view.match.slots[0]!.payload).toEqual({
      counts: { a1: 0, a2: 0, b1: 0 },
    });
  });
});

describe("slotUpdateData", () => {
  it("renders a SlotState back to Prisma data (epoch ms to Date)", () => {
    const slot: SlotState = {
      ordinal: 0,
      kind: "stub",
      phase: "scoring",
      ready: ["a1"],
      snapshot: { teamA: ["a1"], teamB: ["b1"] },
      countdownEndsAt: 3000,
      deadline: 13000,
      scoringEndsAt: 18000,
      payload: { counts: { a1: 5 } },
      normA: 5,
      normB: 0,
      winner: "A",
    };
    const data = slotUpdateData(slot);
    expect(data.phase).toBe("scoring");
    expect(data.countdownEndsAt).toEqual(new Date(3000));
    expect(data.deadline).toEqual(new Date(13000));
    expect(data.scoringEndsAt).toEqual(new Date(18000));
    expect(data.winner).toBe("A");
    expect(data.snapshot).toEqual({ teamA: ["a1"], teamB: ["b1"] });
    expect(data.payload).toEqual({ counts: { a1: 5 } });
  });

  it("passes null timestamps and winner through as null", () => {
    const slot: SlotState = {
      ordinal: 1,
      kind: "stub",
      phase: "upcoming",
      ready: [],
      snapshot: null,
      countdownEndsAt: null,
      deadline: null,
      scoringEndsAt: null,
      payload: null,
      normA: null,
      normB: null,
      winner: null,
    };
    const data = slotUpdateData(slot);
    expect(data.deadline).toBeNull();
    expect(data.winner).toBeNull();
    expect(data.snapshot).toBeNull();
  });
});
