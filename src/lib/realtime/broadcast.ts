/**
 * Server-side Realtime broadcast. Route handlers call this after mutating a
 * tournament so subscribed clients refetch. Uses httpSend (REST) so a stateless
 * handler holds no WebSocket open. Read-side transport only: the payload
 * carries no authoritative state, just a signal to refetch.
 */
import { createClient } from "@/lib/supabase/server";
import {
  tournamentChannel,
  TOURNAMENT_CHANGE_EVENT,
  matchChannel,
  MATCH_CHANGE_EVENT,
} from "./channels";

export async function broadcastTournamentChange(
  tournamentId: string,
): Promise<void> {
  const supabase = await createClient();
  const channelName = tournamentChannel(tournamentId);
  const channel = supabase.channel(channelName);
  try {
    await channel.httpSend(TOURNAMENT_CHANGE_EVENT, { tournamentId });
  } catch {
    console.error("[realtime] broadcast failed", channelName);
    // Best-effort liveness. The database is the source of truth; a dropped ping
    // just means clients refresh on their next fetch. A persisted mutation must
    // never fail because the realtime hop did.
  } finally {
    await supabase.removeChannel(channel);
  }
}

export async function broadcastMatchChange(matchId: string): Promise<void> {
  const supabase = await createClient();
  const channelName = matchChannel(matchId);
  const channel = supabase.channel(channelName);
  try {
    await channel.httpSend(MATCH_CHANGE_EVENT, { matchId });
  } catch {
    console.error("[realtime] broadcast failed", channelName);
    // Best-effort liveness; the database is the source of truth. A dropped ping
    // just means clients refetch on their next interaction.
  } finally {
    await supabase.removeChannel(channel);
  }
}
