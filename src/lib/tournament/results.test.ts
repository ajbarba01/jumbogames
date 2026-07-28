/**
 * Unit tests for outcome collection: only finished slots with a recorded
 * winner count, byes contribute nothing, and the pairing carries through.
 */
import { describe, it, expect } from "vitest";
import { collectMinigameOutcomes } from "./results";

describe("collectMinigameOutcomes", () => {
  it("turns a done slot into an outcome carrying its pairing and winner", () => {
    expect(
      collectMinigameOutcomes([
        {
          teamAId: "a",
          teamBId: "b",
          slots: [{ phase: "done", winner: "A" }],
        },
      ]),
    ).toEqual([{ teamA: "a", teamB: "b", winner: "A" }]);
  });

  it("keeps every done slot of a multi-slot match", () => {
    const outcomes = collectMinigameOutcomes([
      {
        teamAId: "a",
        teamBId: "b",
        slots: [
          { phase: "done", winner: "A" },
          { phase: "done", winner: "tie" },
        ],
      },
    ]);
    expect(outcomes).toHaveLength(2);
    expect(outcomes[1].winner).toBe("tie");
  });

  // A match still being played must not contribute a phantom result: the
  // board is read live, mid-round, on every broadcast.
  it("ignores slots that have not finished", () => {
    expect(
      collectMinigameOutcomes([
        {
          teamAId: "a",
          teamBId: "b",
          slots: [
            { phase: "playing", winner: null },
            { phase: "scoring", winner: "A" },
            { phase: "upcoming", winner: null },
          ],
        },
      ]),
    ).toEqual([]);
  });

  it("ignores a done slot with no recorded winner", () => {
    expect(
      collectMinigameOutcomes([
        {
          teamAId: "a",
          teamBId: "b",
          slots: [{ phase: "done", winner: null }],
        },
      ]),
    ).toEqual([]);
  });

  // A bye has no opponent, so it produces no minigame outcome at all; its
  // credit reaches standings through collectByeAwards instead.
  it("ignores a bye", () => {
    expect(
      collectMinigameOutcomes([
        {
          teamAId: "a",
          teamBId: null,
          slots: [{ phase: "done", winner: "A" }],
        },
      ]),
    ).toEqual([]);
  });

  it("returns nothing for no matches", () => {
    expect(collectMinigameOutcomes([])).toEqual([]);
  });
});
