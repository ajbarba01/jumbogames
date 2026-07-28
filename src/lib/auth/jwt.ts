/**
 * Local verification of Supabase access tokens. Replaces a per-request network
 * call to Supabase Auth (`auth.getUser()`) with an in-process signature check
 * against the project's cached JWKS. Accepts a bounded revocation window —
 * access tokens are short-lived — in exchange for removing a network hop from
 * every authenticated request (DESIGN.md decision 24).
 */
import {
  createLocalJWKSet,
  createRemoteJWKSet,
  jwtVerify,
  type JSONWebKeySet,
} from "jose";

export interface VerifiedToken {
  sub: string;
  email: string;
}

type KeyResolver = Parameters<typeof jwtVerify>[1];

let override: KeyResolver | null = null;
let remote: KeyResolver | null = null;

/** Test seam: swap the remote key set for a fixed one. Never used in app code. */
export function __setJwksForTest(jwks: JSONWebKeySet): void {
  override = createLocalJWKSet(jwks);
}

function keys(): KeyResolver {
  if (override) return override;
  if (!remote) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
    // Supabase edge-caches this endpoint for 10 minutes; jose caches in-process
    // on top, so key rotation is picked up without a per-request fetch.
    remote = createRemoteJWKSet(new URL("/auth/v1/.well-known/jwks.json", url));
  }
  return remote;
}

export async function verifyAccessToken(
  token: string,
): Promise<VerifiedToken | null> {
  try {
    const { payload } = await jwtVerify(token, keys());
    const { sub, email } = payload;
    if (typeof sub !== "string" || typeof email !== "string") return null;
    return { sub, email };
  } catch {
    // Any failure — bad signature, expiry, malformed, unreachable JWKS — is an
    // unauthenticated request. Never log the token or the reason: a verification
    // failure message can leak token structure (security floor, AGENTS.md).
    return null;
  }
}
