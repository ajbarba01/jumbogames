/**
 * Unit tests for owner-email allowlist parsing and membership.
 */
import { describe, it, expect } from "vitest";
import { parseOwnerEmails, isOwnerEmail } from "./owner-email";

describe("parseOwnerEmails", () => {
  it("splits comma-separated emails, trimming and lowercasing", () => {
    const set = parseOwnerEmails(" A@x.com , b@Y.com ");
    expect(set).toEqual(new Set(["a@x.com", "b@y.com"]));
  });

  it("drops empty entries and handles undefined", () => {
    expect(parseOwnerEmails("a@x.com,,")).toEqual(new Set(["a@x.com"]));
    expect(parseOwnerEmails(undefined)).toEqual(new Set());
    expect(parseOwnerEmails("")).toEqual(new Set());
  });
});

describe("isOwnerEmail", () => {
  it("matches case-insensitively", () => {
    const set = parseOwnerEmails("owner@x.com");
    expect(isOwnerEmail("OWNER@x.com", set)).toBe(true);
    expect(isOwnerEmail("other@x.com", set)).toBe(false);
  });
});
