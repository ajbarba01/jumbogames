/**
 * Home host entry: routes to /host, where the create card lives. Shown to every
 * signed-in user (the create route stays admin-gated until hosting opens in a
 * later slice; a player who clicks it is silently returned home). A client
 * control because it navigates.
 */
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@jumbo/ui";

export function CreateTournamentButton() {
  const router = useRouter();
  return (
    <Button variant="outline" onClick={() => router.push("/host")}>
      Create an event
    </Button>
  );
}
