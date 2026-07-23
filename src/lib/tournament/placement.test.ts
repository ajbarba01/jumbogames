/**
 * Unit tests for viewer placement: resolving which live match a viewer belongs
 * to based on their team membership.
 */
import { describe, it, expect } from "vitest";
import {
  resolveViewerMatchId,
  resolvePlacement,
  type PlacementMatch,
} from "./placement";

describe("resolveViewerMatchId", () => {
  it("resolves null for a null teamId", () => {
    const matches: PlacementMatch[] = [
      { id: "m1", teamAId: "a", teamBId: "b", live: true },
    ];
    expect(resolveViewerMatchId(matches, null)).toBe(null);
  });

  it("resolves a live match id for a member of a live match", () => {
    const matches: PlacementMatch[] = [
      { id: "m1", teamAId: "a", teamBId: "b", live: true },
    ];
    expect(resolveViewerMatchId(matches, "a")).toBe("m1");
  });

  it("resolves null when the viewer's only match is not live", () => {
    const matches: PlacementMatch[] = [
      { id: "m1", teamAId: "a", teamBId: "b", live: false },
    ];
    expect(resolveViewerMatchId(matches, "a")).toBe(null);
  });

  it("never resolves a bye (teamBId: null) even for its own teamAId when not live", () => {
    const matches: PlacementMatch[] = [
      { id: "m1", teamAId: "a", teamBId: null, live: false },
    ];
    expect(resolveViewerMatchId(matches, "a")).toBe(null);
  });

  it("resolves teamB membership", () => {
    const matches: PlacementMatch[] = [
      { id: "m1", teamAId: "a", teamBId: "b", live: true },
    ];
    expect(resolveViewerMatchId(matches, "b")).toBe("m1");
  });

  it("resolves the first live match when several match", () => {
    const matches: PlacementMatch[] = [
      { id: "m1", teamAId: "a", teamBId: "b", live: true },
      { id: "m2", teamAId: "a", teamBId: "c", live: true },
    ];
    expect(resolveViewerMatchId(matches, "a")).toBe("m1");
  });
});

describe("resolvePlacement", () => {
  it("resolves to the live match when the viewer has one", () => {
    expect(resolvePlacement("m1", null)).toEqual({
      kind: "match",
      matchId: "m1",
    });
  });

  it("resolves to the match even when the viewer also has a bye on record (defers to the live match)", () => {
    expect(resolvePlacement("m1", { ordinal: 1, minigames: 3 })).toEqual({
      kind: "match",
      matchId: "m1",
    });
  });

  it("resolves to the board when the viewer has no live match but has an active bye", () => {
    expect(resolvePlacement(null, { ordinal: 1, minigames: 3 })).toEqual({
      kind: "board",
    });
  });

  // Regression: settleRoundCompletion broadcasts on the same channel a round
  // start does. At the instant a round completes, every viewer's live match
  // is null and their bye (if any) is no longer active — without this case,
  // they were all wiped to the board before ever seeing their end screen.
  it("resolves to stay when there is no live match and no active bye", () => {
    expect(resolvePlacement(null, null)).toEqual({ kind: "stay" });
  });

  // Regression: a spectator watching a match they aren't rostered on has no
  // live match of their own and, having no team at all, no bye either — a
  // round-active flag would have wrongly sent them to the board.
  it("resolves to stay for a viewer with no match and no bye even while a round is active", () => {
    expect(resolvePlacement(null, null)).toEqual({ kind: "stay" });
  });
});
