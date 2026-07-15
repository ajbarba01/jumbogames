/**
 * Realtime channel naming and event names. One convention so the server
 * broadcaster and the client subscriber cannot drift. Pure strings, no IO.
 */

/** The per-tournament channel every lobby, board, and spectator surface joins. */
export function tournamentChannel(tournamentId: string): string {
  return `tournament:${tournamentId}`;
}

/** Presence channel for the lobby — tracks who is currently viewing it, so the
 *  lobby can show participants who have arrived but not yet joined a team. This
 *  is ephemeral liveness, never authoritative state. */
export function lobbyPresenceChannel(tournamentId: string): string {
  return `presence:tournament:${tournamentId}`;
}

// Broadcast after any server-side mutation to a tournament; subscribers treat
// it as "refetch the canonical state" rather than trusting the payload.
export const TOURNAMENT_CHANGE_EVENT = "change";
