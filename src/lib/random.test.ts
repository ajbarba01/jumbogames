/**
 * Tests for the shared seeded RNG helpers: hashing is deterministic,
 * mulberry32 produces a repeatable stream, and seededShuffle is a
 * deterministic Fisher-Yates that preserves the input's elements.
 */
import { describe, expect, it } from "vitest";
import { hashSeed, mulberry32, seededShuffle } from "./random";

describe("hashSeed", () => {
  it("is deterministic for the same seed", () => {
    expect(hashSeed("r1")).toBe(hashSeed("r1"));
  });

  it("differs across seeds (probabilistic, fixed fixtures)", () => {
    expect(hashSeed("r1")).not.toBe(hashSeed("r2"));
  });
});

describe("mulberry32", () => {
  it("produces a deterministic stream for the same state", () => {
    const a = mulberry32(hashSeed("r1"));
    const b = mulberry32(hashSeed("r1"));
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
});

describe("seededShuffle", () => {
  const items = [1, 2, 3, 4, 5];

  it("is deterministic for the same seed", () => {
    expect(seededShuffle(items, "r1")).toEqual(seededShuffle(items, "r1"));
  });

  it("produces a different order for a different seed", () => {
    expect(seededShuffle(items, "r1")).not.toEqual(seededShuffle(items, "r2"));
  });

  it("preserves the input's elements", () => {
    const shuffled = seededShuffle(items, "r1");
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it("does not mutate the input", () => {
    const copy = [...items];
    seededShuffle(items, "r1");
    expect(items).toEqual(copy);
  });
});
