/**
 * The gate demo's script is the one part of the demo that can be tested without
 * a browser, and it is the part worth testing: it teaches four rules in ten
 * seconds, and a timeline that drifts out of agreement with itself teaches the
 * wrong ones. These assert the *claims the picture makes* — the rope moves the
 * way the tier gap says it does, the wrong answer costs seconds and not tiers —
 * rather than pinning exact frame values, which would break on every retune.
 */
import { describe, expect, it } from "vitest";
import { resolveTier, tierExpiresAt } from "@jumbo/engine";
import { CYCLE_MS, demoFrameAt, STILL_FRAME_MS } from "./demo-script";

/** A fixed clock: the script back-dates from whatever it is handed. */
const NOW = 1_000_000;

/** Every 50ms, matching the component's frame rate. */
function everyFrame(): number[] {
  const times: number[] = [];
  for (let t = 0; t < CYCLE_MS; t += 50) times.push(t);
  return times;
}

describe("demoFrameAt", () => {
  it("wraps the cycle, so the loop has no seam", () => {
    expect(demoFrameAt(0, NOW)).toEqual(demoFrameAt(CYCLE_MS, NOW));
    expect(demoFrameAt(120, NOW)).toEqual(demoFrameAt(CYCLE_MS + 120, NOW));
    expect(demoFrameAt(-50, NOW)).toEqual(demoFrameAt(CYCLE_MS - 50, NOW));
  });

  it("keeps the rope inside the pinnable range at every frame", () => {
    for (const t of everyFrame()) {
      const { p } = demoFrameAt(t, NOW);
      expect(p).toBeGreaterThan(-1);
      expect(p).toBeLessThan(1);
    }
  });

  it("moves the rope toward whichever team the tier gap favours", () => {
    // The rope's direction is the demo's central claim. Sampled as a delta
    // rather than a position, because what a viewer reads is the movement.
    for (const t of everyFrame()) {
      const here = demoFrameAt(t, NOW);
      const next = demoFrameAt(t + 50, NOW);
      // Skip the wrap, where p jumps back to the start by construction.
      if (t + 50 >= CYCLE_MS) continue;
      const delta = next.p - here.p;
      if (here.gap > 0) expect(delta).toBeGreaterThanOrEqual(0);
      if (here.gap < 0) expect(delta).toBeLessThanOrEqual(0);
      if (here.gap === 0) expect(Math.abs(delta)).toBeLessThan(1e-9);
    }
  });

  it("shows both teams leading at some point, so neither wall is decoration", () => {
    const gaps = everyFrame().map((t) => demoFrameAt(t, NOW).gap);
    expect(gaps.some((g) => g > 0)).toBe(true);
    expect(gaps.some((g) => g < 0)).toBe(true);
  });

  it("demotes team B rather than letting the ring run out unresolved", () => {
    // The "power slips" lesson: B holds tier 2, its ring drains, and it drops.
    const before = demoFrameAt(4000, NOW);
    const after = demoFrameAt(4400, NOW);
    expect(before.tierB.tier).toBe(2);
    expect(after.tierB.tier).toBe(1);
  });

  it("stages tiers so the meter never resolves them to a different value", () => {
    // The script back-dates each timer to draw a chosen ring fraction. Too far
    // back and the meter's own resolveTier walks the tier down, and the picture
    // stops matching the script that authored it.
    for (const t of everyFrame()) {
      const { tierA, tierB, now } = demoFrameAt(t, NOW);
      expect(resolveTier(tierA, now).tier).toBe(tierA.tier);
      expect(resolveTier(tierB, now).tier).toBe(tierB.tier);
    }
  });

  it("gives an expiring ring only to tiers that can actually expire", () => {
    for (const t of everyFrame()) {
      const { tierA, tierB, now } = demoFrameAt(t, NOW);
      for (const tier of [tierA, tierB]) {
        // Tier 1 is the floor: it never expires, so it must never be staged
        // with a running timer, or the meter would draw a threat that is a lie.
        if (tier.tier <= 1) expect(tierExpiresAt(tier, now)).toBeNull();
      }
    }
  });

  it("costs the wrong answer seconds, not a tier", () => {
    const locked = everyFrame().filter(
      (t) => demoFrameAt(t, NOW).lockoutSeconds !== null,
    );
    expect(locked.length).toBeGreaterThan(0);

    const first = demoFrameAt(locked[0], NOW);
    const last = demoFrameAt(locked[locked.length - 1], NOW);
    expect(first.verdict).toBe("wrong");
    // The whole point of the rule: the lockout takes time and leaves the tier
    // alone. If this ever inverts, the demo is teaching the opposite lesson.
    expect(last.tierA.tier).toBe(first.tierA.tier);
    expect(last.lockoutSeconds).toBeLessThanOrEqual(first.lockoutSeconds ?? 0);
  });

  it("counts the lockout down through whole seconds and releases", () => {
    const seconds = everyFrame()
      .map((t) => demoFrameAt(t, NOW).lockoutSeconds)
      .filter((s): s is number => s !== null);
    expect(Math.max(...seconds)).toBe(3);
    expect(Math.min(...seconds)).toBe(1);
    // It has to end inside the cycle, or the loop restarts mid-punishment.
    expect(demoFrameAt(CYCLE_MS - 50, NOW).lockoutSeconds).toBeNull();
  });

  it("picks the answer on a correct verdict and something else on a wrong one", () => {
    for (const t of everyFrame()) {
      const { card, picked, verdict } = demoFrameAt(t, NOW);
      if (verdict === "idle") {
        expect(picked).toBeNull();
        continue;
      }
      expect(picked).not.toBeNull();
      if (verdict === "correct") expect(picked).toBe(card.answer);
      if (verdict === "wrong") expect(picked).not.toBe(card.answer);
    }
  });

  it("pins reduced motion to a frame that shows a gap, a pull and a verdict", () => {
    // A still that happened to land on a standstill would teach nothing, which
    // is the only way the reduced-motion path can silently fail.
    const still = demoFrameAt(STILL_FRAME_MS, NOW);
    expect(still.gap).not.toBe(0);
    expect(still.p).not.toBe(0);
    expect(still.verdict).not.toBe("idle");
  });
});
