/**
 * Minigame gate: what this game is, then both rosters filling in ready checks.
 * The ready button is the gate's only verb; hosts force-start via valves
 * outside this panel.
 *
 * The demo band above the rules is the point of the screen. A player meeting a
 * minigame for the first time will not read a paragraph while their team is
 * checking in, and a paragraph is the worst way to explain a rope that has to
 * be watched to be understood — so the game shows itself running, and the text
 * is the caption underneath. Every minigame supplies one (see the client
 * registry); this panel does not know what is inside it.
 */
"use client";

import { Button, TeamChip } from "@jumbo/ui";
import type { MatchView } from "@/lib/match/client";
import type { MatchTeam, SlotState } from "@jumbo/engine";
import { MINIGAMES } from "@jumbo/engine";
import { MINIGAME_SURFACES } from "@/components/minigames/registry";

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
    <div className="flex min-w-0 flex-col gap-1">
      <TeamChip
        colorIndex={team.colorIndex}
        name={team.name}
        size="sm"
        className="text-s12"
      />
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
  const { Emblem, Demo } = MINIGAME_SURFACES[slot.kind];
  const readySet = new Set(slot.ready);
  const isReady = view.viewerId !== null && readySet.has(view.viewerId);
  const canReady = view.role === "player" && view.viewerId !== null && !isReady;

  return (
    // The gate can outgrow a phone once the demo is in it, so it scrolls. The
    // centring lives on an inner `min-h-full` child rather than on the scroll
    // container: `justify-center` on an overflowing scroll container pushes the
    // top of the content above the scrollable area, where it cannot be reached.
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex min-h-full flex-col items-center justify-center gap-5 p-8">
        <div className="flex items-center gap-3">
          <Emblem className="h-8 w-8 shrink-0 text-s12" />
          <h2 className="font-display text-3xl text-s12">{game.title}</h2>
        </div>

        <Demo teamA={view.match.teamA} teamB={view.match.teamB} />

        <p className="max-w-md text-center text-balance text-s11">
          {game.instructions}
        </p>

        <div className="flex max-w-full gap-12">
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
    </div>
  );
}
