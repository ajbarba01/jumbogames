/**
 * Client wrapper: constructs the RealtimeMatchClient from the seeded snapshot
 * and renders the shared MatchContainer, routing the exit back to the round
 * board. The caller keys this component on the match identity
 * (tournamentId + matchId, see page.tsx) so a param change remounts the
 * component — and rebuilds the client from a fresh seed — instead of this
 * component reaching for stale-vs-fresh comparisons during render. The client
 * is torn down on unmount. While the match is still running it guards against
 * closing or reloading the tab, which would drop the player out of a live
 * match their team is depending on.
 */
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { MatchContainer } from "@/components/match/MatchContainer";
import { RealtimeMatchClient } from "@/lib/match/realtime-client";
import type { MatchView } from "@/lib/match/client";
import { derivePhase } from "@/lib/match/derive";

export function MatchClientView({
  initialView,
  serverNow,
  tournamentId,
  matchId,
}: {
  initialView: MatchView;
  serverNow: number;
  tournamentId: string;
  matchId: string;
}): React.JSX.Element {
  const router = useRouter();

  // Lazy-init runs once on mount, seeding from initialView; it never re-runs
  // on prop changes (remount via key handles that — see the header comment).
  // The constructor is side-effect-free; start() begins IO here so a
  // StrictMode/Fast-Refresh double-invoked initializer cannot leak a live
  // client (see RealtimeMatchClient.start).
  const [client] = useState(
    () =>
      new RealtimeMatchClient(initialView, {
        tournamentId,
        matchId,
        serverNow,
      }),
  );
  useEffect(() => {
    client.start();
    return () => client.destroy();
  }, [client]);

  const view = useSyncExternalStore(
    (cb) => client.subscribe(cb),
    () => client.getView(),
    () => client.getView(),
  );
  const isMatchLive = derivePhase(view.match).kind !== "complete";

  useEffect(() => {
    if (!isMatchLive) return;
    // preventDefault is the specified signal; returnValue is deprecated but
    // still what some engines actually read. Setting both keeps the prompt
    // from being silently skipped. In-app exits go through the router and
    // never reach this event, which is why leaving via the end screen is
    // unguarded by construction.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isMatchLive]);

  return (
    <MatchContainer
      client={client}
      onExit={() => router.push(`/t/${tournamentId}`)}
    />
  );
}
