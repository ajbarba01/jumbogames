/**
 * Unit coverage for the exhaustive board solver: neighbor adjacency
 * (including diagonals and edge clipping) and word discovery (no tile
 * reused within a path, results respect a caller-supplied limit).
 */
import { beforeAll, describe, expect, it } from "vitest";
import { findWords, neighbors } from "./solver";
import { installWordList, resetWordListForTests } from "./dictionary";

describe("neighbors", () => {
  it("includes diagonals and clips at edges", () => {
    expect(neighbors(0, 3).sort((a, b) => a - b)).toEqual([1, 3, 4]);
    expect(neighbors(4, 3)).toHaveLength(8);
  });
});

describe("findWords", () => {
  beforeAll(() => {
    resetWordListForTests();
    installWordList("CAT\nCATS\nACT\nTAB");
  });

  it("finds words along orthogonal and diagonal paths", () => {
    // C A T
    // X S B
    // X X X
    const found = findWords("CATXSBXXX", 3);
    const words = found.map((entry) => entry.word);
    expect(words).toContain("CAT");
    expect(words).toContain("CATS");
    expect(words).toContain("TAB");
  });

  it("never revisits a tile within one path", () => {
    for (const { path } of findWords("CATXSBXXX", 3)) {
      expect(new Set(path).size).toBe(path.length);
    }
  });

  it("honors the result limit", () => {
    expect(findWords("CATXSBXXX", 3, { limit: 1 })).toHaveLength(1);
  });
});
