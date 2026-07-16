/**
 * Minigame gate: instructions plus both rosters filling in ready checks.
 * The ready button is the gate's only verb; hosts force-start via valves
 * outside this panel.
 */
"use client";

import { Button } from "@jumbo/ui";
import type { MatchView } from "@/lib/match/client";
import type { MatchTeam, SlotState } from "@/lib/match/types";
import { MINIGAMES } from "@/lib/minigames/registry";

function ReadyColumn({
  team,
  readySet,
  labels,
}: {
  team: MatchTeam;
  readySet: Set<string>;
  labels: Record<string, string>;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2 font-bold text-s12">
        <span
          className="h-3 w-3 rounded-r1"
          style={{ background: `var(--color-team-${team.colorIndex})` }}
          aria-hidden
        />
        {team.name}
      </span>
      {team.members.map((id) => (
        <span key={id} className="flex items-center gap-2 text-s11">
          <span aria-hidden>{readySet.has(id) ? "✓" : "·"}</span>
          {labels[id] ?? id}
        </span>
      ))}
    </div>
  );
}

export function GatePanel({
  view,
  slot,
  onReady,
}: {
  view: MatchView;
  slot: SlotState;
  onReady: () => void;
}): React.JSX.Element {
  const game = MINIGAMES[slot.kind];
  const readySet = new Set(slot.ready);
  const isReady = view.viewerId !== null && readySet.has(view.viewerId);
  const canReady = view.role === "player" && view.viewerId !== null && !isReady;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h2 className="font-display text-3xl text-s12">{game.title}</h2>
      <p className="max-w-md text-center text-s11">{game.instructions}</p>
      <div className="flex gap-12">
        <ReadyColumn
          team={view.match.teamA}
          readySet={readySet}
          labels={view.playerLabels}
        />
        <ReadyColumn
          team={view.match.teamB}
          readySet={readySet}
          labels={view.playerLabels}
        />
      </div>
      <Button onClick={onReady} disabled={!canReady}>
        {isReady ? "Waiting for others…" : canReady ? "Ready" : "Spectating"}
      </Button>
    </div>
  );
}
