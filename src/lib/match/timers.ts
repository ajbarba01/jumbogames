/**
 * Lazy-advance selector: given a match snapshot and the current time, the timer
 * event due on the active slot, if any. Serverless has no ticker, so both the
 * advance route and the client ticker share this to fire countdown/finalize/
 * scoring transitions from persisted deadlines. The reducer re-checks timing.
 */
import { derivePhase } from "./derive";
import { MINIGAMES } from "@/lib/minigames/registry";
import type { MatchEvent, MatchState } from "./types";

/** The subset of MatchEvent that pendingAdvance can return — all timer-driven,
 * all carrying the slot ordinal, so callers can dereference it without narrowing. */
export type AdvanceEvent = Extract<
  MatchEvent,
  { type: "countdownElapsed" | "finalize" | "scoringElapsed" }
>;

export function pendingAdvance(
  match: MatchState,
  now: number,
): { event: AdvanceEvent } | null {
  const phase = derivePhase(match);
  if (phase.kind === "complete") return null;
  const slot = phase.slot;

  if (
    slot.phase === "countdown" &&
    slot.countdownEndsAt !== null &&
    now >= slot.countdownEndsAt
  ) {
    return { event: { type: "countdownElapsed", ordinal: slot.ordinal } };
  }
  if (slot.phase === "playing") {
    const timeUp = slot.deadline !== null && now >= slot.deadline;
    const gameDone =
      slot.snapshot !== null &&
      MINIGAMES[slot.kind].isFinished(slot.payload, now);
    if (timeUp || gameDone) {
      return { event: { type: "finalize", ordinal: slot.ordinal } };
    }
  }
  if (
    slot.phase === "scoring" &&
    slot.scoringEndsAt !== null &&
    now >= slot.scoringEndsAt
  ) {
    return { event: { type: "scoringElapsed", ordinal: slot.ordinal } };
  }
  return null;
}
