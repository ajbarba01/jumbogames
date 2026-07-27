/**
 * Unit tests for local access-token verification: a well-formed token signed by
 * the project's key verifies to its subject, and tampered or expired tokens
 * return null rather than throwing.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { SignJWT, generateKeyPair, exportJWK } from "jose";
import { verifyAccessToken, __setJwksForTest } from "./jwt";

describe("verifyAccessToken", () => {
  let privateKey: CryptoKey;

  beforeEach(async () => {
    const pair = await generateKeyPair("ES256", { extractable: true });
    privateKey = pair.privateKey;
    const jwk = await exportJWK(pair.publicKey);
    __setJwksForTest({ keys: [{ ...jwk, alg: "ES256", kid: "test-key" }] });
  });

  const sign = (claims: Record<string, unknown>, exp: string) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", kid: "test-key" })
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(privateKey);

  it("returns the subject and email for a valid token", async () => {
    const token = await sign({ sub: "user-1", email: "a@b.com" }, "1h");
    await expect(verifyAccessToken(token)).resolves.toEqual({
      sub: "user-1",
      email: "a@b.com",
    });
  });

  it("returns null for an expired token", async () => {
    const token = await sign({ sub: "user-1", email: "a@b.com" }, "-1s");
    await expect(verifyAccessToken(token)).resolves.toBeNull();
  });

  it("returns null for a token with a tampered payload", async () => {
    const token = await sign({ sub: "user-1", email: "a@b.com" }, "1h");
    const [header, , signature] = token.split(".");
    const forged = btoa(JSON.stringify({ sub: "attacker", email: "x@y.com" }))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    await expect(
      verifyAccessToken(`${header}.${forged}.${signature}`),
    ).resolves.toBeNull();
  });

  it("returns null for a token missing an email claim", async () => {
    const token = await sign({ sub: "user-1" }, "1h");
    await expect(verifyAccessToken(token)).resolves.toBeNull();
  });
});
