/**
 * Trivia tug-of-war play surface: one tree for both roles — the projector
 * clock, both team ends, the rope and the derived event log are what a
 * spectator sees, and a player gets their own running score and their own
 * question stream on top. Answering holds the card for a reveal beat before
 * the next one is shown; the card behind it has already been dealt
 * server-side, so the hold is presentation, not pacing.
 */
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Button,
  ScorePop,
  SLIP_DUR,
  SLIP_EASE,
  SLIP_SHAKE,
  TeamChip,
  cx,
} from "@jumbo/ui";
import type { MatchView } from "@/lib/match/client";
import { normalizeTeamScore } from "@jumbo/engine";
import type { MatchTeam, SlotState } from "@jumbo/engine";
import { decayRope } from "@jumbo/engine";
import type { TriviaView } from "@jumbo/engine";
import { useNow } from "@/components/match/use-now";
import { Rope } from "./Rope";
import { WinGlow } from "./WinGlow";
import { useTicker } from "./use-ticker";
import type { TickerEvent } from "@jumbo/engine";

/** How long the answered card stays on screen with its reveal. */
const REVEAL_MS = 1000;
/** Ceiling on a hold whose reveal never arrives — a rejected action leaves
 *  `lastAnswer` unchanged, and a player must never be stranded on a dead
 *  card with their choices disabled. */
const HOLD_MAX_MS = 3000;
const SHAKE_DUR = 0.4;

interface HeldCard {
  deckIndex: number;
  prompt: string;
  choices: [string, string, string, string];
  picked: number;
  /** The viewer's own score at the moment this card was picked, so the hold
   *  can tell when the server has resolved it — every answer moves the score
   *  by a nonzero amount — without depending on `lastAnswer`, which is
   *  suppressed on the deck-exhaustion collision path. */
  baselineScore: number;
}

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** A team's wall: identity and their normalized mean, mirrored on the right
 *  so both swatches sit outboard against their own end of the rope. */
function TeamEnd({
  team,
  mean,
  align,
}: {
  team: MatchTeam;
  mean: number;
  align: "left" | "right";
}): React.JSX.Element {
  return (
    <div
      className={cx(
        "flex min-w-0 items-center gap-2 sm:gap-3",
        align === "right" && "flex-row-reverse",
      )}
    >
      <TeamChip
        colorIndex={team.colorIndex}
        name={team.name}
        reverse={align === "right"}
        className="text-s12"
      />
      <span className="shrink-0 font-display text-xl text-s12 sm:text-4xl">
        {mean.toFixed(1)}
      </span>
    </div>
  );
}

/** The anonymized log: who scored and by how much, newest first, with a
 *  reserved height so a new row animates in place instead of resizing the
 *  surface around it. */
function Ticker({
  events,
  teamA,
  teamB,
  compact,
}: {
  events: TickerEvent[];
  teamA: MatchTeam;
  teamB: MatchTeam;
  compact: boolean;
}): React.JSX.Element {
  return (
    <ul
      aria-live="polite"
      className={cx(
        "flex flex-col items-center gap-1 overflow-hidden",
        compact ? "h-24" : "h-28",
      )}
    >
      <AnimatePresence initial={false}>
        {events.map((event) => {
          const team = event.side === "A" ? teamA : teamB;
          return (
            <motion.li
              key={event.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ ease: SLIP_EASE, duration: SLIP_DUR.base }}
              className={cx(
                "flex items-center justify-center gap-2",
                compact ? "text-s8" : "text-sec text-s9",
              )}
            >
              <TeamChip
                colorIndex={team.colorIndex}
                name={team.name}
                size="xs"
              />
              <span
                className={cx(
                  "font-bold",
                  event.delta > 0 ? "text-ok" : "text-crit",
                )}
              >
                {event.delta > 0 ? `+${event.delta}` : event.delta}
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}

/** One answer choice. Interactive until the reveal; the reveal marks the
 *  correct choice and shakes a wrong pick. A tapped-but-unresolved choice
 *  reads as *taken* (tier-1 optimism, DESIGN.md decision 23) — deliberately
 *  neutral, because trivia redacts the correct answer and the client cannot
 *  know whether the pick was right until the server says so. The frame carries
 *  the verdict, so the kit Button underneath keeps its own faces intact. */
function Choice({
  label,
  disabled,
  verdict,
  onPick,
}: {
  label: string;
  disabled: boolean;
  verdict: "idle" | "pending" | "correct" | "wrong";
  onPick: () => void;
}): React.JSX.Element {
  return (
    <motion.div
      animate={verdict === "wrong" ? { x: [...SLIP_SHAKE] } : undefined}
      transition={{ duration: SHAKE_DUR }}
      className={cx(
        "rounded-r2 border-2",
        verdict === "correct" && "border-ok",
        verdict === "wrong" && "border-crit",
        // Held, not scored: the existing neutral rule, no new colour token.
        verdict === "pending" && "border-s6",
        verdict === "idle" && "border-transparent",
      )}
    >
      <Button
        variant="block"
        className="w-full"
        disabled={disabled}
        onClick={onPick}
        data-state={verdict}
      >
        {label}
      </Button>
    </motion.div>
  );
}

export function TriviaPlay({
  view,
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
  const { teamA, teamB } = view.match;

  const rope = decayRope(payload.rope, serverNow);
  const meanA = normalizeTeamScore(payload.scores, snapshot.teamA);
  const meanB = normalizeTeamScore(payload.scores, snapshot.teamB);
  const remaining = Math.max(
    0,
    Math.ceil(((slot.deadline ?? serverNow) - serverNow) / 1000),
  );
  const events = useTicker(payload.scores, snapshot);
  const myScore =
    view.viewerId !== null ? (payload.scores[view.viewerId] ?? 0) : 0;

  const [held, setHeld] = useState<HeldCard | null>(null);
  const [pop, setPop] = useState({ key: 0, delta: 0 });
  // Which held card's pop has already fired, so a card that keeps
  // re-rendering during its reveal beat cannot pop a second time.
  const [poppedDeckIndex, setPoppedDeckIndex] = useState<number | null>(null);

  // Drives the choice highlighting only. `lastAnswer` is suppressed on the
  // deck-exhaustion collision path (the newly dealt card is the same one just
  // answered), so a held card can resolve with `revealed` staying null the
  // whole time — the release below must not depend on it.
  const revealed =
    held !== null && payload.lastAnswer?.deckIndex === held.deckIndex
      ? payload.lastAnswer
      : null;

  // The hold releases once the viewer's own score has moved away from what it
  // was when the held card was picked — every resolved answer changes it by a
  // nonzero amount (+3 or -1), so "the score moved" is a reliable "the server
  // has decided" signal that survives the `lastAnswer` suppression above.
  // `myScore` is a plain number derived from `payload.scores`, so — unlike
  // `payload.lastAnswer`'s object identity — it stays referentially stable
  // across a Realtime push that didn't change it (every push is a full
  // refetch; see realtime-client.ts), which keeps this effect from re-arming
  // on every push the way one keyed on the object would.
  const resolvedDeckIndex =
    held !== null && myScore !== held.baselineScore ? held.deckIndex : null;

  // Release the hold once its answer has resolved.
  useEffect(() => {
    if (resolvedDeckIndex === null) return;
    const timer = setTimeout(() => setHeld(null), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [resolvedDeckIndex]);

  // Ceiling: a genuinely rejected action (stale or mismatched deckIndex)
  // never moves the score, so `resolvedDeckIndex` never fires and this is the
  // only way out — a stranded hold would leave the player unable to answer
  // anything at all. Nothing to pop here: the score never moved, so there is
  // no baseline left to advance for the next card.
  useEffect(() => {
    if (held === null) return;
    const timer = setTimeout(() => setHeld(null), HOLD_MAX_MS);
    return () => clearTimeout(timer);
  }, [held]);

  // A pin ends play; nobody should sit out a reveal beat for a match that is
  // already decided. Dropped during render (not an effect) — this is a pure
  // sync from `payload.pinned`, the same "you might not need an effect"
  // pattern as the ticker and score-pop state below.
  if (payload.pinned !== null && held !== null) setHeld(null);

  const card = held ?? payload.question;

  function pick(choiceIndex: number): void {
    const question = payload.question;
    if (question === null) return;
    setHeld({ ...question, picked: choiceIndex, baselineScore: myScore });
    onAction({
      type: "answer",
      deckIndex: question.deckIndex,
      choiceIndex,
    });
  }

  // The pop reports the viewer's own score movement rather than a guess at
  // what an answer is worth — the scoring constants live on the server and
  // this surface should not hold a second copy of them. Keyed on the same
  // resolution signal as the release above (not on `revealed`), so a
  // suppressed reveal still pops; guarded by `poppedDeckIndex` so it only
  // fires once per card even though this runs on every render.
  if (
    held !== null &&
    held.deckIndex !== poppedDeckIndex &&
    myScore !== held.baselineScore
  ) {
    setPoppedDeckIndex(held.deckIndex);
    setPop((prev) => ({
      key: prev.key + 1,
      delta: myScore - held.baselineScore,
    }));
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-8">
      <WinGlow p={rope.p} teamA={teamA} teamB={teamB} />
      <div className="relative flex flex-1 flex-col gap-6">
        <div className="flex flex-col items-center gap-1">
          <p className="font-display text-4xl text-s12 sm:text-5xl">
            {formatClock(remaining)}
          </p>
          {card !== null && (
            <div className="relative">
              <span className="text-sec font-bold text-s11">
                You · {myScore} pts
              </span>
              <ScorePop popKey={pop.key} delta={pop.delta} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {/* Two projector-scale ends either side of the rope: each end may
              lose width to its neighbour, and the score never shrinks. */}
          <div className="flex items-end justify-between gap-3">
            <TeamEnd team={teamA} mean={meanA} align="left" />
            <TeamEnd team={teamB} mean={meanB} align="right" />
          </div>
          <Rope p={rope.p} teamA={teamA} teamB={teamB} />
        </div>

        {card !== null ? (
          <div className="mx-auto w-full max-w-3xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={card.deckIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ ease: SLIP_EASE, duration: SLIP_DUR.enter }}
                className="flex flex-col gap-4"
              >
                {/* The deal is seeded per match from a shared bank, so which
                    card a player holds cannot be predicted. E2E reads the
                    prompt off the screen and looks the answer up by it —
                    the slot payload it used to read is only archived to
                    Postgres once the slot is done. */}
                <p
                  data-testid="trivia-prompt"
                  className="text-center text-lg font-bold text-balance text-s12"
                >
                  {card.prompt}
                </p>
                {/* Two columns where there is room, one stack at the floor. */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {card.choices.map((choice, choiceIndex) => (
                    <Choice
                      key={choiceIndex}
                      label={choice}
                      disabled={!canAct || held !== null}
                      verdict={
                        revealed === null
                          ? // Pre-reveal the only thing that is known is which
                            // choice this viewer took — never whether it scored.
                            held !== null && choiceIndex === held.picked
                            ? "pending"
                            : "idle"
                          : choiceIndex === revealed.correctIndex
                            ? "correct"
                            : held !== null && choiceIndex === held.picked
                              ? "wrong"
                              : "idle"
                      }
                      onPick={() => pick(choiceIndex)}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-center text-s10">
            No hand to play — spectating this game.
          </p>
        )}

        <div
          className={cx(card !== null ? "mt-auto" : "mx-auto w-full max-w-md")}
        >
          <Ticker
            events={events}
            teamA={teamA}
            teamB={teamB}
            compact={card !== null}
          />
        </div>
      </div>
    </div>
  );
}
