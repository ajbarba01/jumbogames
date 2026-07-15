/**
 * Home rejoin entry: routes a viewer back into the game they are already in.
 * A client control because it navigates; the home page decides when to show it
 * (whenever the viewer has a non-complete tournament).
 */
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@jumbo/ui";

export function RejoinButton({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  return (
    <Button variant="quiet" onClick={() => router.push(`/t/${tournamentId}`)}>
      Rejoin
    </Button>
  );
}
