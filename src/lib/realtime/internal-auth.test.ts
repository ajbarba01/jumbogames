/**
 * The internal-route guard must admit only callers presenting the shared
 * secret, and must not be satisfiable by an ordinary browser session.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { isInternalCaller } from "./internal-auth";

const SECRET = "test-secret-at-least-32-bytes-long-000";

describe("isInternalCaller", () => {
  beforeEach(() => {
    process.env.REALTIME_SHARED_SECRET = SECRET;
  });

  const withHeader = (value: string | null) =>
    new Request("https://example.test/api/internal/x", {
      headers: value === null ? {} : { "x-internal-auth": value },
    });

  it("admits a request carrying the shared secret", () => {
    expect(isInternalCaller(withHeader(SECRET))).toBe(true);
  });

  it("rejects a request with no header", () => {
    expect(isInternalCaller(withHeader(null))).toBe(false);
  });

  it("rejects a request with a wrong secret", () => {
    expect(isInternalCaller(withHeader("wrong"))).toBe(false);
  });

  it("rejects when the server has no secret configured", () => {
    delete process.env.REALTIME_SHARED_SECRET;
    expect(isInternalCaller(withHeader(SECRET))).toBe(false);
  });
});
