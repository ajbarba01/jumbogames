/**
 * Match end screen: the K results, the minigame tally, and the one exit
 * back to the round board. Dismissed individually; a round start force-
 * yields it (the container's owner handles navigation).
 */
"use client";

import { Button } from "@jumbo/ui";
import type { MatchView } from "@/lib/match/client";
import { minigamesWon } from "@/lib/match/derive";
import { MINIGAMES } from "@/lib/minigames/registry";

export function EndScreen({
  view,
  onExit,
}: {
  view: MatchView;
  onExit?: () => void;
}): React.JSX.Element {
  const { match } = view;
  const tally = minigamesWon(match);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 p-8">
      <h2 className="font-display text-4xl text-s12">Match complete</h2>
      <p className="font-display text-2xl text-s11">
        {match.teamA.name} {tally.a} – {tally.b} {match.teamB.name}
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        {match.slots.map((slot) => {
          const winnerTeam =
            slot.winner === "A"
              ? match.teamA
              : slot.winner === "B"
                ? match.teamB
                : null;
          return (
            <div
              key={slot.ordinal}
              className="sticker flex flex-col items-center gap-2 rounded-r2 border-s11 bg-s2 p-4"
            >
              <span className="font-display text-s12">
                {MINIGAMES[slot.kind].title}
              </span>
              <span className="text-s11">
                {winnerTeam ? `${winnerTeam.name} won` : "Tie"} ·{" "}
                {(slot.normA ?? 0).toFixed(1)}–{(slot.normB ?? 0).toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
      <Button onClick={onExit}>Back to round board</Button>
    </div>
  );
}
