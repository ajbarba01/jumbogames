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
    expect(MINIGAMES.trivia.title).toBe("Trivia Tug-of-War");
  });

  it("includes devOnly games outside production", () => {
    expect(poolFor("development")).toContain("stub");
    expect(poolFor("test")).toContain("stub");
  });

  it("excludes devOnly games in production", () => {
    expect(poolFor("production")).not.toContain("stub");
  });

  it("includes non-devOnly games everywhere except the deterministic test pool", () => {
    expect(poolFor("development")).toContain("trivia");
    expect(poolFor("production")).toContain("trivia");
    expect(poolFor("test")).not.toContain("trivia");
  });
});
