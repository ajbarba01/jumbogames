/**
 * Short-lived signed tickets authorizing one WebSocket connection to one match.
 * Minted by Next (which holds the session) and verified by the Worker, so the
 * long-lived Supabase access token never travels in a URL. Implemented in the
 * ticket task; this module defines the claim shape it signs over.
 */
import { SignJWT, jwtVerify } from "jose";

export interface TicketClaims {
  matchId: string;
  profileId: string;
  /** Seconds since epoch. Verifiers reject a ticket at or past this instant. */
  exp: number;
}

/** Tickets are single-use in practice and short-lived by design. */
export const TICKET_TTL_SECONDS = 60;

const encode = (secret: string): Uint8Array => new TextEncoder().encode(secret);

export async function signTicket(
  claims: TicketClaims,
  secret: string,
): Promise<string> {
  return new SignJWT({ matchId: claims.matchId, profileId: claims.profileId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(claims.exp)
    .sign(encode(secret));
}

export async function verifyTicket(
  token: string,
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): Promise<TicketClaims | null> {
  try {
    const { payload } = await jwtVerify(token, encode(secret), {
      algorithms: ["HS256"],
      currentDate: new Date(now * 1000),
    });
    const { matchId, profileId, exp } = payload;
    if (
      typeof matchId !== "string" ||
      typeof profileId !== "string" ||
      typeof exp !== "number"
    ) {
      return null;
    }
    return { matchId, profileId, exp };
  } catch {
    // Expired, forged, or malformed — all are simply "no ticket". Never log the
    // token or the failure reason (security floor, AGENTS.md).
    return null;
  }
}
