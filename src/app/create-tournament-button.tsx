/**
 * Home create entry: routes to /create, where the create card lives. Shown to
 * every signed-in user — hosting is a per-game role held by the creator, not a
 * privilege. A client control because it navigates.
 */
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@jumbo/ui";

export function CreateTournamentButton() {
  const router = useRouter();
  return (
    <Button variant="outline" onClick={() => router.push("/create")}>
      Create a game
    </Button>
  );
}
