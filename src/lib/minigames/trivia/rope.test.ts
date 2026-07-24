/**
 * Tests for the tug-of-war rope's leaky-integrator physics: decay shrinks
 * |p| toward zero over time without crossing it, applyPull decays then
 * adds a signed impulse clamped to [-1, 1], and pinnedSide reports a wall
 * touch only at the extremes.
 */
import { describe, expect, it } from "vitest";
import {
  applyPull,
  decayRope,
  pinnedSide,
  ROPE_HALF_LIFE_MS,
  ROPE_PULL,
  WRONG_PULL_FRACTION,
  type RopeState,
} from "./rope";

describe("decayRope", () => {
  it("halves p after one half-life", () => {
    const r = decayRope({ p: 0.8, at: 0 }, ROPE_HALF_LIFE_MS);
    expect(r.p).toBeCloseTo(0.4, 10);
    expect(r.at).toBe(ROPE_HALF_LIFE_MS);
  });

  it("is identity at now === at", () => {
    const r = decayRope({ p: 0.6, at: 1000 }, 1000);
    expect(r.p).toBeCloseTo(0.6, 10);
    expect(r.at).toBe(1000);
  });

  it("never crosses zero", () => {
    const r = decayRope({ p: -0.6, at: 0 }, ROPE_HALF_LIFE_MS * 50);
    expect(r.p).toBeLessThan(0);
    expect(r.p).toBeGreaterThan(-0.6);
  });
});

describe("applyPull", () => {
  it("adds PULL/teamSize toward A for a correct A answer", () => {
    const r = applyPull({ p: 0, at: 0 }, 0, {
      side: "A",
      correct: true,
      teamSize: 3,
    });
    expect(r.p).toBeCloseTo(ROPE_PULL / 3, 10);
  });

  it("pushes the answering side backward by a third on a wrong answer", () => {
    const r = applyPull({ p: 0, at: 0 }, 0, {
      side: "A",
      correct: false,
      teamSize: 1,
    });
    expect(r.p).toBeCloseTo(-ROPE_PULL * WRONG_PULL_FRACTION, 10);
  });

  it("decays before applying the impulse", () => {
    const r = applyPull({ p: 0.8, at: 0 }, ROPE_HALF_LIFE_MS, {
      side: "A",
      correct: true,
      teamSize: 1,
    });
    expect(r.p).toBeCloseTo(0.4 + ROPE_PULL, 10);
    expect(r.at).toBe(ROPE_HALF_LIFE_MS);
  });

  it("clamps to [-1, 1]", () => {
    const high = applyPull({ p: 0.9, at: 0 }, 0, {
      side: "A",
      correct: true,
      teamSize: 1,
    });
    expect(high.p).toBe(1);

    const low = applyPull({ p: -0.9, at: 0 }, 0, {
      side: "B",
      correct: true,
      teamSize: 1,
    });
    expect(low.p).toBe(-1);
  });
});

describe("pinnedSide", () => {
  it("reports A at p === 1, B at p === -1, null between", () => {
    expect(pinnedSide({ p: 1, at: 0 })).toBe("A");
    expect(pinnedSide({ p: -1, at: 0 })).toBe("B");
    expect(pinnedSide({ p: 0.5, at: 0 })).toBeNull();
  });

  it("a sustained one-sided streak pins", () => {
    // 1v1, correct answers 5s apart: 0.45 -> 0.768 -> 0.993 -> pin on the 4th
    let r: RopeState = { p: 0, at: 0 };
    for (let i = 0; i < 4; i++)
      r = applyPull(r, i * 5000, { side: "A", correct: true, teamSize: 1 });
    expect(pinnedSide(r)).toBe("A");
  });

  it("balanced alternating play never pins", () => {
    let r: RopeState = { p: 0, at: 0 };
    for (let i = 0; i < 20; i++) {
      const side = i % 2 === 0 ? "A" : "B";
      r = applyPull(r, i * 2000, { side, correct: true, teamSize: 1 });
    }
    expect(pinnedSide(r)).toBeNull();
  });
});
