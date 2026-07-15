/**
 * Unit tests for standings computation: minigames won as the primary rank,
 * cumulative normalized score as the tiebreak, bye credit, teams with no
 * results, and movement against a previous ranking.
 */
import { describe, it, expect } from "vitest";
import { computeStandings } from "./standings";

describe("computeStandings", () => {
  it("counts a minigame win for the higher normalized score", () => {
    const rows = computeStandings({
      teams: ["a", "b"],
      outcomes: [{ teamA: "a", teamB: "b", normA: 0.8, normB: 0.5 }],
    });
    expect(rows.map((r) => r.team)).toEqual(["a", "b"]);
    expect(rows[0]).toMatchObject({ team: "a", minigamesWon: 1, rank: 1 });
    expect(rows[1]).toMatchObject({ team: "b", minigamesWon: 0, rank: 2 });
  });

  it("awards no win for a tied minigame but still sums cumulative score", () => {
    const rows = computeStandings({
      teams: ["a", "b"],
      outcomes: [{ teamA: "a", teamB: "b", normA: 0.5, normB: 0.5 }],
    });
    expect(rows.every((r) => r.minigamesWon === 0)).toBe(true);
    expect(rows.find((r) => r.team === "a")?.cumulativeNormalized).toBe(0.5);
    expect(rows.find((r) => r.team === "b")?.cumulativeNormalized).toBe(0.5);
  });

  it("adds bye credit as minigame wins", () => {
    const rows = computeStandings({
      teams: ["a", "b"],
      outcomes: [],
      byes: [{ team: "a", minigames: 2 }],
    });
    expect(rows[0]).toMatchObject({ team: "a", minigamesWon: 2, rank: 1 });
    expect(rows[1]).toMatchObject({ team: "b", minigamesWon: 0, rank: 2 });
  });

  it("breaks equal wins on cumulative normalized score", () => {
    const rows = computeStandings({
      teams: ["a", "b"],
      outcomes: [
        { teamA: "a", teamB: "b", normA: 0.9, normB: 0.1 }, // a wins
        { teamA: "a", teamB: "b", normA: 0.4, normB: 0.6 }, // b wins
      ],
    });
    // Both won 1; a has the higher cumulative normalized score (1.3 vs 0.7).
    expect(rows.map((r) => r.team)).toEqual(["a", "b"]);
    expect(rows[0].minigamesWon).toBe(1);
    expect(rows[1].minigamesWon).toBe(1);
  });

  it("includes teams with no results at the bottom", () => {
    const rows = computeStandings({
      teams: ["a", "b", "c"],
      outcomes: [{ teamA: "a", teamB: "b", normA: 0.7, normB: 0.3 }],
    });
    expect(rows.map((r) => r.team)).toEqual(["a", "b", "c"]);
    expect(rows[2]).toMatchObject({ team: "c", minigamesWon: 0 });
  });

  it("reports movement against the previous ranking", () => {
    const rows = computeStandings({
      teams: ["a", "b"],
      outcomes: [{ teamA: "a", teamB: "b", normA: 0.7, normB: 0.3 }],
      previousRanking: ["b", "a"],
    });
    expect(rows.find((r) => r.team === "a")?.movement).toBe(1); // 2nd -> 1st
    expect(rows.find((r) => r.team === "b")?.movement).toBe(-1); // 1st -> 2nd
  });

  it("orders a full tie deterministically by team id", () => {
    const rows = computeStandings({ teams: ["b", "a"], outcomes: [] });
    expect(rows.map((r) => r.team)).toEqual(["a", "b"]);
    expect(rows.every((r) => r.movement === 0)).toBe(true);
  });
});
