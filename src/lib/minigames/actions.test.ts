/**
 * Tests for the per-kind action schema registry: the stub accepts a mash and
 * rejects anything else, so the action route can Zod-validate by kind.
 */
import { describe, expect, it } from "vitest";
import { actionSchemaFor } from "./actions";

describe("actionSchemaFor", () => {
  it("accepts the stub mash action", () => {
    expect(actionSchemaFor("stub").safeParse({ type: "mash" }).success).toBe(
      true,
    );
  });

  it("rejects an unknown stub action", () => {
    expect(actionSchemaFor("stub").safeParse({ type: "nope" }).success).toBe(
      false,
    );
    expect(actionSchemaFor("stub").safeParse({}).success).toBe(false);
  });
});
