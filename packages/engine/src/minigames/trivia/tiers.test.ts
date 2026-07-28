/**
 * Tests for the pulling-power tier engine. The engine's whole contract is that
 * tier is a pure function of stored state plus a clock — so these cover the
 * forward walk through several expired timers at once, which is what a long
 * gap between two answers produces and what a server tick loop would otherwise
 * have been needed for.
 */
import { describe, expect, it } from "vitest";
import {
  addCharge,
  INITIAL_TIER,
  resolveTier,
  tierAt,
  tierBreakpoints,
  tierExpiresAt,
  type TierState,
} from "./tiers";
import {
  CHARGE_PER_TIER,
  DEMOTION_KEEP,
  MAX_TIER,
  MIN_TIER,
  TIER_SECONDS,
} from "./tuning";

const T2 = TIER_SECONDS[2]! * 1000;
const T3 = TIER_SECONDS[3]! * 1000;

describe("resolveTier", () => {
  it("leaves an unstarted timer alone however late the clock", () => {
    expect(resolveTier(INITIAL_TIER, 10_000_000)).toEqual(INITIAL_TIER);
  });

  it("is identity before the timer expires", () => {
    const state: TierState = { tier: 2, enteredAt: 0, charge: 1 };
    expect(resolveTier(state, T2 - 1)).toEqual(state);
  });

  it("demotes one tier and halves charge on expiry", () => {
    const state: TierState = { tier: 2, enteredAt: 0, charge: 2 };
    const out = resolveTier(state, T2);
    expect(out.tier).toBe(1);
    expect(out.charge).toBeCloseTo(2 * DEMOTION_KEEP, 10);
    expect(out.enteredAt).toBe(T2);
  });

  it("walks several expiries in one call", () => {
    // Enter tier 3 at 0; tier 3 expires at T3, then tier 2 expires T2 later.
    const state: TierState = { tier: 3, enteredAt: 0, charge: 2 };
    const out = resolveTier(state, T3 + T2 + 1);
    expect(out.tier).toBe(1);
    expect(out.charge).toBeCloseTo(2 * DEMOTION_KEEP * DEMOTION_KEEP, 10);
    expect(out.enteredAt).toBe(T3 + T2);
  });

  it("floors at MIN_TIER and stops demoting", () => {
    const state: TierState = { tier: MAX_TIER, enteredAt: 0, charge: 2 };
    const out = resolveTier(state, 10_000_000);
    expect(out.tier).toBe(MIN_TIER);
  });

  it("never expires at the floor", () => {
    const state: TierState = { tier: MIN_TIER, enteredAt: 0, charge: 1 };
    expect(resolveTier(state, 10_000_000)).toEqual(state);
  });

  it("leaves a stalled team level with one that never played", () => {
    // The inversion this floor exists to prevent: a team that climbed and then
    // stopped must not decay below a team that never answered at all.
    const climbed: TierState = { tier: 4, enteredAt: 0, charge: 0 };
    const stalled = resolveTier(climbed, 10_000_000);
    const idle = resolveTier(INITIAL_TIER, 10_000_000);
    expect(stalled.tier).toBe(idle.tier);
  });
});

describe("addCharge", () => {
  it("starts the timer on the first contribution", () => {
    const out = addCharge(INITIAL_TIER, 5000, 1);
    expect(out.enteredAt).toBe(5000);
    expect(out.tier).toBe(1);
    expect(out.charge).toBeCloseTo(1, 10);
  });

  it("promotes when charge reaches the tier cost and restarts the timer", () => {
    const state: TierState = {
      tier: 1,
      enteredAt: 0,
      charge: CHARGE_PER_TIER - 1,
    };
    const out = addCharge(state, 1000, 1);
    expect(out.tier).toBe(2);
    expect(out.charge).toBeCloseTo(0, 10);
    expect(out.enteredAt).toBe(1000);
  });

  it("carries the overflow into the new tier", () => {
    const state: TierState = {
      tier: 1,
      enteredAt: 0,
      charge: CHARGE_PER_TIER - 1,
    };
    const out = addCharge(state, 1000, 2);
    expect(out.tier).toBe(2);
    expect(out.charge).toBeCloseTo(1, 10);
  });

  it("resolves expired timers before adding", () => {
    // Tier 2 entered at 0 has expired by T2; the answer lands on tier 1.
    const state: TierState = { tier: 2, enteredAt: 0, charge: 0 };
    const out = addCharge(state, T2, 1);
    expect(out.tier).toBe(1);
    expect(out.charge).toBeCloseTo(1, 10);
  });

  it("cannot climb past the ceiling, and caps charge there", () => {
    const state: TierState = { tier: MAX_TIER, enteredAt: 0, charge: 0 };
    const out = addCharge(state, 1, CHARGE_PER_TIER * 5);
    expect(out.tier).toBe(MAX_TIER);
    expect(out.charge).toBeLessThanOrEqual(CHARGE_PER_TIER);
  });
});

describe("tierBreakpoints", () => {
  it("is empty for an unstarted timer", () => {
    expect(tierBreakpoints(INITIAL_TIER, 0, 10_000_000)).toEqual([]);
  });

  it("lists demotion instants strictly inside the window", () => {
    const state: TierState = { tier: 3, enteredAt: 0, charge: 0 };
    // Two only: the walk stops at MIN_TIER, which never expires.
    expect(tierBreakpoints(state, 0, 10_000_000)).toEqual([T3, T3 + T2]);
  });

  it("excludes the window's own end", () => {
    const state: TierState = { tier: 3, enteredAt: 0, charge: 0 };
    expect(tierBreakpoints(state, 0, T3)).toEqual([]);
  });

  it("agrees with tierAt on both sides of a breakpoint", () => {
    const state: TierState = { tier: 3, enteredAt: 0, charge: 0 };
    expect(tierAt(state, T3 - 1)).toBe(3);
    expect(tierAt(state, T3)).toBe(2);
  });
});

describe("tierExpiresAt", () => {
  it("is null when the timer has not started", () => {
    expect(tierExpiresAt(INITIAL_TIER, 1000)).toBeNull();
  });

  it("is null at the floor, started or not", () => {
    expect(
      tierExpiresAt({ tier: MIN_TIER, enteredAt: 0, charge: 0 }, 1000),
    ).toBeNull();
    expect(tierExpiresAt(INITIAL_TIER, 1000)).toBeNull();
  });

  it("reports the current tier's deadline after a demotion", () => {
    const state: TierState = { tier: 3, enteredAt: 0, charge: 0 };
    // Demoted to 2 at T3; tier 2's own deadline is T2 later.
    expect(tierExpiresAt(state, T3 + 1)).toBe(T3 + T2);
  });
});
