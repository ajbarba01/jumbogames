/**
 * Evidence that the dice tuning produces playable boards. Not a unit test of
 * one function: it samples the generator across every match size and asserts
 * the properties a player would notice going wrong.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { generateGrid, gridSide } from "./grid";
import { findWords } from "./solver";
import { installBundledWordList } from "./install-words";

const SIZES = [10, 14, 17, 22, 24];

describe("board quality", () => {
  beforeAll(() => installBundledWordList());

  it("sizes every realistic match within the clamps", () => {
    for (let players = 2; players <= 40; players++) {
      const side = gridSide(players);
      expect(side).toBeGreaterThanOrEqual(10);
      expect(side).toBeLessThanOrEqual(24);
    }
  });

  // 100 uncapped DFS sweeps across five board sizes exceeds vitest's default
  // 5s per-test timeout even with prefix-set pruning in place.
  const wordAvailabilityTimeoutMs = 30_000;

  it(
    "puts findable words everywhere on every size",
    () => {
      for (const side of SIZES) {
        for (let trial = 0; trial < 20; trial++) {
          const letters = generateGrid(side, `quality:${side}:${trial}`);
          // No `limit` here: a cap below side*side would make the assertion
          // unsatisfiable at the larger sizes regardless of board quality.
          const found = findWords(letters, side, { maxLength: 6 });
          // A board with fewer distinct words than tiles would leave large
          // regions with nothing to play.
          expect(found.length).toBeGreaterThan(side * side);
        }
      }
    },
    wordAvailabilityTimeoutMs,
  );

  it("keeps the vowel share in a playable band", () => {
    for (const side of SIZES) {
      const letters = generateGrid(side, `vowels:${side}`);
      const vowels = [...letters].filter((ch) => "AEIOU".includes(ch)).length;
      const share = vowels / letters.length;
      expect(share).toBeGreaterThan(0.28);
      expect(share).toBeLessThan(0.5);
    }
  });
});
