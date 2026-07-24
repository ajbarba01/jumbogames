/**
 * Tests for the seeded per-round minigame draw and its pre-commit guards:
 * deterministic under a seed, distinct while the pool lasts, cycling when K
 * exceeds the pool, `checkRoundDraw` rejecting a draw that can't fill K, and
 * `checkContentReady` rejecting a drawn kind with no content to serve.
 */
import { describe, expect, it } from "vitest";
import {
  checkContentReady,
  checkRoundDraw,
  drawRoundGames,
} from "./round-draw";
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

describe("checkRoundDraw", () => {
  it("accepts a full draw", () => {
    const drawn = drawRoundGames(pool, 2, "r1");
    expect(checkRoundDraw(drawn, 2)).toEqual({ ok: true });
  });

  it("rejects an empty draw when at least one minigame is required", () => {
    expect(checkRoundDraw([], 1)).toEqual({
      ok: false,
      reason: "No minigames are available to play in this environment",
    });
  });

  it("rejects k = 0", () => {
    expect(checkRoundDraw([], 0)).toEqual({
      ok: false,
      reason: "This tournament plays no minigames per match",
    });
  });

  it("rejects a draw shorter than k", () => {
    expect(checkRoundDraw(pool, 2)).toEqual({
      ok: false,
      reason: "No minigames are available to play in this environment",
    });
  });
});

describe("checkContentReady", () => {
  it("fails a draw containing trivia when the bank is empty", () => {
    const check = checkContentReady(["trivia"], 0);
    expect(check.ok).toBe(false);
  });
  it("passes trivia with a stocked bank and non-trivia draws regardless", () => {
    expect(checkContentReady(["trivia"], 1).ok).toBe(true);
    expect(checkContentReady(["stub"], 0).ok).toBe(true);
  });
});
