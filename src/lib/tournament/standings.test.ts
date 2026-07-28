/**
 * Unit tests for standings computation: minigames won as the only rank key,
 * the recorded slot winner taken as authoritative (never re-derived), bye
 * credit, shared ranks for tied teams, teams with no results, and movement
 * against a previous ranking.
 */
import { describe, it, expect } from "vitest";
import { computeStandings } from "./standings";

describe("computeStandings", () => {
  it("counts a minigame win for the recorded winner", () => {
    const rows = computeStandings({
      teams: ["a", "b"],
      outcomes: [{ teamA: "a", teamB: "b", winner: "A" }],
    });
    expect(rows.map((r) => r.team)).toEqual(["a", "b"]);
    expect(rows[0]).toMatchObject({ team: "a", minigamesWon: 1, rank: 1 });
    expect(rows[1]).toMatchObject({ team: "b", minigamesWon: 0, rank: 2 });
  });

  // The regression this whole rewrite exists for: a Tug O' Lore rope pin can
  // award a slot to the team with the lower normalized mean, so standings must
  // take the engine's recorded verdict and never recompute one.
  it("respects a winner that a game declared against the run of play", () => {
    const rows = computeStandings({
      teams: ["a", "b"],
      outcomes: [{ teamA: "a", teamB: "b", winner: "B" }],
    });
    expect(rows[0]).toMatchObject({ team: "b", minigamesWon: 1, rank: 1 });
  });

  it("awards no win for a tied minigame", () => {
    const rows = computeStandings({
      teams: ["a", "b"],
      outcomes: [{ teamA: "a", teamB: "b", winner: "tie" }],
    });
    expect(rows.every((r) => r.minigamesWon === 0)).toBe(true);
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

  it("gives teams level on wins a shared rank and marks them tied", () => {
    const rows = computeStandings({
      teams: ["a", "b", "c"],
      outcomes: [
        { teamA: "a", teamB: "b", winner: "A" },
        { teamA: "b", teamB: "c", winner: "A" },
      ],
    });
    // a and b each won one; c won none.
    expect(rows.map((r) => r.rank)).toEqual([1, 1, 3]);
    expect(rows.map((r) => r.tied)).toEqual([true, true, false]);
  });

  it("skips the ranks a tied group consumed", () => {
    const rows = computeStandings({
      teams: ["a", "b", "c", "d"],
      outcomes: [{ teamA: "a", teamB: "d", winner: "A" }],
    });
    // a won one; b, c and d are all on zero and share rank 2.
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 2, 2]);
  });

  it("keeps caller order among level teams, unmarked at zero wins", () => {
    const rows = computeStandings({ teams: ["b", "a"], outcomes: [] });
    // Callers pass teams in creation order, which is what the lobby shows;
    // sorting must not reorder a shared rank behind their backs. A shared 0
    // is the starting state, not a contested result, so it is not marked.
    expect(rows.map((r) => r.team)).toEqual(["b", "a"]);
    expect(rows.every((r) => r.tied)).toBe(false);
  });

  it("does not mark a shared rank when nobody on it has won anything", () => {
    const rows = computeStandings({
      teams: ["a", "b", "c"],
      outcomes: [{ teamA: "a", teamB: "d", winner: "A" }],
      byes: [{ team: "a", minigames: 1 }],
    });
    // a has wins; b and c share rank 2 at zero wins each and are not tied.
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 2]);
    expect(rows.map((r) => r.tied)).toEqual([false, false, false]);
  });

  it("includes teams with no results at the bottom", () => {
    const rows = computeStandings({
      teams: ["a", "b", "c"],
      outcomes: [{ teamA: "a", teamB: "b", winner: "A" }],
    });
    expect(rows[0]).toMatchObject({ team: "a", minigamesWon: 1, rank: 1 });
    expect(rows[2]).toMatchObject({ team: "c", minigamesWon: 0 });
  });

  it("reports movement against the previous ranking", () => {
    const rows = computeStandings({
      teams: ["a", "b"],
      outcomes: [{ teamA: "a", teamB: "b", winner: "A" }],
      previousRanking: ["b", "a"],
    });
    expect(rows.find((r) => r.team === "a")?.movement).toBe(1); // 2nd -> 1st
    expect(rows.find((r) => r.team === "b")?.movement).toBe(-1); // 1st -> 2nd
  });
});
