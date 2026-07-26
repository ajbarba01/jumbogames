/**
 * Unit tests for the doodle specs: the three colour mixes must actually differ
 * in how much neutral they keep, since that difference is the whole knob, and
 * every authored path must stay jitterable (coordinates only, no arcs).
 */
import { describe, expect, it } from "vitest";
import { DOODLES, strokeFor, type DoodleMix } from "./specs";

const CREAM = "var(--color-s12)";

function creamCount(mix: DoodleMix): number {
  return DOODLES.filter((d, i) => strokeFor(d, i, mix) === CREAM).length;
}

describe("strokeFor", () => {
  it("keeps strictly less neutral as the mix gets louder", () => {
    expect(creamCount("cream")).toBeGreaterThan(creamCount("even"));
    expect(creamCount("even")).toBeGreaterThan(creamCount("accent"));
    expect(creamCount("accent")).toBeGreaterThan(creamCount("teams"));
    expect(creamCount("teams")).toBe(0);
  });

  it("gives every doodle its own hue on the teams mix", () => {
    const used = new Set(DOODLES.map((d, i) => strokeFor(d, i, "teams")));
    expect(used.size).toBe(DOODLES.length);
  });

  it("passes the authored colour through untouched on the cream mix", () => {
    DOODLES.forEach((doodle, i) => {
      expect(strokeFor(doodle, i, "cream")).toBe(doodle.stroke);
    });
  });

  it("only ever returns a theme token", () => {
    for (const mix of ["cream", "even", "accent", "teams"] as const) {
      DOODLES.forEach((doodle, i) => {
        expect(strokeFor(doodle, i, mix)).toMatch(/^var\(--color-[\w-]+\)$/);
      });
    }
  });
});

describe("DOODLES", () => {
  it("uses only commands whose numbers are all coordinates, so jitterPath is safe", () => {
    // jitter.ts displaces every number in the path. An arc (A/a) carries
    // large-arc and sweep flags, which are numbers that are not coordinates.
    for (const doodle of DOODLES) {
      expect(doodle.d).toMatch(/^[MLCSZmlcsz0-9 ,.\-]+$/);
    }
  });

  it("gives every doodle a viewBox matching its declared size", () => {
    for (const doodle of DOODLES) {
      expect(doodle.box).toBe(`0 0 ${doodle.w} ${doodle.h}`);
    }
  });
});
