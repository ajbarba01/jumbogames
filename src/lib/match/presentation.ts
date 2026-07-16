/**
 * Pure presentation model for the match container: which surface a client
 * shows given server truth plus two local inputs (reveal done, player-chosen
 * zoom). Forced phases (countdown/playing/scoring) override local choice so
 * every attached view lands on the same beat.
 */
import { derivePhase } from "./derive";
import type { MatchState } from "./types";

export type Presentation =
  | { kind: "reveal" }
  | { kind: "overview" }
  | { kind: "zoom"; ordinal: number }
  | { kind: "complete" };

export function isPristine(match: MatchState): boolean {
  const first = match.slots[0];
  return (
    first !== undefined && first.phase === "gate" && first.ready.length === 0
  );
}

export function computePresentation(input: {
  match: MatchState;
  revealDone: boolean;
  chosenZoom: number | null;
}): Presentation {
  if (!input.revealDone) return { kind: "reveal" };
  const phase = derivePhase(input.match);
  if (phase.kind === "complete") return { kind: "complete" };
  const slot = phase.slot;
  if (
    slot.phase === "countdown" ||
    slot.phase === "playing" ||
    slot.phase === "scoring"
  ) {
    return { kind: "zoom", ordinal: slot.ordinal };
  }
  return input.chosenZoom === slot.ordinal
    ? { kind: "zoom", ordinal: slot.ordinal }
    : { kind: "overview" };
}

export function presentationKey(p: Presentation): string {
  return p.kind === "zoom" ? `zoom:${p.ordinal}` : p.kind;
}
