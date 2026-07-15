/**
 * Team-color assignment. Teams take the lowest free index in the kit's fixed
 * palette; a null result means the palette (and therefore the team slots) is
 * exhausted. Pure: the caller supplies the indices already in use.
 */
import { MAX_TEAMS } from "@/lib/schemas/tournament";

export function pickColorIndex(
  usedIndices: number[],
  max: number = MAX_TEAMS,
): number | null {
  const used = new Set(usedIndices);
  for (let index = 1; index <= max; index++) {
    if (!used.has(index)) return index;
  }
  return null;
}
