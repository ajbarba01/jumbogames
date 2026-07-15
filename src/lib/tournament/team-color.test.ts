/**
 * Unit tests for team-color assignment: the lowest free palette index, and the
 * palette cap that also caps the number of teams.
 */
import { describe, it, expect } from "vitest";
import { pickColorIndex } from "./team-color";

describe("pickColorIndex", () => {
  it("assigns the first index for an empty tournament", () => {
    expect(pickColorIndex([])).toBe(1);
  });

  it("assigns the lowest free index, not the next sequential one", () => {
    expect(pickColorIndex([1, 3])).toBe(2);
    expect(pickColorIndex([1, 2])).toBe(3);
  });

  it("returns null once the palette is exhausted", () => {
    const all = Array.from({ length: 15 }, (_, i) => i + 1);
    expect(pickColorIndex(all)).toBeNull();
  });
});
