/**
 * Client wrapper: constructs the RealtimeMatchClient from the seeded snapshot
 * and renders the shared MatchContainer, routing the exit back to the round
 * board. The caller keys this component on the match identity
 * (tournamentId + matchId, see page.tsx) so a param change remounts the
 * component — and rebuilds the client from a fresh seed — instead of this
 * component reaching for stale-vs-fresh comparisons during render. The client
 * is torn down on unmount.
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MatchContainer } from "@/components/match/MatchContainer";
import { RealtimeMatchClient } from "@/lib/match/realtime-client";
import type { MatchView } from "@/lib/match/client";

export function MatchClientView({
  initialView,
  tournamentId,
  matchId,
}: {
  initialView: MatchView;
  tournamentId: string;
  matchId: string;
}): React.JSX.Element {
  const router = useRouter();

  // Lazy-init runs once on mount, seeding from initialView; it never re-runs
  // on prop changes (remount via key handles that — see the header comment).
  const [client] = useState(
    () => new RealtimeMatchClient(initialView, { tournamentId, matchId }),
  );
  useEffect(() => () => client.destroy(), [client]);

  return (
    <MatchContainer
      client={client}
      onExit={() => router.push(`/t/${tournamentId}`)}
    />
  );
}
