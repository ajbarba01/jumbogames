/**
 * Join-code generation. Codes are short, uppercase, and drawn from an
 * unambiguous alphabet so they read cleanly off a projector. Generation is pure
 * given an injected RNG; uniqueness is checked against a caller-supplied lookup
 * so this module stays free of IO.
 */
import { randomInt } from "node:crypto";

// Crockford-derived base32 minus the characters most easily misread: 0, 1, I, O.
export const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export const JOIN_CODE_LENGTH = 6;

const MAX_CODE_ATTEMPTS = 10;

// Uniform float in [0, 1) from a CSPRNG; overridable in tests.
function cryptoRandom(): number {
  return randomInt(0, 0x100000000) / 0x100000000;
}

export function generateJoinCode(random: () => number = cryptoRandom): string {
  let code = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    const index = Math.floor(random() * JOIN_CODE_ALPHABET.length);
    code += JOIN_CODE_ALPHABET[index];
  }
  return code;
}

/**
 * Generate a code that passes the caller's existence check, retrying on the
 * rare collision. Throws if no free code is found within the retry budget.
 */
export async function generateUniqueJoinCode(
  exists: (code: string) => Promise<boolean>,
  random: () => number = cryptoRandom,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateJoinCode(random);
    if (!(await exists(code))) return code;
  }
  throw new Error("Could not generate a unique join code");
}
