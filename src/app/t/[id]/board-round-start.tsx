/**
 * Host's round-start control: starts the earliest pending round via the
 * round-start route, then swaps the board into the started state under the
 * slam wipe. The resulting broadcast is what board auto-pull reacts to on
 * every other viewer's board. On failure — e.g. an empty minigame pool — the
 * route's error string is surfaced next to the button instead of leaving the
 * host to guess why nothing happened.
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
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
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
            if (res.ok) {
              cover(() => router.refresh(), { label: `Round ${ordinal}` });
              return;
            }
            const data = await res.json().catch(() => null);
            setError(data?.error ?? "Something went wrong.");
          } finally {
            setBusy(false);
          }
        }}
      >
        Start round {ordinal}
      </Button>
      {error ? (
        <p className="text-sec text-crit" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
