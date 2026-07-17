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
  const topic = tournamentChannel(tournamentId);
  const channel = supabase
    .channel(topic)
    .on("broadcast", { event: TOURNAMENT_CHANGE_EVENT }, () => onChange())
    .subscribe((status: string) => {
      // SUBSCRIBED is the healthy path; CLOSED is our own teardown. Anything
      // else (CHANNEL_ERROR, TIMED_OUT) means the client is not receiving
      // pings and is silently relying on the heartbeat — surface it.
      if (status !== "SUBSCRIBED" && status !== "CLOSED") {
        console.warn("[realtime] channel status", topic, status);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToMatch(
  matchId: string,
  onChange: () => void,
): () => void {
  const supabase = createClient();
  const topic = matchChannel(matchId);
  const channel = supabase
    .channel(topic)
    .on("broadcast", { event: MATCH_CHANGE_EVENT }, () => onChange())
    .subscribe((status: string) => {
      // See subscribeToTournament: anything but SUBSCRIBED/CLOSED means pings
      // are not arriving; the heartbeat covers correctness but log the gap.
      if (status !== "SUBSCRIBED" && status !== "CLOSED") {
        console.warn("[realtime] channel status", topic, status);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
