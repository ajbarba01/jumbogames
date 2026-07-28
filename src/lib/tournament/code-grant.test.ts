/**
 * Tests for the durable half of the code grant: the per-game cookie name, and
 * resolving which presented code the server should check when a link-borne
 * viewer's `?c=` has already been scrubbed out of the address bar.
 */
import { describe, expect, it } from "vitest";
import { codeCookieName, presentedCode } from "./code-grant";

describe("codeCookieName", () => {
  it("scopes the cookie to one game", () => {
    expect(codeCookieName("t1")).not.toBe(codeCookieName("t2"));
  });

  it("is stable for the same game", () => {
    expect(codeCookieName("t1")).toBe(codeCookieName("t1"));
  });
});

describe("presentedCode", () => {
  it("uses the query parameter when the link still carries it", () => {
    expect(presentedCode("ABC123", null)).toBe("ABC123");
  });

  // The whole point: the scrub removes ?c= from the URL, so every later render
  // must still find the grant the viewer already presented once.
  it("falls back to the cookie once the url has been scrubbed", () => {
    expect(presentedCode(null, "ABC123")).toBe("ABC123");
  });

  it("prefers the query parameter over a stale cookie", () => {
    expect(presentedCode("NEW456", "OLD123")).toBe("NEW456");
  });

  it("is null when neither is present", () => {
    expect(presentedCode(null, null)).toBeNull();
  });

  // `?c=` with no value parses as "", which is present-but-useless; treating it
  // as a presented code would shadow a perfectly good cookie.
  it("ignores an empty query parameter and still finds the cookie", () => {
    expect(presentedCode("", "ABC123")).toBe("ABC123");
  });
});
