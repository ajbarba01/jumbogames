/**
 * Coverage for the Word Lock gate demo's timeline: the three beats appear in
 * teaching order, the loop holds the first beat from a cold start, mid-
 * timeline lookups land on the beat that actually owns that stretch of the
 * clock, and the loop wraps back around rather than running out.
 */
import { describe, expect, it } from "vitest";
import { beatAt, DEMO_BEATS } from "./demo-script";

const TOTAL_MS = DEMO_BEATS.reduce((sum, beat) => sum + beat.durationMs, 0);

/**
 * The elapsed-ms midpoint of a named beat, derived from `DEMO_BEATS`' own
 * durations rather than a guessed constant, so the test keeps pinning the
 * right stretch of the clock if a duration is retuned. A midpoint is used in
 * preference to either boundary so the assertion isn't sensitive to
 * inclusive/exclusive edge behavior at a beat's start or end.
 */
function midpointOf(kind: (typeof DEMO_BEATS)[number]["kind"]): number {
  let offset = 0;
  for (const beat of DEMO_BEATS) {
    if (beat.kind === kind) return offset + beat.durationMs / 2;
    offset += beat.durationMs;
  }
  throw new Error(`no beat of kind ${kind}`);
}

describe("demo script", () => {
  it("teaches capture, then the longer-word break, then refresh", () => {
    expect(DEMO_BEATS.map((beat) => beat.kind)).toEqual([
      "capture",
      "break",
      "refresh",
    ]);
  });

  it("holds the first beat from the start", () => {
    expect(beatAt(0).kind).toBe("capture");
  });

  it("resolves a mid-timeline lookup to the break beat", () => {
    expect(beatAt(midpointOf("break")).kind).toBe("break");
  });

  it("resolves a mid-timeline lookup to the refresh beat", () => {
    expect(beatAt(midpointOf("refresh")).kind).toBe("refresh");
  });

  it("loops rather than running out", () => {
    const total = DEMO_BEATS.reduce((sum, beat) => sum + beat.durationMs, 0);
    expect(beatAt(total + 1).kind).toBe("capture");
  });

  it("resolves a mid-timeline lookup after a full loop to the same beat", () => {
    expect(beatAt(TOTAL_MS + midpointOf("break")).kind).toBe("break");
  });
});
