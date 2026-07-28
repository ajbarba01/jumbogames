/**
 * Mints the short-lived tickets that authorize one WebSocket connection to one
 * match. Next holds the user's session, so it is the only side that can decide
 * who a connection belongs to; the Worker only verifies the signature. Keeping
 * the long-lived Supabase access token out of the socket URL is the point.
 */
import { signTicket, TICKET_TTL_SECONDS } from "@jumbo/protocol";

function secret(): string {
  const value = process.env.REALTIME_TICKET_KEY;
  if (!value) throw new Error("REALTIME_TICKET_KEY is not set");
  return value;
}

export async function issueTicket(
  matchId: string,
  profileId: string,
): Promise<string> {
  return signTicket(
    {
      matchId,
      profileId,
      exp: Math.floor(Date.now() / 1000) + TICKET_TTL_SECONDS,
    },
    secret(),
  );
}

/** The wss:// endpoint for a match room, from the public Worker origin. */
export function socketUrlFor(matchId: string): string {
  const base = process.env.NEXT_PUBLIC_REALTIME_URL;
  if (!base) throw new Error("NEXT_PUBLIC_REALTIME_URL is not set");
  return `${base.replace(/^http/, "ws")}/room/${matchId}`;
}
