/**
 * Short-lived signed tickets authorizing one WebSocket connection to one match.
 * Minted by Next (which holds the session) and verified by the Worker, so the
 * long-lived Supabase access token never travels in a URL. Implemented in the
 * ticket task; this module defines the claim shape it signs over.
 */
export interface TicketClaims {
  matchId: string;
  profileId: string;
  /** Seconds since epoch. Verifiers reject a ticket at or past this instant. */
  exp: number;
}
