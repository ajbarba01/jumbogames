/**
 * Host-only board control: ends a running tournament behind a confirm. The
 * mutation goes through the complete route (server-authoritative); on success it
 * refreshes so the server re-renders the board in its ended state. Realtime then
 * flips every other viewer's board the same way.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog } from "@jumbo/ui";

export function BoardHostControls({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function end() {
    setBusy(true);
    const res = await fetch(`/api/tournaments/${tournamentId}/complete`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    }
    // On failure the dialog stays open; a stale phase 409s and the next
    // broadcast refreshes the board anyway.
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        End tournament
      </Button>
      <ConfirmDialog
        open={open}
        title="End tournament?"
        description="Standings freeze and the board shows the final result for everyone."
        confirmLabel="End tournament"
        busy={busy}
        onConfirm={() => void end()}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
