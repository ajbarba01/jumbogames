/**
 * Tests for the server registry: kind lookup and the devOnly pool filter
 * that keeps the stub out of production draws.
 */
import { describe, expect, it } from "vitest";
import { MINIGAMES, poolFor } from "./registry";

describe("registry", () => {
  it("resolves the stub by kind", () => {
    expect(MINIGAMES.stub.title).toBe("Button Masher");
  });

  it("resolves trivia by kind", () => {
    expect(MINIGAMES.trivia.title).toBe("Tug O' Lore");
  });

  it("includes devOnly games outside production", () => {
    expect(poolFor("development")).toContain("stub");
    expect(poolFor("test")).toContain("stub");
  });

  it("excludes devOnly games in production", () => {
    expect(poolFor("production")).not.toContain("stub");
  });

  it("includes non-devOnly games in every environment", () => {
    expect(poolFor("development")).toContain("trivia");
    expect(poolFor("production")).toContain("trivia");
    // The test pool is a widening: E2E picks its kind in the create form
    // rather than relying on the pool to narrow the draw for it.
    expect(poolFor("test")).toContain("trivia");
  });
});
