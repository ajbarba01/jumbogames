/**
 * Turns persisted match results into the outcome list standings consume.
 * Pure: the caller reads slots at the IO edge and passes them in. Only a slot
 * that reached `done` with a recorded winner counts — a slot still being
 * played contributes nothing rather than a phantom result, which matters
 * because the board is read live on every broadcast.
 */
import type { SlotPhase, SlotWinner } from "@jumbo/engine";
import type { MinigameOutcome } from "./standings";

export interface ResultSlot {
  phase: SlotPhase;
  winner: SlotWinner | null;
}

export interface ResultMatch {
  teamAId: string;
  teamBId: string | null; // null => a bye, which has no minigame outcomes
  slots: readonly ResultSlot[];
}

export function collectMinigameOutcomes(
  matches: readonly ResultMatch[],
): MinigameOutcome[] {
  const outcomes: MinigameOutcome[] = [];
  for (const match of matches) {
    const teamB = match.teamBId;
    if (teamB === null) continue;
    for (const slot of match.slots) {
      if (slot.phase !== "done" || slot.winner === null) continue;
      outcomes.push({ teamA: match.teamAId, teamB, winner: slot.winner });
    }
  }
  return outcomes;
}
