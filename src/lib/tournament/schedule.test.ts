/**
 * Unit tests for round-robin schedule generation: round count, the
 * everyone-plays-everyone-once property, one-bye-per-round for odd fields,
 * completion, and determinism under a seed.
 */
import { describe, it, expect } from "vitest";
import {
  buildSchedule,
  roundCountFor,
  isComplete,
  type ScheduledRound,
} from "./schedule";

function pairKey(a: string, b: string): string {
  return [a, b].sort().join("|");
}

function realPairings(rounds: ScheduledRound[]): string[] {
  return rounds
    .flatMap((round) => round.matches)
    .filter((match) => match.teamB !== null)
    .map((match) => pairKey(match.teamA, match.teamB as string));
}

describe("roundCountFor", () => {
  it("is N-1 for an even field", () => {
    expect(roundCountFor(4)).toBe(3);
    expect(roundCountFor(6)).toBe(5);
  });

  it("is N for an odd field (one bye per round)", () => {
    expect(roundCountFor(3)).toBe(3);
    expect(roundCountFor(5)).toBe(5);
  });

  it("is 1 for two teams and 0 below that", () => {
    expect(roundCountFor(2)).toBe(1);
    expect(roundCountFor(1)).toBe(0);
    expect(roundCountFor(0)).toBe(0);
  });
});

describe("buildSchedule", () => {
  const four = ["a", "b", "c", "d"];

  it("pairs every team with every other exactly once (even field)", () => {
    const pairs = realPairings(buildSchedule(four, 1));
    expect(pairs).toHaveLength(6); // C(4,2)
    expect(new Set(pairs).size).toBe(6);
  });

  it("runs N-1 rounds of N/2 matches with no byes (even field)", () => {
    const rounds = buildSchedule(four, 1);
    expect(rounds).toHaveLength(3);
    for (const round of rounds) {
      expect(round.matches).toHaveLength(2);
      for (const match of round.matches) {
        expect(match.teamB).not.toBeNull();
      }
    }
  });

  it("numbers rounds from 1", () => {
    expect(buildSchedule(four, 1).map((r) => r.ordinal)).toEqual([1, 2, 3]);
  });

  it("gives each team exactly one bye and every pair once (odd field)", () => {
    const rounds = buildSchedule(["a", "b", "c"], 1);
    expect(rounds).toHaveLength(3);

    const byes = rounds
      .flatMap((r) => r.matches)
      .filter((m) => m.teamB === null)
      .map((m) => m.teamA)
      .sort();
    expect(byes).toEqual(["a", "b", "c"]);

    const pairs = realPairings(rounds);
    expect(pairs).toHaveLength(3); // C(3,2)
    expect(new Set(pairs).size).toBe(3);
  });

  it("never pairs a team with itself or twice within a round", () => {
    const rounds = buildSchedule(["a", "b", "c", "d", "e"], 7);
    for (const round of rounds) {
      const seen = new Set<string>();
      for (const match of round.matches) {
        expect(match.teamA).not.toBe(match.teamB);
        expect(seen.has(match.teamA)).toBe(false);
        seen.add(match.teamA);
        if (match.teamB !== null) {
          expect(seen.has(match.teamB)).toBe(false);
          seen.add(match.teamB);
        }
      }
    }
  });

  it("handles two teams as a single match", () => {
    const rounds = buildSchedule(["a", "b"], 1);
    expect(rounds).toHaveLength(1);
    expect(rounds[0].matches).toHaveLength(1);
    const m = rounds[0].matches[0];
    expect(pairKey(m.teamA, m.teamB as string)).toBe(pairKey("a", "b"));
  });

  it("returns no rounds for fewer than two teams", () => {
    expect(buildSchedule(["a"], 1)).toEqual([]);
    expect(buildSchedule([], 1)).toEqual([]);
  });

  it("is deterministic for a given seed", () => {
    const teams = ["a", "b", "c", "d", "e"];
    expect(buildSchedule(teams, 42)).toEqual(buildSchedule(teams, 42));
  });
});

describe("isComplete", () => {
  it("is true once completed rounds reach the round count", () => {
    expect(isComplete(3, 4)).toBe(true);
    expect(isComplete(4, 4)).toBe(true);
    expect(isComplete(3, 3)).toBe(true);
  });

  it("is false before the final round", () => {
    expect(isComplete(2, 4)).toBe(false);
    expect(isComplete(0, 3)).toBe(false);
  });

  it("is false for a field too small to run", () => {
    expect(isComplete(0, 1)).toBe(false);
  });
});
