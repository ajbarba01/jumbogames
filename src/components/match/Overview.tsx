/**
 * Match overview — home base between minigames: both teams, the wins tally,
 * and the K preview cards (up next / live / scored / locked). The lit card
 * is the gate's zoom target; cards share layoutIds with the zoom frame.
 */
"use client";

import { motion } from "motion/react";
import type { MatchView } from "@/lib/match/client";
import { derivePhase, minigamesWon } from "@/lib/match/derive";
import type { MatchState, MatchTeam, SlotState } from "@/lib/match/types";
import { MINIGAMES } from "@/lib/minigames/registry";

function TeamBadge({ team }: { team: MatchTeam }): React.JSX.Element {
  return (
    <span className="flex items-center gap-2.5 font-display text-2xl text-s12">
      <span
        className="h-4 w-4 flex-none rounded-r1"
        style={{ background: `var(--color-team-${team.colorIndex})` }}
        aria-hidden
      />
      {team.name}
    </span>
  );
}

function SlotCard({
  slot,
  match,
  isNext,
  onEnter,
}: {
  slot: SlotState;
  match: MatchState;
  isNext: boolean;
  onEnter: (ordinal: number) => void;
}): React.JSX.Element {
  const game = MINIGAMES[slot.kind];
  const winnerTeam =
    slot.winner === "A"
      ? match.teamA
      : slot.winner === "B"
        ? match.teamB
        : null;
  const enterable = isNext && slot.phase === "gate";

  return (
    <motion.button
      layoutId={`slot-card-${slot.ordinal}`}
      type="button"
      onClick={() => enterable && onEnter(slot.ordinal)}
      disabled={!enterable}
      className={`sticker flex h-40 w-52 flex-col items-center justify-center gap-2 rounded-r2 border-s11 bg-s2 p-4 ${
        enterable
          ? "sticker-hover sticker-press cursor-pointer"
          : slot.phase === "upcoming"
            ? "opacity-50"
            : ""
      }`}
    >
      <span className="font-display text-lg text-s12">{game.title}</span>
      {slot.phase === "done" && (
        <span className="flex items-center gap-2 text-s11">
          {winnerTeam ? (
            <>
              <span
                className="h-3 w-3 rounded-r1"
                style={{
                  background: `var(--color-team-${winnerTeam.colorIndex})`,
                }}
                aria-hidden
              />
              {winnerTeam.name} · {(slot.normA ?? 0).toFixed(1)}–
              {(slot.normB ?? 0).toFixed(1)}
            </>
          ) : (
            <>Tie · {(slot.normA ?? 0).toFixed(1)} each</>
          )}
        </span>
      )}
      {enterable && <span className="text-sec text-s10">UP NEXT — enter</span>}
      {slot.phase === "upcoming" && <span className="text-s9">locked</span>}
    </motion.button>
  );
}

export function Overview({
  view,
  onEnter,
}: {
  view: MatchView;
  onEnter: (ordinal: number) => void;
}): React.JSX.Element {
  const { match } = view;
  const tally = minigamesWon(match);
  const phase = derivePhase(match);
  const activeOrdinal = phase.kind === "slot" ? phase.slot.ordinal : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 p-8">
      <header className="flex items-center gap-6">
        <TeamBadge team={match.teamA} />
        <span className="font-display text-5xl text-s12">
          {tally.a}–{tally.b}
        </span>
        <TeamBadge team={match.teamB} />
      </header>
      <div className="flex flex-wrap items-center justify-center gap-6">
        {match.slots.map((slot) => (
          <SlotCard
            key={slot.ordinal}
            slot={slot}
            match={match}
            isNext={slot.ordinal === activeOrdinal}
            onEnter={onEnter}
          />
        ))}
      </div>
      <p className="text-s10">
        {[...match.teamA.members, ...match.teamB.members]
          .map((id) => view.playerLabels[id] ?? id)
          .join(" · ")}
      </p>
    </div>
  );
}
