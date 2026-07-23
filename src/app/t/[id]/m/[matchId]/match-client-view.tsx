/**
 * Client wrapper: constructs the RealtimeMatchClient from the seeded snapshot
 * and renders the shared MatchContainer, routing the exit back to the round
 * board. The caller keys this component on the match identity
 * (tournamentId + matchId, see page.tsx) so a param change remounts the
 * component — and rebuilds the client from a fresh seed — instead of this
 * component reaching for stale-vs-fresh comparisons during render. The client
 * is torn down on unmount. While the match is still running it guards against
 * closing or reloading the tab, which would drop the player out of a live
 * match their team is depending on. It also hears the tournament channel,
 * which broadcasts both on round start and on round completion, and heals a
 * missed broadcast on restore: every viewer polls their server-decided
 * Placement and acts on it — into their new match, back to the board on a
 * bye, or not at all when the answer is "stay". The server's placement
 * already keeps a spectator watching a match they aren't rostered on put, so
 * the client never needs to judge who counts as a roster member itself. The
 * restore path only ever fires once this match is complete, so a tab-focus
 * event can never interrupt a live match.
 */
"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { MatchContainer } from "@/components/match/MatchContainer";
import { RealtimeMatchClient } from "@/lib/match/realtime-client";
import type { MatchView } from "@/lib/match/client";
import { derivePhase } from "@/lib/match/derive";
import { subscribeToTournament } from "@/lib/realtime/subscribe";
import { useWipeNav } from "@/components/wipe/use-wipe-nav";
import { useRefreshOnRestore } from "../../use-refresh-on-restore";
import { markMatchEntered } from "@/lib/match/nav-marker";
import type { Placement } from "@/lib/tournament/placement";

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
  const { navigate } = useWipeNav();

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

  // Stable across renders (tournamentId/matchId are constant for this
  // component's lifetime — see the header comment on remounting via key), so
  // it can drive both the live broadcast subscription and the restore path
  // below without either re-arming on every render.
  const checkPlacement = useCallback(async () => {
    const res = await fetch(`/api/tournaments/${tournamentId}/placement`);
    if (!res.ok) return;
    const placement = (await res.json()) as Placement;
    // "stay" covers a round completing (nothing to move to yet) and a viewer
    // the server has decided not to move at all — either way the current
    // screen must not be touched.
    if (placement.kind === "stay") return;
    if (placement.kind === "match") {
      if (placement.matchId === matchId) return;
      // Mark the destination match as already entered so, once it ends
      // too, backing out to the board doesn't let auto-pull yank the
      // player back in — see nav-marker.ts.
      markMatchEntered(placement.matchId);
      navigate(`/t/${tournamentId}/m/${placement.matchId}`, {
        label: "Your match",
      });
      return;
    }
    navigate(`/t/${tournamentId}`, { label: "Board" });
  }, [tournamentId, matchId, navigate]);

  useEffect(() => {
    const unsubscribe = subscribeToTournament(tournamentId, () => {
      void checkPlacement();
    });
    return unsubscribe;
  }, [tournamentId, checkPlacement]);

  // A missed broadcast (tab backgrounded during the between-rounds gap)
  // would otherwise strand the viewer on a dead end screen forever, since
  // nothing else re-checks placement. Gated on the match already being
  // complete so a tab-focus event can never interrupt a live match: a viewer
  // watching or playing a live match must only ever be moved by the
  // broadcast above.
  useRefreshOnRestore(
    useCallback(() => {
      if (!isMatchLive) void checkPlacement();
    }, [isMatchLive, checkPlacement]),
  );

  return (
    <MatchContainer
      client={client}
      onExit={() => router.push(`/t/${tournamentId}`)}
    />
  );
}
