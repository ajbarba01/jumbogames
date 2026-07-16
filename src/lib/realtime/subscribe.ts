/**
 * Client-side subscription to a tournament's Realtime channel. Fires onChange
 * for every server-broadcast change so the caller refetches canonical state.
 * Returns an unsubscribe function. Read-only: clients never write via Realtime.
 */
"use client";

import { createClient } from "@/lib/supabase/client";
import {
  tournamentChannel,
  TOURNAMENT_CHANGE_EVENT,
  matchChannel,
  MATCH_CHANGE_EVENT,
} from "./channels";

export function subscribeToTournament(
  tournamentId: string,
  onChange: () => void,
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(tournamentChannel(tournamentId))
    .on("broadcast", { event: TOURNAMENT_CHANGE_EVENT }, () => onChange())
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToMatch(
  matchId: string,
  onChange: () => void,
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(matchChannel(matchId))
    .on("broadcast", { event: MATCH_CHANGE_EVENT }, () => onChange())
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
