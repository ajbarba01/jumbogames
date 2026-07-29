/**
 * Word Lock's rules core: validate a traced path, read its word, and resolve
 * what it captures. A captured word is held as a unit and can only be taken by
 * a strictly longer word crossing it — a rule applied uniformly, including to
 * the capturing player's own team, which is what guarantees a tile is ever
 * part of at most one live word and keeps the board unambiguous to render.
 */
import { hasWord } from "./dictionary";
import { neighbors } from "./solver";
import { MAX_WORD_LENGTH, MIN_WORD_LENGTH } from "./tuning";

export interface CapturedWord {
  path: number[];
  word: string;
  by: string;
  side: "A" | "B";
}

export type RejectReason =
  | "too-short"
  | "too-long"
  | "bad-path"
  | "not-a-word"
  | "already-played"
  | "blocked";

export type CaptureResult =
  | { ok: true; words: CapturedWord[]; word: string }
  | { ok: false; reason: RejectReason; blockedBy: number[] | null };

export function isContiguousSimplePath(path: number[], side: number): boolean {
  if (path.length === 0) return false;
  const seen = new Set<number>();
  for (let i = 0; i < path.length; i++) {
    const tile = path[i]!;
    if (!Number.isInteger(tile) || tile < 0 || tile >= side * side) {
      return false;
    }
    if (seen.has(tile)) return false;
    seen.add(tile);
    if (i > 0 && !neighbors(path[i - 1]!, side).includes(tile)) return false;
  }
  return true;
}

export function pathWord(letters: string, path: number[]): string | null {
  let word = "";
  for (const tile of path) {
    const letter = letters[tile];
    if (letter === undefined) return null;
    word += letter;
  }
  return word;
}

export function tileOwnerIndex(
  words: CapturedWord[],
  tiles: number,
): Int32Array {
  const index = new Int32Array(tiles).fill(-1);
  for (let w = 0; w < words.length; w++) {
    for (const tile of words[w]!.path) index[tile] = w;
  }
  return index;
}

export function resolveCapture(input: {
  letters: string;
  side: number;
  words: CapturedWord[];
  path: number[];
  playerId: string;
  team: "A" | "B";
  played: string[];
  enforceNoRepeat: boolean;
}): CaptureResult {
  const { letters, side, words, path, playerId, team } = input;

  if (path.length < MIN_WORD_LENGTH) {
    return { ok: false, reason: "too-short", blockedBy: null };
  }
  if (path.length > MAX_WORD_LENGTH) {
    return { ok: false, reason: "too-long", blockedBy: null };
  }
  if (!isContiguousSimplePath(path, side)) {
    return { ok: false, reason: "bad-path", blockedBy: null };
  }

  const word = pathWord(letters, path);
  if (word === null || !hasWord(word)) {
    return { ok: false, reason: "not-a-word", blockedBy: null };
  }
  if (input.enforceNoRepeat && input.played.includes(word)) {
    return { ok: false, reason: "already-played", blockedBy: null };
  }

  const owners = tileOwnerIndex(words, side * side);
  const crossed = new Set<number>();
  for (const tile of path) {
    const owner = owners[tile]!;
    if (owner === -1) continue;
    if (words[owner]!.path.length >= path.length) {
      return {
        ok: false,
        reason: "blocked",
        blockedBy: [...words[owner]!.path],
      };
    }
    crossed.add(owner);
  }

  const survivors = words.filter((_, index) => !crossed.has(index));
  return {
    ok: true,
    word,
    words: [...survivors, { path: [...path], word, by: playerId, side: team }],
  };
}
