/**
 * Unit tests for the doodle boil's frame derivation: determinism (the layer
 * renders on both server and client, so two different fields would be a
 * hydration mismatch), bounded displacement, and structural preservation.
 */
import { describe, expect, it } from "vitest";
import { jitterFrames, jitterPath, seededRandom } from "./jitter";

const PATH = "M21 4 L21 38 M6 13 L36 29 M36 13 L6 29";
const CURVE = "M3 18 C 10 6, 16 20, 24 10 S 38 4, 43 12";

function numbers(d: string): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

function letters(d: string): string {
  return (d.match(/[A-Za-z]/g) ?? []).join("");
}

describe("seededRandom", () => {
  it("returns the same sequence for the same seed", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("returns a different sequence for a different seed", () => {
    const a = seededRandom(1);
    const b = seededRandom(2);
    expect(a()).not.toEqual(b());
  });

  it("stays within [0, 1)", () => {
    const next = seededRandom(7);
    for (let i = 0; i < 200; i += 1) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("jitterPath", () => {
  it("is deterministic for the same seed", () => {
    expect(jitterPath(PATH, 2, 99)).toEqual(jitterPath(PATH, 2, 99));
  });

  it("produces a different path for a different seed", () => {
    expect(jitterPath(PATH, 2, 1)).not.toEqual(jitterPath(PATH, 2, 2));
  });

  it("keeps every coordinate within the amplitude of its original", () => {
    const before = numbers(CURVE);
    const after = numbers(jitterPath(CURVE, 1.5, 5));
    expect(after).toHaveLength(before.length);
    before.forEach((value, i) => {
      expect(Math.abs(after[i]! - value)).toBeLessThanOrEqual(1.5);
    });
  });

  it("preserves the command letters and their order", () => {
    expect(letters(jitterPath(CURVE, 3, 11))).toEqual(letters(CURVE));
  });

  it("returns the path unchanged at zero amplitude", () => {
    expect(numbers(jitterPath(CURVE, 0, 3))).toEqual(numbers(CURVE));
  });
});

describe("jitterFrames", () => {
  it("returns the requested number of frames", () => {
    expect(jitterFrames(PATH, 2, 4, 3)).toHaveLength(3);
  });

  it("uses the authored path as frame zero, so reduced motion pins the drawing as drawn", () => {
    expect(jitterFrames(PATH, 2, 4, 3)[0]).toBe(PATH);
  });

  it("makes every frame distinct", () => {
    const frames = jitterFrames(CURVE, 2, 4, 4);
    expect(new Set(frames).size).toBe(4);
  });

  it("is deterministic across calls", () => {
    expect(jitterFrames(CURVE, 2, 4, 3)).toEqual(jitterFrames(CURVE, 2, 4, 3));
  });
});
