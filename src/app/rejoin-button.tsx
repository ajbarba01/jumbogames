/**
 * Home rejoin entry: routes a viewer back into the game they are already in,
 * naming that game on the button itself. It sits above the join hero in
 * accent-2 — a CTA that seconds the join hero's accent rather than competing
 * with it. A client control because it navigates through the slam wipe (crossing
 * back into the tournament surface is a game beat); the home page decides when
 * to show it (whenever the viewer has a non-complete tournament).
 */
"use client";

import { Button } from "@jumbo/ui";
import { useWipeNav } from "@/components/wipe/use-wipe-nav";

export function RejoinButton({
  tournamentId,
  tournamentName,
}: {
  tournamentId: string;
  tournamentName: string;
}) {
  const { navigate } = useWipeNav();
  return (
    <Button
      variant="second"
      // A game name has no length limit, so the label clips rather than
      // wrapping the button or pushing the page past the floor width.
      className="w-full truncate"
      onClick={() => navigate(`/t/${tournamentId}`)}
    >
      Rejoin {tournamentName}
    </Button>
  );
}
