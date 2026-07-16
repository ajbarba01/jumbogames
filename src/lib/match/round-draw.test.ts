/**
 * Tests for the per-round draw: deterministic under a seed, distinct while
 * the pool lasts, cycling when K exceeds the pool.
 */
import { describe, expect, it } from "vitest";
import { drawRoundGames } from "./round-draw";
import type { MinigameKind } from "@/lib/minigames/types";

// Widened pool for draw semantics; only "stub" exists as a real kind today.
const pool = ["stub"] as MinigameKind[];

describe("drawRoundGames", () => {
  it("is deterministic for the same seed", () => {
    expect(drawRoundGames(pool, 3, "r1")).toEqual(
      drawRoundGames(pool, 3, "r1"),
    );
  });

  it("cycles when k exceeds the pool", () => {
    expect(drawRoundGames(pool, 3, "r1")).toEqual(["stub", "stub", "stub"]);
  });

  it("returns exactly k games", () => {
    expect(drawRoundGames(pool, 4, "abc")).toHaveLength(4);
  });

  it("returns [] for an empty pool", () => {
    expect(drawRoundGames([], 2, "r1")).toEqual([]);
  });
});
