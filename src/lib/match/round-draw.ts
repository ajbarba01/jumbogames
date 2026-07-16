/**
 * Per-round minigame draw: K kinds from the eligible pool, seeded so the
 * draw is reproducible. The round — not each match — owns the draw; every
 * match in the round plays the same kinds in the same order. Distinct while
 * the pool lasts, cycling past it (only reachable with a dev-sized pool).
 */
import type { MinigameKind } from "@/lib/minigames/types";

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawRoundGames(
  pool: MinigameKind[],
  k: number,
  seed: string,
): MinigameKind[] {
  if (pool.length === 0) return [];
  const random = mulberry32(hashSeed(seed));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return Array.from({ length: k }, (_, i) => shuffled[i % shuffled.length]!);
}
