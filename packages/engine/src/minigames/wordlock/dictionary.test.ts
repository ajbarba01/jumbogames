/**
 * Tests for Word Lock word membership: uninstalled lookups throw, installed
 * lookups are case-insensitive, and blank lines in the blob are ignored.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  hasWord,
  installWordList,
  isWordListInstalled,
  resetWordListForTests,
} from "./dictionary";

describe("dictionary", () => {
  beforeEach(() => resetWordListForTests());

  it("throws when no list is installed", () => {
    expect(() => hasWord("CAT")).toThrow(/not installed/);
  });

  it("reports membership case-insensitively once installed", () => {
    installWordList("CAT\nSTRAINED");
    expect(isWordListInstalled()).toBe(true);
    expect(hasWord("cat")).toBe(true);
    expect(hasWord("CAT")).toBe(true);
    expect(hasWord("CATS")).toBe(false);
  });

  it("ignores blank lines in the blob", () => {
    installWordList("CAT\n\nDOG\n");
    expect(hasWord("DOG")).toBe(true);
    expect(hasWord("")).toBe(false);
  });
});
