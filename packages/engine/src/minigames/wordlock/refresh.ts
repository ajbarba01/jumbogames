/**
 * Dead-space refresh. Every period, neutral tiles that were also neutral at the
 * previous tick reroll: two ticks untouched is the operational definition of a
 * region nobody can use. Tiles freed by a recent break survive their first tick
 * and stay playable, and a tile being traced is by definition not dead, so this
 * rarely pulls a letter out from under a word in progress.
 *
 * The math here is pure: a function of the stored state plus a target epoch,
 * with no clock of its own. What calls it is not — the server's `apply`
 * catches an idle stretch up on the next action, and the server's `tick`
 * (armed by the room's alarm, independent of any action) catches it up on a
 * schedule, which is what keeps a saturated board from freezing. Either way
 * the client can extrapolate the same board from its own corrected clock.
 */
import { rerollLetter } from "./grid";
import { tileOwnerIndex, type CapturedWord } from "./capture";
import { REFRESH_PERIOD_MS } from "./tuning";

export function refreshEpochAt(now: number, startedAt: number): number {
  // A non-finite clock is a bug upstream, and it has to fail here rather than
  // propagate: `NaN <= startedAt` is false, so the arithmetic below would
  // return a NaN epoch, `advanceRefresh` would store it, and every later
  // comparison against it would also be false — the board would stop
  // rerolling for the rest of the match, permanently, with nothing thrown and
  // nothing logged. A throw is recoverable (the action 500s, the alarm
  // retries); poisoned state is not.
  if (!Number.isFinite(now) || !Number.isFinite(startedAt)) {
    throw new Error("refreshEpochAt: clock must be finite");
  }
  if (now <= startedAt) return 0;
  return Math.floor((now - startedAt) / REFRESH_PERIOD_MS);
}

/** The instant the next refresh epoch begins, for arming a clock-driven tick */
export function nextRefreshAt(now: number, startedAt: number): number {
  return startedAt + (refreshEpochAt(now, startedAt) + 1) * REFRESH_PERIOD_MS;
}

export function neutralMask(words: CapturedWord[], tiles: number): string {
  const owners = tileOwnerIndex(words, tiles);
  let mask = "";
  for (let i = 0; i < tiles; i++) mask += owners[i] === -1 ? "1" : "0";
  return mask;
}

export function advanceRefresh(input: {
  letters: string;
  stale: string;
  words: CapturedWord[];
  seed: string;
  epoch: number;
  targetEpoch: number;
}): { letters: string; stale: string; epoch: number } {
  const { words, seed } = input;
  // Guarded here as well as in `refreshEpochAt`, because this is the function
  // whose return value gets stored: a NaN target would fall straight through
  // the comparison below and be written back as the new epoch, freezing every
  // later refresh. The caller that computes the target already throws on a
  // non-finite clock; this covers a target arriving any other way.
  if (!Number.isFinite(input.targetEpoch)) {
    throw new Error("advanceRefresh: targetEpoch must be finite");
  }
  if (input.targetEpoch <= input.epoch) {
    return { letters: input.letters, stale: input.stale, epoch: input.epoch };
  }

  const tiles = input.letters.length;
  const neutral = neutralMask(words, tiles);
  let letters = input.letters;
  let stale = input.stale;

  for (let epoch = input.epoch + 1; epoch <= input.targetEpoch; epoch++) {
    const next = [...letters];
    for (let i = 0; i < tiles; i++) {
      if (neutral[i] === "1" && stale[i] === "1") {
        next[i] = rerollLetter(seed, epoch, i);
      }
    }
    letters = next.join("");
    // Ownership cannot change between epochs — only an action changes it — so
    // the mask computed once above is current for every epoch in this catch-up.
    stale = neutral;
  }

  return { letters, stale, epoch: input.targetEpoch };
}
