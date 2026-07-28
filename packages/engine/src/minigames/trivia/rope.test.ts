/**
 * Tests for the rope's force integration. The rope's contract is that position
 * is the exact time-integral of the tier gap — so these cover integration
 * across a demotion boundary, where a naive implementation that sampled the
 * endpoint tier instead of each segment's would silently overpay one side.
 */
import { describe, expect, it } from "vitest";
import { advanceRope, INITIAL_ROPE, pinnedSide, ropeK } from "./rope";
import type { TierState } from "./tiers";
import { MIN_TIER, ROPE_DIVISOR, TIER_SECONDS } from "./tuning";

const held = (tier: number): TierState => ({
  tier,
  enteredAt: null,
  charge: 0,
});

/** Both teams as `init` seats them: tier 1, timer unstarted. */
const UNSTARTED: TierState = { tier: 1, enteredAt: null, charge: 0 };

describe("ropeK", () => {
  it("scales as the square root of mean team size", () => {
    expect(ropeK(10, 10)).toBeCloseTo(Math.sqrt(10) / ROPE_DIVISOR, 12);
    expect(ropeK(4, 4)).toBeCloseTo(2 / ROPE_DIVISOR, 12);
  });

  it("uses the mean when the teams differ in size", () => {
    expect(ropeK(2, 8)).toBeCloseTo(Math.sqrt(5) / ROPE_DIVISOR, 12);
  });

  it("never divides by a zero-size roster", () => {
    expect(ropeK(0, 0)).toBeGreaterThan(0);
  });
});

describe("advanceRope", () => {
  const k = ropeK(10, 10);

  it("does not move when the tiers are level", () => {
    const out = advanceRope(INITIAL_ROPE, held(3), held(3), 60_000, k);
    expect(out.p).toBeCloseTo(0, 12);
    expect(out.at).toBe(60_000);
  });

  it("moves toward A at k * gap per second", () => {
    const out = advanceRope(INITIAL_ROPE, held(4), held(2), 10_000, k);
    expect(out.p).toBeCloseTo(k * 2 * 10, 12);
  });

  it("moves toward B when B out-tiers A", () => {
    const out = advanceRope(INITIAL_ROPE, held(1), held(3), 10_000, k);
    expect(out.p).toBeCloseTo(-k * 2 * 10, 12);
  });

  it("is identity when now is not ahead of the last integration", () => {
    const rope = { p: 0.3, at: 5000 };
    expect(advanceRope(rope, held(5), held(MIN_TIER), 5000, k)).toEqual(rope);
  });

  it("integrates each segment at its own tier across a demotion", () => {
    // A enters tier 3 at 0 and demotes to 2 at TIER_SECONDS[3]. Over a window
    // that straddles the boundary the gap is 3 then 2, not 3 or 2 throughout.
    //
    // Deliberately the 1v1 k, not this block's ten-a-side one: a gap of three
    // against the floor for a full tier-3 duration pins long before the
    // boundary at k(10,10), and a latched rope proves nothing about how the
    // segments were summed. The gentler k keeps the whole window inside the
    // walls so the arithmetic itself is what is under test.
    const k1 = ropeK(1, 1);
    const boundary = TIER_SECONDS[3]! * 1000;
    const a: TierState = { tier: 3, enteredAt: 0, charge: 0 };
    const out = advanceRope(
      INITIAL_ROPE,
      a,
      held(MIN_TIER),
      boundary + 5000,
      k1,
    );
    // Against a floored opponent the gap is (3 - MIN_TIER) then (2 - MIN_TIER).
    const expected =
      k1 * ((3 - MIN_TIER) * (boundary / 1000) + (2 - MIN_TIER) * 5);
    expect(out.p).toBeLessThan(1);
    expect(out.p).toBeCloseTo(expected, 10);
  });

  it("latches at the wall rather than overshooting", () => {
    const out = advanceRope(
      INITIAL_ROPE,
      held(5),
      held(MIN_TIER),
      10_000_000,
      k,
    );
    expect(out.p).toBe(1);
  });

  it("stays pinned once it has reached a wall", () => {
    const pinned = { p: 1, at: 1000 };
    const out = advanceRope(pinned, held(MIN_TIER), held(5), 500_000, k);
    expect(out.p).toBe(1);
  });

  it("leaves an epoch-zero origin harmless while both teams are unstarted", () => {
    // init stamps rope.at = 0 with both tiers unstarted; the first advance
    // integrates a ~1.7e12 ms window that must contribute nothing.
    const out = advanceRope(
      INITIAL_ROPE,
      UNSTARTED,
      UNSTARTED,
      1_700_000_000_000,
      k,
    );
    expect(out.p).toBeCloseTo(0, 12);
  });
});

describe("pinnedSide", () => {
  it("reports A at the +1 wall, B at -1, null between", () => {
    expect(pinnedSide({ p: 1, at: 0 })).toBe("A");
    expect(pinnedSide({ p: -1, at: 0 })).toBe("B");
    expect(pinnedSide({ p: 0.99, at: 0 })).toBeNull();
  });
});

describe("calibration", () => {
  it("pins a sustained one-tier gap at ten-a-side in about 55 seconds", () => {
    const k10 = ropeK(10, 10);
    const out = advanceRope(INITIAL_ROPE, held(3), held(2), 56_000, k10);
    expect(out.p).toBe(1);
    const shy = advanceRope(INITIAL_ROPE, held(3), held(2), 54_000, k10);
    expect(shy.p).toBeLessThan(1);
  });

  it("leaves a one-tier gap at two-a-side well short of a pin in 120s", () => {
    const out = advanceRope(
      INITIAL_ROPE,
      held(3),
      held(2),
      120_000,
      ropeK(2, 2),
    );
    expect(out.p).toBeGreaterThan(0.8);
    expect(out.p).toBeLessThan(1);
  });
});
