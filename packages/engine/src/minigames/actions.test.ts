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

  it("accepts a well-formed trivia answer", () => {
    const result = actionSchemaFor("trivia").safeParse({
      type: "answer",
      deckIndex: 0,
      choiceIndex: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a trivia answer with an out-of-range choice", () => {
    expect(
      actionSchemaFor("trivia").safeParse({
        type: "answer",
        deckIndex: 0,
        choiceIndex: 4,
      }).success,
    ).toBe(false);
    expect(
      actionSchemaFor("trivia").safeParse({
        type: "answer",
        deckIndex: -1,
        choiceIndex: 0,
      }).success,
    ).toBe(false);
  });
});
