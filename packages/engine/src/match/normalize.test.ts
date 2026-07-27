/**
 * Tests for the normalization placeholder: team score is the mean of the
 * snapshot members' raw scores; absent raws count as zero.
 */
import { describe, expect, it } from "vitest";
import { normalizeTeamScore } from "./normalize";

describe("normalizeTeamScore", () => {
  it("takes the mean over snapshot members", () => {
    expect(normalizeTeamScore({ p1: 10, p2: 20 }, ["p1", "p2"])).toBe(15);
  });

  it("treats missing raws as zero", () => {
    expect(normalizeTeamScore({ p1: 10 }, ["p1", "p2"])).toBe(5);
  });

  it("returns zero for an empty snapshot", () => {
    expect(normalizeTeamScore({}, [])).toBe(0);
  });
});
