/**
 * Tug O' Lore's play surface: one tree for both roles — the projector clock,
 * both teams' pulling power, the rope and its force chevron are what a
 * spectator sees, and a player gets their own running score and their own
 * question stream on top.
 *
 * Everything time-varying here is extrapolated locally from the last pushed
 * payload with the same pure functions the server used, so the rope crawls and
 * the tier timers drain smoothly between frames instead of stepping on each
 * push. Answering holds the card for a verdict beat; the card behind it has
 * already been dealt server-side, so the hold is presentation, not pacing.
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
import { advanceRope, resolveTier, type TriviaView } from "@jumbo/engine";
import { useNow } from "@/components/match/use-now";
import { Rope } from "./Rope";
import { TierMeter } from "./TierMeter";
import { WinGlow } from "./WinGlow";

/** How long the answered card stays on screen with its verdict. */
const REVEAL_MS = 1000;
/** Ceiling on a hold whose verdict never arrives — a rejected action leaves
 *  `answers` unchanged, and a player must never be stranded on a dead card
 *  with their choices disabled. */
const HOLD_MAX_MS = 3000;
const SHAKE_DUR = 0.4;

interface HeldCard {
  deckIndex: number;
  prompt: string;
  choices: [string, string, string, string];
  picked: number;
  /** The viewer's applied-answer count when this card was picked. Monotonic
   *  and moved by wrong answers too — which no longer touch the score — so it
   *  is the one edge that means "the server has resolved my card" for both
   *  verdicts. A plain number, so it stays referentially stable across a frame
   *  that did not change it. */
  baselineAnswers: number;
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

/** One answer choice. Interactive until the verdict; a tapped-but-unresolved
 *  choice reads as *taken* — acknowledgement-only optimism, because the server
 *  never ships a correct index and the client genuinely cannot know whether the
 *  pick scored. The frame carries the verdict, so the kit Button underneath
 *  keeps its own faces. */
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

/** The lockout banner. A wrong answer costs seconds, not points, and this has
 *  to read as *the game holding you* — a bare disabled state with no
 *  explanation is the worst version of this. */
function Lockout({ secondsLeft }: { secondsLeft: number }): React.JSX.Element {
  return (
    <p aria-live="polite" className="text-center text-sec font-bold text-crit">
      Wrong — back in {secondsLeft}s
    </p>
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

  // Extrapolated, not read: the payload is only current as of the last answer,
  // and both the rope and the tier timers keep moving after it.
  const rope = advanceRope(
    payload.rope,
    payload.tierA,
    payload.tierB,
    serverNow,
    payload.k,
  );
  const tierA = resolveTier(payload.tierA, serverNow);
  const tierB = resolveTier(payload.tierB, serverNow);
  const gap = tierA.tier - tierB.tier;

  const meanA = normalizeTeamScore(payload.scores, snapshot.teamA);
  const meanB = normalizeTeamScore(payload.scores, snapshot.teamB);
  const remaining = Math.max(
    0,
    Math.ceil(((slot.deadline ?? serverNow) - serverNow) / 1000),
  );
  const myScore =
    view.viewerId !== null ? (payload.scores[view.viewerId] ?? 0) : 0;

  const lockedFor = Math.max(0, payload.lockedUntil - serverNow);
  const locked = lockedFor > 0;

  const [held, setHeld] = useState<HeldCard | null>(null);
  const [pop, setPop] = useState({ key: 0, delta: 0 });
  // Which held card's pop has already fired, so a card that keeps
  // re-rendering during its verdict beat cannot pop a second time.
  const [poppedDeckIndex, setPoppedDeckIndex] = useState<number | null>(null);

  // The server resolved this card once the viewer's applied-answer count has
  // moved past what it was when the card was picked. This replaces the old
  // score-based edge, which a wrong answer no longer moves.
  const resolved =
    held !== null && payload.answers > held.baselineAnswers ? held : null;

  // Release the hold once its answer has resolved.
  useEffect(() => {
    if (resolved === null) return;
    const timer = setTimeout(() => setHeld(null), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [resolved]);

  // Ceiling: a genuinely rejected action (stale deckIndex, or one sent inside
  // a lockout) never moves `answers`, so the release above never fires and
  // this is the only way out — a stranded hold would leave the player unable
  // to answer anything at all.
  useEffect(() => {
    if (held === null) return;
    const timer = setTimeout(() => setHeld(null), HOLD_MAX_MS);
    return () => clearTimeout(timer);
  }, [held]);

  // A pin ends play; nobody should sit out a verdict beat for a match that is
  // already decided. Dropped during render (not an effect) — a pure sync from
  // the derived pin, the same "you might not need an effect" pattern as the
  // score-pop state below.
  const pinned = rope.p >= 1 || rope.p <= -1;
  if (pinned && held !== null) setHeld(null);

  const card = held ?? payload.question;

  function pick(choiceIndex: number): void {
    const question = payload.question;
    if (question === null) return;
    setHeld({
      ...question,
      picked: choiceIndex,
      baselineAnswers: payload.answers,
    });
    onAction({ type: "answer", deckIndex: question.deckIndex, choiceIndex });
  }

  // The pop reports the viewer's own score movement rather than a guess at
  // what an answer is worth — the scoring constants live on the server and
  // this surface should not hold a second copy of them. A wrong answer scores
  // nothing now, so this only ever fires on a correct one.
  if (
    held !== null &&
    held.deckIndex !== poppedDeckIndex &&
    payload.answers > held.baselineAnswers
  ) {
    setPoppedDeckIndex(held.deckIndex);
    if (payload.lastResult === "correct") {
      setPop((prev) => ({ key: prev.key + 1, delta: 1 }));
    }
  }

  /** The verdict for one choice. Correct flashes the choice the player picked;
   *  wrong reddens it. No correct index crosses the wire, so an unpicked
   *  choice is never marked either way. */
  function verdictFor(
    choiceIndex: number,
  ): "idle" | "pending" | "correct" | "wrong" {
    if (held === null || choiceIndex !== held.picked) return "idle";
    if (resolved === null || payload.lastResult === null) return "pending";
    return payload.lastResult;
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
                You · {myScore} right
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
          {/* Pulling power sits directly over the rope it drives, so the
              numeral, the gap and the chevron read as one causal chain. */}
          <div className="flex items-start justify-between gap-3">
            <TierMeter
              team={teamA}
              tier={payload.tierA}
              now={serverNow}
              leading={gap > 0}
              align="left"
            />
            <TierMeter
              team={teamB}
              tier={payload.tierB}
              now={serverNow}
              leading={gap < 0}
              align="right"
            />
          </div>
          <Rope p={rope.p} gap={gap} teamA={teamA} teamB={teamB} />
        </div>

        {card !== null ? (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={card.deckIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ ease: SLIP_EASE, duration: SLIP_DUR.enter }}
                className="flex flex-col gap-4"
              >
                {/* The E2E spec identifies the dealt card from this element:
                    which card the deal hands a player cannot be predicted, so
                    the prompt on screen is how the test finds it. */}
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
                      disabled={!canAct || held !== null || locked}
                      verdict={verdictFor(choiceIndex)}
                      onPick={() => pick(choiceIndex)}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
            {locked && <Lockout secondsLeft={Math.ceil(lockedFor / 1000)} />}
          </div>
        ) : (
          <p className="text-center text-s10">
            No hand to play — spectating this game.
          </p>
        )}
      </div>
    </div>
  );
}
