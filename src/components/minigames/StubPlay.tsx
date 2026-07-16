/**
 * Stub minigame play surface: one mash button, live team means, and the
 * remaining play time. Spectators see everything with the button disabled.
 */
"use client";

import { Button } from "@jumbo/ui";
import type { MatchView } from "@/lib/match/client";
import { normalizeTeamScore } from "@/lib/match/normalize";
import type { SlotState } from "@/lib/match/types";
import type { StubState } from "@/lib/minigames/stub/server";
import { useNow } from "@/components/match/use-now";

export function StubPlay({
  view,
  slot,
  canAct,
  onAction,
}: {
  view: MatchView;
  slot: SlotState;
  canAct: boolean;
  onAction: (action: unknown) => void;
}): React.JSX.Element {
  const now = useNow();
  const payload = slot.payload as StubState;
  const snapshot = slot.snapshot ?? { teamA: [], teamB: [] };
  const meanA = normalizeTeamScore(payload.counts, snapshot.teamA);
  const meanB = normalizeTeamScore(payload.counts, snapshot.teamB);
  const remaining = Math.max(
    0,
    Math.ceil(((slot.deadline ?? now) - now) / 1000),
  );
  const myCount =
    view.viewerId !== null ? (payload.counts[view.viewerId] ?? 0) : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <p className="font-display text-2xl text-s12">{remaining}s</p>
      <div className="flex items-center gap-8 font-display text-4xl text-s12">
        <span>{meanA.toFixed(1)}</span>
        <span className="text-s9">vs</span>
        <span>{meanB.toFixed(1)}</span>
      </div>
      <Button onClick={() => onAction({ type: "mash" })} disabled={!canAct}>
        MASH
      </Button>
      {myCount !== null && <p className="text-s10">You: {myCount}</p>}
    </div>
  );
}
