/**
 * Home host entry (admins and owners only): routes to /host, where the create
 * card lives. A client control because it navigates; the home page gates it on
 * role before rendering.
 */
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@jumbo/ui";

export function CreateTournamentButton() {
  const router = useRouter();
  return (
    <Button variant="outline" onClick={() => router.push("/host")}>
      Create tournament
    </Button>
  );
}
