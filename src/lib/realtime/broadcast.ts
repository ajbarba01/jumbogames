/**
 * Server-side Realtime broadcast. Route handlers call this after mutating a
 * tournament so subscribed clients refetch. Uses httpSend (REST) so a stateless
 * handler holds no WebSocket open. Read-side transport only: the payload
 * carries no authoritative state, just a signal to refetch.
 */
import { createClient } from "@/lib/supabase/server";
import { tournamentChannel, TOURNAMENT_CHANGE_EVENT } from "./channels";

export async function broadcastTournamentChange(
  tournamentId: string,
): Promise<void> {
  const supabase = await createClient();
  const channel = supabase.channel(tournamentChannel(tournamentId));
  try {
    await channel.httpSend(TOURNAMENT_CHANGE_EVENT, { tournamentId });
  } catch {
    // Best-effort liveness. The database is the source of truth; a dropped ping
    // just means clients refresh on their next fetch. A persisted mutation must
    // never fail because the realtime hop did.
  } finally {
    await supabase.removeChannel(channel);
  }
}
