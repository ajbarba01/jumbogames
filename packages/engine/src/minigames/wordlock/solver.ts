/**
 * Exhaustive board solver. Never runs in production: it backs the
 * board-quality tests that justify the dice tuning, and drives the mockup
 * harness's bots so a dev board is genuinely contested.
 */
import { hasPrefix, hasWord } from "./dictionary";
import { MAX_WORD_LENGTH, MIN_WORD_LENGTH } from "./tuning";

export function neighbors(index: number, side: number): number[] {
  const row = Math.floor(index / side);
  const col = index % side;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || c < 0 || r >= side || c >= side) continue;
      out.push(r * side + c);
    }
  }
  return out;
}

export interface FoundWord {
  word: string;
  path: number[];
}

export interface SolverOptions {
  limit?: number;
  minLength?: number;
  maxLength?: number;
}

export function findWords(
  letters: string,
  side: number,
  options: SolverOptions = {},
): FoundWord[] {
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const minLength = options.minLength ?? MIN_WORD_LENGTH;
  const maxLength = options.maxLength ?? MAX_WORD_LENGTH;

  const found: FoundWord[] = [];
  const seen = new Set<string>();
  const visited = new Array<boolean>(letters.length).fill(false);
  const path: number[] = [];

  const walk = (index: number, prefix: string): void => {
    if (found.length >= limit) return;
    const word = prefix + letters[index]!;
    // A word is always a prefix of itself, so a string that is not a prefix
    // of anything in the dictionary cannot be a word either; abandoning here
    // is equivalent to letting `hasWord` reject it below, just without
    // walking the rest of the subtree first.
    if (!hasPrefix(word)) return;
    visited[index] = true;
    path.push(index);

    if (word.length >= minLength && !seen.has(word) && hasWord(word)) {
      seen.add(word);
      found.push({ word, path: [...path] });
    }
    if (word.length < maxLength) {
      for (const next of neighbors(index, side)) {
        if (!visited[next]) walk(next, word);
      }
    }

    path.pop();
    visited[index] = false;
  };

  for (let i = 0; i < letters.length && found.length < limit; i++) {
    walk(i, "");
  }
  return found;
}
