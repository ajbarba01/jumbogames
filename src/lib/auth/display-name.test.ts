/**
 * Unit tests for the display-name derivation helper.
 */
import { describe, it, expect } from "vitest";
import { localPartOf } from "./display-name";

describe("localPartOf", () => {
  it("returns the segment before the @", () => {
    expect(localPartOf("ada@example.com")).toBe("ada");
  });

  it("handles a plus-tagged address", () => {
    expect(localPartOf("ada+jumbo@example.com")).toBe("ada+jumbo");
  });

  it("trims surrounding whitespace", () => {
    expect(localPartOf("  grace@x.com  ")).toBe("grace");
  });

  it("returns the whole string when there is no @", () => {
    expect(localPartOf("linus")).toBe("linus");
  });
});
