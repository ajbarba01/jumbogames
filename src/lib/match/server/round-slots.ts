/**
 * Pure slot seeding for a round start: given the round's non-bye matches and the
 * drawn game order, emit the MinigameSlot rows to create — one per (match,
 * ordinal), slot 0 open at the gate and the rest upcoming.
 */
import type { MinigameKind } from "@/lib/minigames/types";

export interface RoundMatchRef {
  id: string;
  isBye: boolean;
}

export interface SlotSeed {
  matchId: string;
  ordinal: number;
  kind: MinigameKind;
  phase: "gate" | "upcoming";
}

export function buildRoundSlots(
  matches: RoundMatchRef[],
  drawnGames: MinigameKind[],
): SlotSeed[] {
  const seeds: SlotSeed[] = [];
  for (const match of matches) {
    if (match.isBye) continue;
    drawnGames.forEach((kind, ordinal) => {
      seeds.push({
        matchId: match.id,
        ordinal,
        kind,
        phase: ordinal === 0 ? "gate" : "upcoming",
      });
    });
  }
  return seeds;
}
