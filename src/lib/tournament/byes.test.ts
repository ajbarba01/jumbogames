/**
 * Unit tests for bye bookkeeping: which teams sat out, what that is worth,
 * and whether the viewer is sitting out right now.
 */
import { describe, it, expect } from "vitest";
import { collectByeAwards, findActiveBye, type ByeRound } from "./byes";

describe("collectByeAwards", () => {
  it("returns empty array when no byes", () => {
    const rounds: ByeRound[] = [
      {
        ordinal: 1,
        state: "complete",
        matches: [{ teamAId: "a", teamBId: "b" }],
      },
    ];
    expect(collectByeAwards(rounds, 3)).toEqual([]);
  });

  it("awards a bye in a complete round", () => {
    const rounds: ByeRound[] = [
      {
        ordinal: 1,
        state: "complete",
        matches: [{ teamAId: "a", teamBId: null }],
      },
    ];
    expect(collectByeAwards(rounds, 3)).toEqual([{ team: "a", minigames: 3 }]);
  });

  it("does not award a bye in an active round", () => {
    const rounds: ByeRound[] = [
      {
        ordinal: 1,
        state: "active",
        matches: [{ teamAId: "a", teamBId: null }],
      },
    ];
    expect(collectByeAwards(rounds, 3)).toEqual([]);
  });

  it("does not award a bye in a pending round", () => {
    const rounds: ByeRound[] = [
      {
        ordinal: 1,
        state: "pending",
        matches: [{ teamAId: "a", teamBId: null }],
      },
    ];
    expect(collectByeAwards(rounds, 3)).toEqual([]);
  });

  it("accumulates byes across several complete rounds", () => {
    const rounds: ByeRound[] = [
      {
        ordinal: 1,
        state: "complete",
        matches: [{ teamAId: "a", teamBId: null }],
      },
      {
        ordinal: 2,
        state: "complete",
        matches: [{ teamAId: "b", teamBId: null }],
      },
    ];
    expect(collectByeAwards(rounds, 3)).toEqual([
      { team: "a", minigames: 3 },
      { team: "b", minigames: 3 },
    ]);
  });

  it("credits the correct minigamesPerMatch value", () => {
    const rounds: ByeRound[] = [
      {
        ordinal: 1,
        state: "complete",
        matches: [{ teamAId: "a", teamBId: null }],
      },
    ];
    expect(collectByeAwards(rounds, 5)).toEqual([{ team: "a", minigames: 5 }]);
  });
});

describe("findActiveBye", () => {
  it("returns null for a null teamId", () => {
    const rounds: ByeRound[] = [
      {
        ordinal: 1,
        state: "active",
        matches: [{ teamAId: "a", teamBId: null }],
      },
    ];
    expect(findActiveBye(rounds, null)).toBe(null);
  });

  it("returns the active round's bye team ordinal", () => {
    const rounds: ByeRound[] = [
      {
        ordinal: 2,
        state: "active",
        matches: [{ teamAId: "a", teamBId: null }],
      },
    ];
    expect(findActiveBye(rounds, "a")).toEqual({ ordinal: 2 });
  });

  it("returns null for a team playing a real match in the active round", () => {
    const rounds: ByeRound[] = [
      {
        ordinal: 1,
        state: "active",
        matches: [{ teamAId: "a", teamBId: "b" }],
      },
    ];
    expect(findActiveBye(rounds, "a")).toBe(null);
  });

  it("returns null for a bye in a complete round (already scored)", () => {
    const rounds: ByeRound[] = [
      {
        ordinal: 1,
        state: "complete",
        matches: [{ teamAId: "a", teamBId: null }],
      },
    ];
    expect(findActiveBye(rounds, "a")).toBe(null);
  });

  it("returns null when no active round exists", () => {
    const rounds: ByeRound[] = [
      {
        ordinal: 1,
        state: "pending",
        matches: [{ teamAId: "a", teamBId: null }],
      },
    ];
    expect(findActiveBye(rounds, "a")).toBe(null);
  });
});
