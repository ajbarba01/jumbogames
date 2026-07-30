/**
 * Constraint tests for Word Lock board generation: determinism, character
 * set, and the vowel/rare-letter density guarantees that keep a large grid
 * playable everywhere.
 */
import { describe, expect, it } from "vitest";
import { generateGrid, gridSide, rerollLetter, VOWELS } from "./grid";
import { MAX_RARE_PER_BLOCK, RARE_LETTERS } from "./tuning";

describe("gridSide", () => {
  it("scales with the players in the match", () => {
    expect(gridSide(4)).toBe(10);
    expect(gridSide(8)).toBe(14);
    expect(gridSide(12)).toBe(17);
    expect(gridSide(20)).toBe(22);
  });

  it("clamps at both ends", () => {
    expect(gridSide(2)).toBe(10);
    expect(gridSide(200)).toBe(24);
  });
});

describe("generateGrid", () => {
  it("is deterministic for a seed", () => {
    expect(generateGrid(14, "abc")).toBe(generateGrid(14, "abc"));
  });

  it("differs across seeds", () => {
    expect(generateGrid(14, "abc")).not.toBe(generateGrid(14, "xyz"));
  });

  it("emits exactly side*side uppercase letters and never Q", () => {
    const letters = generateGrid(14, "abc");
    expect(letters).toHaveLength(196);
    expect(letters).toMatch(/^[A-Z]+$/);
    expect(letters).not.toContain("Q");
  });

  it("puts a vowel in every 2x2 neighborhood", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const side = 14;
      const letters = generateGrid(side, seed);
      for (let row = 0; row < side - 1; row++) {
        for (let col = 0; col < side - 1; col++) {
          const block = [
            letters[row * side + col]!,
            letters[row * side + col + 1]!,
            letters[(row + 1) * side + col]!,
            letters[(row + 1) * side + col + 1]!,
          ];
          expect(block.some((ch) => VOWELS.includes(ch))).toBe(true);
        }
      }
    }
  });

  it("caps rare letters per 4x4 block", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const side = 16;
      const letters = generateGrid(side, seed);
      for (let row = 0; row + 4 <= side; row += 4) {
        for (let col = 0; col + 4 <= side; col += 4) {
          let rare = 0;
          for (let r = row; r < row + 4; r++) {
            for (let c = col; c < col + 4; c++) {
              if (RARE_LETTERS.includes(letters[r * side + c]!)) rare++;
            }
          }
          expect(rare).toBeLessThanOrEqual(MAX_RARE_PER_BLOCK);
        }
      }
    }
  });
});

describe("rerollLetter", () => {
  it("is deterministic in seed, epoch and index", () => {
    expect(rerollLetter("s", 3, 7)).toBe(rerollLetter("s", 3, 7));
    expect(rerollLetter("s", 3, 7)).not.toBe(rerollLetter("s", 4, 7));
  });

  it("never emits Q", () => {
    for (let i = 0; i < 500; i++) {
      expect(rerollLetter("s", 1, i)).not.toBe("Q");
    }
  });
});
