/**
 * Read-side selectors over match state: derived phase, gate satisfaction
 * against current membership, and the minigames-won tally.
 */
import type { MatchState, SlotState } from "./types";

export type MatchPhase =
  { kind: "slot"; slot: SlotState } | { kind: "complete" };

export function derivePhase(match: MatchState): MatchPhase {
  const active = match.slots.find((slot) => slot.phase !== "done");
  return active ? { kind: "slot", slot: active } : { kind: "complete" };
}

export function isGateSatisfied(match: MatchState, slot: SlotState): boolean {
  const members = [...match.teamA.members, ...match.teamB.members];
  if (members.length === 0) return false;
  const ready = new Set(slot.ready);
  return members.every((id) => ready.has(id));
}

export function minigamesWon(match: MatchState): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const slot of match.slots) {
    if (slot.winner === "A") a += 1;
    else if (slot.winner === "B") b += 1;
  }
  return { a, b };
}
