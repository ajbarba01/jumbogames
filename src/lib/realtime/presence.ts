/**
 * Client-side lobby presence: announces the viewer's identity on the lobby's
 * presence channel and reports the set of everyone currently present, so the
 * lobby can list participants who have arrived but not yet joined a team.
 * Presence is ephemeral liveness only — it never carries authoritative state,
 * and a participant is nothing more than an open lobby tab. Returns unsubscribe.
 */
"use client";

import { createClient } from "@/lib/supabase/client";
import { lobbyPresenceChannel } from "./channels";

export interface LobbyPresence {
  profileId: string;
  email: string;
}

export function subscribeToLobbyPresence(
  tournamentId: string,
  self: LobbyPresence,
  onSync: (present: LobbyPresence[]) => void,
): () => void {
  const supabase = createClient();
  const channel = supabase.channel(lobbyPresenceChannel(tournamentId), {
    config: { presence: { key: self.profileId } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<LobbyPresence>();
      // One entry per person, even across multiple tabs.
      const byId = new Map<string, LobbyPresence>();
      for (const entries of Object.values(state)) {
        for (const entry of entries) {
          byId.set(entry.profileId, {
            profileId: entry.profileId,
            email: entry.email,
          });
        }
      }
      onSync([...byId.values()]);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.track(self);
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
