/**
 * The top bar's numbers. The split is ground *per player*, not raw territory:
 * raw tiles would hand a bigger team a proportional edge, which is exactly what
 * the container's per-player normalization exists to cancel.
 */
import type { WordLockView } from "@jumbo/engine";

export interface Shares {
  a: number;
  b: number;
  mine: number;
  tilesA: number;
  tilesB: number;
}

function total(scores: Record<string, number>, members: string[]): number {
  return members.reduce((sum, id) => sum + (scores[id] ?? 0), 0);
}

export function teamShares(
  view: WordLockView,
  viewerId: string | null,
): Shares {
  const tilesA = total(view.scores, view.teamA);
  const tilesB = total(view.scores, view.teamB);
  const perA = view.teamA.length === 0 ? 0 : tilesA / view.teamA.length;
  const perB = view.teamB.length === 0 ? 0 : tilesB / view.teamB.length;
  const sum = perA + perB;
  return {
    a: sum === 0 ? 0.5 : perA / sum,
    b: sum === 0 ? 0.5 : perB / sum,
    mine: viewerId === null ? 0 : (view.scores[viewerId] ?? 0),
    tilesA,
    tilesB,
  };
}
