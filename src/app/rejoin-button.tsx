/**
 * Home rejoin entry: routes a viewer back into the game they are already in.
 * A client control because it navigates through the slam wipe (crossing back
 * into the tournament surface is a game beat); the home page decides when to
 * show it (whenever the viewer has a non-complete tournament).
 */
"use client";

import { Button } from "@jumbo/ui";
import { useWipeNav } from "@/components/wipe/use-wipe-nav";

export function RejoinButton({ tournamentId }: { tournamentId: string }) {
  const { navigate } = useWipeNav();
  return (
    <Button variant="quiet" onClick={() => navigate(`/t/${tournamentId}`)}>
      Rejoin
    </Button>
  );
}
