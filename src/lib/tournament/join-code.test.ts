/**
 * Unit tests for join-code generation: fixed length, the unambiguous alphabet,
 * deterministic output under an injected RNG, and collision retry.
 */
import { describe, it, expect } from "vitest";
import {
  generateJoinCode,
  generateUniqueJoinCode,
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
} from "./join-code";

describe("generateJoinCode", () => {
  it("produces a code of the fixed length from the alphabet only", () => {
    const code = generateJoinCode();
    expect(code).toHaveLength(JOIN_CODE_LENGTH);
    for (const ch of code) expect(JOIN_CODE_ALPHABET).toContain(ch);
  });

  it("excludes the ambiguous characters 0, 1, I, and O", () => {
    expect(JOIN_CODE_ALPHABET).not.toMatch(/[01IO]/);
  });

  it("is deterministic under an injected RNG", () => {
    const rng = () => 0; // always the first alphabet character
    expect(generateJoinCode(rng)).toBe(
      JOIN_CODE_ALPHABET[0].repeat(JOIN_CODE_LENGTH),
    );
  });
});

describe("generateUniqueJoinCode", () => {
  it("returns the first code that does not already exist", async () => {
    const taken = new Set([JOIN_CODE_ALPHABET[0].repeat(JOIN_CODE_LENGTH)]);
    let call = 0;
    // First attempt yields an all-first-char code (taken); second yields a
    // distinct code (free).
    const rng = () => (call++ < JOIN_CODE_LENGTH ? 0 : 0.5);
    const code = await generateUniqueJoinCode(async (c) => taken.has(c), rng);
    expect(taken.has(code)).toBe(false);
    expect(code).toHaveLength(JOIN_CODE_LENGTH);
  });

  it("throws if it cannot find a free code within the retry budget", async () => {
    await expect(generateUniqueJoinCode(async () => true)).rejects.toThrow();
  });
});
