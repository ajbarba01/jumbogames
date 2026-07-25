/**
 * Unit tests for pool eligibility. A game's stored pool can go stale — a kind
 * gets unregistered, or a dev-only kind sits on a row now played in
 * production — so the draw intersects it with what is playable here.
 */
import { describe, expect, it } from "vitest";
import { eligiblePool } from "./eligible";

describe("eligiblePool", () => {
  it("keeps kinds that are eligible in this environment", () => {
    expect(eligiblePool(["trivia"], "production")).toEqual(["trivia"]);
  });

  it("drops a dev-only kind in production", () => {
    expect(eligiblePool(["stub", "trivia"], "production")).toEqual(["trivia"]);
  });

  it("keeps only dev-only kinds under the test pool", () => {
    expect(eligiblePool(["stub", "trivia"], "test")).toEqual(["stub"]);
  });

  it("returns empty when nothing stored is playable here", () => {
    expect(eligiblePool(["trivia"], "test")).toEqual([]);
  });

  it("preserves the stored order", () => {
    expect(eligiblePool(["trivia", "stub"], "development")).toEqual([
      "trivia",
      "stub",
    ]);
  });
});
