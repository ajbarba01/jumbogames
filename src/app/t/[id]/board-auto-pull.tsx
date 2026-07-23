/**
 * Navigates the viewer into their live match once round start assigns one,
 * pulling at most once per match per tab even across back-navigation remounts.
 */
"use client";

import { useEffect } from "react";
import { useWipeNav } from "@/components/wipe/use-wipe-nav";
import { markMatchEntered, wasMatchEntered } from "@/lib/match/nav-marker";

export function BoardAutoPull({
  tournamentId,
  viewerMatchId,
}: {
  tournamentId: string;
  viewerMatchId: string | null;
}): null {
  const { navigate } = useWipeNav();

  useEffect(() => {
    if (viewerMatchId === null) return;

    // Back-navigation out of the match remounts this component against the
    // same viewerMatchId (see use-refresh-on-restore.ts), so a mount-scoped
    // ref can't tell a deliberate exit from a fresh pull. The marker survives
    // the remount but not the tab, so a player who backs out stays out until
    // they close the tab or the match id changes.
    if (wasMatchEntered(viewerMatchId)) return;
    markMatchEntered(viewerMatchId);

    navigate(`/t/${tournamentId}/m/${viewerMatchId}`, { label: "Your match" });
  }, [tournamentId, viewerMatchId, navigate]);

  return null;
}
