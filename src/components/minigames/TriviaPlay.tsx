/**
 * Trivia tug-of-war play surface: the rope's live position (client-decayed
 * between server ticks), the viewer's own question with four answer choices,
 * and a spectator fallback for viewers with no hand. Structural only — visual
 * design for this surface is a separate, later effort.
 */
"use client";

import { Button } from "@jumbo/ui";
import type { MatchView } from "@/lib/match/client";
import { normalizeTeamScore } from "@/lib/match/normalize";
import type { SlotState } from "@/lib/match/types";
import { decayRope } from "@/lib/minigames/trivia/rope";
import type { TriviaView } from "@/lib/minigames/trivia/view";
import { useNow } from "@/components/match/use-now";

export function TriviaPlay({
  slot,
  canAct,
  onAction,
  offsetMs,
}: {
  view: MatchView;
  slot: SlotState;
  canAct: boolean;
  onAction: (action: unknown) => void;
  offsetMs: number;
}): React.JSX.Element {
  const now = useNow();
  const serverNow = now + offsetMs;
  const payload = slot.payload as TriviaView;
  const snapshot = slot.snapshot ?? { teamA: [], teamB: [] };
  const rope = decayRope(payload.rope, serverNow);
  // p is +1 at team A's wall, -1 at team B's; A reads on the left below.
  const markerPercent = ((1 - rope.p) / 2) * 100;
  const meanA = normalizeTeamScore(payload.scores, snapshot.teamA);
  const meanB = normalizeTeamScore(payload.scores, snapshot.teamB);
  const remaining = Math.max(
    0,
    Math.ceil(((slot.deadline ?? serverNow) - serverNow) / 1000),
  );
  const question = payload.question;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <p className="font-display text-2xl text-s12">{remaining}s</p>
      <div className="flex items-center gap-8 font-display text-2xl text-s12">
        <span>{meanA.toFixed(1)}</span>
        <span className="text-s9">vs</span>
        <span>{meanB.toFixed(1)}</span>
      </div>
      <div className="relative h-3 w-full max-w-md rounded-r1 border-2 border-s6 bg-s3">
        <div
          className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-r1 border-2 border-s12 bg-s11"
          style={{ left: `${markerPercent}%` }}
          aria-hidden
        />
      </div>
      {question ? (
        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <p className="text-center text-body text-s12">{question.prompt}</p>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            {question.choices.map((choice, choiceIndex) => (
              <Button
                key={choiceIndex}
                variant="block"
                disabled={!canAct}
                onClick={() =>
                  onAction({
                    type: "answer",
                    deckIndex: question.deckIndex,
                    choiceIndex,
                  })
                }
              >
                {choice}
              </Button>
            ))}
          </div>
          {payload.lastResult && (
            <p className="font-bold text-s11">
              {payload.lastResult === "correct" ? "Correct" : "Wrong"}
            </p>
          )}
        </div>
      ) : (
        <p className="text-s10">No hand to play — spectating this game.</p>
      )}
    </div>
  );
}
