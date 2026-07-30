/**
 * Two lazy selectors over a match snapshot and the current time.
 * `pendingAdvance` is one-shot: the timer event due on the active slot, if
 * any — countdown, finalize, or scoring — shared by the advance route and
 * the client ticker to fire transitions from persisted deadlines; the
 * reducer re-checks timing. `nextTickAt` is recurring instead: the next
 * instant a game's own clock-driven `tick` should run, for the life of a
 * slot rather than for a single phase change, so the realtime Worker's room
 * can arm its alarm on it.
 */
import { derivePhase } from "./derive";
import { MINIGAMES } from "../minigames/registry";
import type { MinigameKind, MinigameServer } from "../minigames/types";
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

/**
 * When the active slot's game next needs a clock-driven advance, or null when
 * no game in the match wants one. Separate from the phase deadlines because a
 * tick recurs for the life of a slot rather than ending a phase.
 *
 * The boundary formula is game-specific, so this defers to the game's own
 * `nextTickAt` rather than reimplementing it — the only game-agnostic part is
 * clamping to the slot's deadline, since there is no point waking a game's
 * clock after its slot has ended.
 */
export function nextTickAt(
  state: MatchState,
  games: Record<MinigameKind, MinigameServer>,
  now: number,
): number | null {
  const phase = derivePhase(state);
  if (phase.kind === "complete") return null;
  const slot = phase.slot;
  if (slot.phase !== "playing") return null;

  const at = games[slot.kind].nextTickAt?.(slot.payload, now) ?? null;
  if (at === null) return null;
  return slot.deadline !== null ? Math.min(at, slot.deadline) : at;
}
