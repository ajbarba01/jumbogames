/**
 * Match home — the screen between minigames, and the screen the round reveal
 * plays on. Both teams, the wins tally, the K slot cards, and the roster.
 *
 * The reveal is not a separate surface. It used to be, and the cards morphed
 * from one layout into the other by shared element, which meant they landed in
 * a different place than they span in — a lurch at the exact beat that is
 * supposed to feel decisive. Here the cards are laid out once, in their final
 * positions, and the reveal only changes what is *inside* them: reels spin, the
 * chrome around them is hidden, and on settle the chrome fades in over cards
 * that never moved. The jolt is not tuned out, it is unrepresentable.
 *
 * Card size scales inversely with K: one minigame is a hero, four are a row of
 * quarters. The lit card is still the gate's zoom target and still shares a
 * layoutId with the zoom frame.
 */
"use client";

import { motion } from "motion/react";
import { cx, SLIP_EASE, TeamChip } from "@jumbo/ui";
import type { MatchView } from "@/lib/match/client";
import { derivePhase, minigamesWon } from "@jumbo/engine";
import type { MatchState, MinigameKind, SlotState } from "@jumbo/engine";
import { MINIGAMES } from "@jumbo/engine";
import { MinigameEmblem } from "@/components/minigames/registry";

const REEL_PASSES = 3;
const REEL_BASE_SECONDS = 1.2;
const REEL_STAGGER_SECONDS = 0.35;

/**
 * The inverse ramp, one row per K. Widths are on the container so the cards
 * stay equal 1fr columns; the column counts re-form at the floor, which is the
 * fluid law's sanctioned use of a breakpoint — four cards abreast is not a
 * squeeze at 375px, it is a different layout. Class strings are literal so the
 * Tailwind scanner can see them.
 */
const SLOT_LAYOUT: Record<
  number,
  { width: string; cols: string; title: string }
> = {
  1: { width: "max-w-md", cols: "grid-cols-1", title: "text-2xl" },
  2: { width: "max-w-2xl", cols: "grid-cols-2", title: "text-xl" },
  3: {
    width: "max-w-3xl",
    cols: "grid-cols-2 sm:grid-cols-3",
    title: "text-lg",
  },
  4: {
    width: "max-w-4xl",
    cols: "grid-cols-2 sm:grid-cols-4",
    title: "text-lg",
  },
};

function layoutFor(count: number): {
  width: string;
  cols: string;
  title: string;
} {
  return SLOT_LAYOUT[count] ?? SLOT_LAYOUT[4];
}

/**
 * One reel: the pool's emblems scrolling past, settling on the drawn kind.
 * Travel is expressed as a percentage of the strip's own box rather than in rem
 * so it follows the card's fluid height instead of pinning it to a fixed one.
 */
function Reel({
  kind,
  index,
  onSettled,
}: {
  kind: MinigameKind;
  index: number;
  onSettled: () => void;
}): React.JSX.Element {
  const kinds = Object.keys(MINIGAMES) as MinigameKind[];
  const strip = Array.from({ length: REEL_PASSES }, () => kinds)
    .flat()
    .concat(kind);

  return (
    <div className="h-full w-full overflow-hidden">
      <motion.div
        className="grid h-full"
        style={{ gridTemplateRows: `repeat(${strip.length}, 100%)` }}
        initial={{ y: 0 }}
        animate={{ y: `-${(strip.length - 1) * 100}%` }}
        transition={{
          duration: REEL_BASE_SECONDS + index * REEL_STAGGER_SECONDS,
          ease: SLIP_EASE,
        }}
        onAnimationComplete={onSettled}
      >
        {strip.map((stripKind, i) => (
          <div key={i} className="flex items-center justify-center">
            <MinigameEmblem kind={stripKind} className="w-1/3 text-s12" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/** The settled face: emblem over title, plus whatever the phase has to say. */
function SlotFace({
  slot,
  match,
  enterable,
  titleClass,
}: {
  slot: SlotState;
  match: MatchState;
  enterable: boolean;
  titleClass: string;
}): React.JSX.Element {
  const game = MINIGAMES[slot.kind];
  const winnerTeam =
    slot.winner === "A"
      ? match.teamA
      : slot.winner === "B"
        ? match.teamB
        : null;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
      <MinigameEmblem kind={slot.kind} className="w-1/3 text-s12" />
      <span className={cx("font-display text-s12", titleClass)}>
        {game.title}
      </span>
      {slot.phase === "done" && (
        <span className="flex items-center gap-2 text-s11">
          {winnerTeam ? (
            <>
              <span
                className="h-3 w-3 shrink-0 rounded-r1"
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
    </div>
  );
}

function SlotCard({
  slot,
  match,
  isNext,
  revealing,
  titleClass,
  onEnter,
  onReelSettled,
  reelIndex,
}: {
  slot: SlotState;
  match: MatchState;
  isNext: boolean;
  revealing: boolean;
  titleClass: string;
  onEnter: (ordinal: number) => void;
  onReelSettled: () => void;
  reelIndex: number;
}): React.JSX.Element {
  const enterable = !revealing && isNext && slot.phase === "gate";

  return (
    <motion.button
      layoutId={`slot-card-${slot.ordinal}`}
      type="button"
      onClick={() => enterable && onEnter(slot.ordinal)}
      disabled={!enterable}
      className={cx(
        "sticker aspect-5/4 w-full overflow-hidden rounded-r2 border-s11 bg-s2",
        enterable && "sticker-hover sticker-press cursor-pointer",
        !revealing && slot.phase === "upcoming" && "opacity-50",
      )}
    >
      {revealing ? (
        <Reel kind={slot.kind} index={reelIndex} onSettled={onReelSettled} />
      ) : (
        <SlotFace
          slot={slot}
          match={match}
          enterable={enterable}
          titleClass={titleClass}
        />
      )}
    </motion.button>
  );
}

export function Overview({
  view,
  revealing = false,
  onRevealSettled,
  onEnter,
}: {
  view: MatchView;
  /** True during the reveal beat: reels spin and the chrome stays hidden. */
  revealing?: boolean;
  /** Called once per reel as it settles; the container counts them. */
  onRevealSettled?: () => void;
  onEnter: (ordinal: number) => void;
}): React.JSX.Element {
  const { match } = view;
  const tally = minigamesWon(match);
  const phase = derivePhase(match);
  const activeOrdinal = phase.kind === "slot" ? phase.slot.ordinal : null;
  const layout = layoutFor(match.slots.length);

  // Hidden, never unmounted: the chrome has to occupy its space throughout, or
  // the cards would sit somewhere else during the reveal and the whole point of
  // merging the two screens would be lost.
  const chrome = revealing ? "opacity-0" : "opacity-100";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-10 p-8">
      {/* Two projector-scale team names either side of a projector-scale score
          do not fit a phone in one line, so the row wraps rather than pushing
          the page sideways; the tally never shrinks, it is the point. */}
      <header
        aria-hidden={revealing}
        className={cx(
          "slip flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-1",
          chrome,
        )}
      >
        <TeamChip
          colorIndex={match.teamA.colorIndex}
          name={match.teamA.name}
          className="text-s12"
        />
        <span className="shrink-0 font-display text-5xl text-s12">
          {tally.a}–{tally.b}
        </span>
        <TeamChip
          colorIndex={match.teamB.colorIndex}
          name={match.teamB.name}
          className="text-s12"
        />
      </header>

      <div
        className={cx("grid w-full gap-4 sm:gap-6", layout.width, layout.cols)}
      >
        {match.slots.map((slot, index) => (
          <SlotCard
            key={slot.ordinal}
            slot={slot}
            match={match}
            isNext={slot.ordinal === activeOrdinal}
            revealing={revealing}
            titleClass={layout.title}
            reelIndex={index}
            onReelSettled={() => onRevealSettled?.()}
            onEnter={onEnter}
          />
        ))}
      </div>

      <p aria-hidden={revealing} className={cx("slip text-s10", chrome)}>
        {[...match.teamA.members, ...match.teamB.members]
          .map((id) => view.playerLabels[id] ?? id)
          .join(" · ")}
      </p>
    </div>
  );
}
