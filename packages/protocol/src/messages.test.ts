/**
 * Contract tests for the client→server wire schema: well-formed messages parse,
 * and unknown types, missing ordinals, and negative sequence numbers are
 * rejected at the boundary rather than reaching the reducer.
 */
import { describe, expect, it } from "vitest";
import { clientMessageSchema } from "./messages";

describe("clientMessageSchema", () => {
  it("accepts an action message", () => {
    const parsed = clientMessageSchema.safeParse({
      type: "action",
      ordinal: 0,
      seq: 3,
      action: { choice: 2 },
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a ready message with no action payload", () => {
    expect(
      clientMessageSchema.safeParse({ type: "ready", ordinal: 1, seq: 0 })
        .success,
    ).toBe(true);
  });

  it("rejects an unknown message type", () => {
    expect(
      clientMessageSchema.safeParse({ type: "drop-table", ordinal: 0, seq: 0 })
        .success,
    ).toBe(false);
  });

  it("rejects a non-integer ordinal", () => {
    expect(
      clientMessageSchema.safeParse({ type: "ready", ordinal: 1.5, seq: 0 })
        .success,
    ).toBe(false);
  });

  it("rejects a negative sequence number", () => {
    expect(
      clientMessageSchema.safeParse({ type: "ready", ordinal: 0, seq: -1 })
        .success,
    ).toBe(false);
  });
});
