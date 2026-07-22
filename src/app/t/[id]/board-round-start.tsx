/**
 * Temporary bridge: a host button that starts the earliest pending round via
 * the round-start route, then swaps the board into the started state under the
 * slam wipe. The MC round-start control and auto-pull replace this later and
 * should carry the wipe treatment over.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@jumbo/ui";
import { useWipeNav } from "@/components/wipe/use-wipe-nav";

export function BoardRoundStart({
  tournamentId,
  ordinal,
}: {
  tournamentId: string;
  ordinal: number;
}): React.JSX.Element {
  const router = useRouter();
  const { cover } = useWipeNav();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(
            `/api/tournaments/${tournamentId}/rounds/${ordinal}/start`,
            { method: "POST" },
          );
          // The refresh is dispatched synchronously inside cover() so it lands
          // in the wipe's transition: React only holds isPending — the
          // machine's "committed" signal — for updates scheduled before the
          // action returns, so awaiting the fetch inside cover() would drop
          // the refresh out of the transition and reveal the panel early.
          // The network wait is therefore uncovered; only the swap is covered.
          if (res.ok)
            cover(() => router.refresh(), { label: `Round ${ordinal}` });
        } finally {
          setBusy(false);
        }
      }}
    >
      Start round {ordinal}
    </Button>
  );
}
