/**
 * Temporary phase-3 bridge: a host button that starts the earliest pending
 * round via the round-start route. Phase 4 replaces this with the MC round-start
 * control and auto-pull; it exists now only to make the match flow reachable.
 */
"use client";

import { useState } from "react";
import { Button } from "@jumbo/ui";

export function BoardRoundStart({
  tournamentId,
  ordinal,
}: {
  tournamentId: string;
  ordinal: number;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch(
            `/api/tournaments/${tournamentId}/rounds/${ordinal}/start`,
            { method: "POST" },
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      Start round {ordinal}
    </Button>
  );
}
