/**
 * Unit tests for pool eligibility. A game's stored pool can go stale — a kind
 * gets unregistered, or a dev-only kind sits on a row now played in
 * production — so the draw intersects it with what is playable here.
 */
import { describe, expect, it } from "vitest";
import { eligiblePool } from "./eligible";
import { poolFor } from "./registry";

describe("poolFor", () => {
  it("admits every registered kind under the test pool", () => {
    // E2E must be able to draw trivia — the play surface has no other coverage.
    expect(poolFor("test")).toContain("trivia");
    expect(poolFor("test")).toContain("stub");
  });

  it("still keeps devOnly kinds out of production", () => {
    expect(poolFor("production")).not.toContain("stub");
  });
});

describe("eligiblePool", () => {
  it("keeps kinds that are eligible in this environment", () => {
    expect(eligiblePool(["trivia"], "production")).toEqual(["trivia"]);
  });

  it("drops a dev-only kind in production", () => {
    expect(eligiblePool(["stub", "trivia"], "production")).toEqual(["trivia"]);
  });

  it("keeps every registered kind under the test pool", () => {
    expect(eligiblePool(["stub", "trivia"], "test")).toEqual([
      "stub",
      "trivia",
    ]);
  });

  it("returns empty when nothing stored is playable here", () => {
    expect(eligiblePool(["stub"], "production")).toEqual([]);
  });

  it("preserves the stored order", () => {
    expect(eligiblePool(["trivia", "stub"], "development")).toEqual([
      "trivia",
      "stub",
    ]);
  });
});
