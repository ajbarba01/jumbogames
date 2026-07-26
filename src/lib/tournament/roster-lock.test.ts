/**
 * Tests for the roster lock predicate: a team is closed to join, leave and
 * kick exactly while it has a live match.
 */
import { describe, expect, it } from "vitest";
import { isTeamLocked } from "./roster-lock";
import type { PlacementMatch } from "./placement";

const MATCHES: PlacementMatch[] = [
  { id: "m1", teamAId: "alpha", teamBId: "bravo", live: true },
  { id: "m2", teamAId: "charlie", teamBId: "delta", live: false },
  { id: "m3", teamAId: "echo", teamBId: null, live: false },
];

describe("isTeamLocked", () => {
  it("locks a team playing a live match, on either side", () => {
    expect(isTeamLocked(MATCHES, "alpha")).toBe(true);
    expect(isTeamLocked(MATCHES, "bravo")).toBe(true);
  });

  it("leaves a team open between rounds", () => {
    expect(isTeamLocked(MATCHES, "charlie")).toBe(false);
    expect(isTeamLocked(MATCHES, "delta")).toBe(false);
  });

  it("leaves a team on a bye open — a bye is not a live match", () => {
    expect(isTeamLocked(MATCHES, "echo")).toBe(false);
  });

  it("leaves a team with no scheduled match open", () => {
    expect(isTeamLocked(MATCHES, "foxtrot")).toBe(false);
    expect(isTeamLocked([], "alpha")).toBe(false);
  });
});
