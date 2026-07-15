/**
 * Client wrapper that keeps a server-rendered board live: it subscribes to the
 * tournament's Realtime channel and refreshes the route on every broadcast, so
 * the server component re-renders with fresh state. Renders its children
 * untouched and holds no board state itself.
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribeToTournament } from "@/lib/realtime/subscribe";

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

  return <>{children}</>;
}
