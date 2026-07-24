/**
 * Unit tests for the displayName Zod schema (bounds, trimming, rejection).
 */
import { describe, it, expect } from "vitest";
import { displayNameSchema } from "./auth";

describe("displayNameSchema", () => {
  it("accepts and trims a normal name", () => {
    expect(displayNameSchema.parse("  Ada  ")).toBe("Ada");
  });

  it("rejects an empty / whitespace-only name", () => {
    expect(displayNameSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects a name longer than 30 chars", () => {
    expect(displayNameSchema.safeParse("x".repeat(31)).success).toBe(false);
  });

  it("accepts a 30-char name", () => {
    expect(displayNameSchema.safeParse("x".repeat(30)).success).toBe(true);
  });
});
