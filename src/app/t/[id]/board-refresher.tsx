/**
 * Client wrapper that keeps a server-rendered board live: it subscribes to the
 * tournament's Realtime channel and refreshes the route on every broadcast, so
 * the server component re-renders with fresh state. It also refreshes whenever
 * the browser restores the page, which would otherwise show a stale snapshot
 * until the next broadcast. Renders its children untouched and holds no board
 * state itself.
 */
"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribeToTournament } from "@/lib/realtime/subscribe";
import { useRefreshOnRestore } from "./use-refresh-on-restore";

export function BoardRefresher({
  tournamentId,
  children,
}: {
  tournamentId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = subscribeToTournament(tournamentId, () => {
      router.refresh();
    });
    return unsubscribe;
  }, [tournamentId, router]);

  useRefreshOnRestore(useCallback(() => router.refresh(), [router]));

  return <>{children}</>;
}
