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

  it("includes devOnly games outside production", () => {
    expect(poolFor("development")).toContain("stub");
    expect(poolFor("test")).toContain("stub");
  });

  it("excludes devOnly games in production", () => {
    expect(poolFor("production")).not.toContain("stub");
  });
});
