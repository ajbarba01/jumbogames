/**
 * Per-minigame scoring beat: verdict stamp plus both normalized team totals.
 * Auto-advances server-side (scoringEndsAt) — no interaction here. Team
 * totals only; per-player visibility is a deferred decision.
 */
"use client";

import { motion } from "motion/react";
import { SLIP_DUR, SLIP_EASE, TeamChip } from "@jumbo/ui";
import type { MatchView } from "@/lib/match/client";
import type { SlotState } from "@jumbo/engine";

const STAMP_DELAY_SECONDS = 0.25;

export function ScoringScreen({
  view,
  slot,
}: {
  view: MatchView;
  slot: SlotState;
}): React.JSX.Element {
  const { match } = view;
  const winnerTeam =
    slot.winner === "A"
      ? match.teamA
      : slot.winner === "B"
        ? match.teamB
        : null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <motion.div
        initial={{ scale: 3, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: -3 }}
        transition={{
          delay: STAMP_DELAY_SECONDS,
          duration: SLIP_DUR.move,
          ease: SLIP_EASE,
        }}
        className="sticker max-w-full rounded-r2 border-s11 bg-s2 px-8 py-4"
      >
        <span className="flex min-w-0 items-center gap-3 font-display text-4xl text-s12">
          {winnerTeam ? (
            <>
              <TeamChip
                colorIndex={winnerTeam.colorIndex}
                name={winnerTeam.name}
                size="lg"
              />
              wins
            </>
          ) : (
            "Tie"
          )}
        </span>
      </motion.div>
      <div className="flex items-center gap-8 font-display text-3xl text-s11">
        <span>
          {match.teamA.name} {(slot.normA ?? 0).toFixed(1)}
        </span>
        <span className="text-s9">—</span>
        <span>
          {(slot.normB ?? 0).toFixed(1)} {match.teamB.name}
        </span>
      </div>
    </div>
  );
}
