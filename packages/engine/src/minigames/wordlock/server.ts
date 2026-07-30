/**
 * Word Lock: one shared grid of letters, and every player on both teams traces
 * words across it to capture tiles for their team. A captured word is held as a
 * unit and can only be taken by a strictly longer word crossing it, whoever
 * played it, so regions progressively lock behind a rising length threshold.
 *
 * The board's periodic refresh is a pure function of stored state plus a
 * server-stamped clock, so the client can extrapolate the same board
 * locally. Two things drive it forward: a player action catches the board up
 * as a side effect, and `tick` catches it up with no action at all — the
 * room's alarm calls `tick` on a schedule so a saturated board (nothing
 * playable, so nobody acts) still frees tiles instead of freezing for the
 * rest of the match.
 *
 * No `outcome` is declared. A player's raw score is the tiles they currently
 * hold, so the container's per-player mean is exactly territory-per-player and
 * team size cancels — which "most tiles wins" would not do.
 */
import type { MinigameServer, RosterSnapshot } from "../types";
import { resolveCapture, type CapturedWord } from "./capture";
import { generateGrid, gridSide } from "./grid";
import {
  advanceRefresh,
  neutralMask,
  nextRefreshAt,
  refreshEpochAt,
} from "./refresh";
import { ONE_PLAY_PER_WORD, WORDLOCK_PLAY_SECONDS } from "./tuning";
import type { WordLockReject, WordLockView } from "./view";

export { WORDLOCK_PLAY_SECONDS };

export interface WordLockState {
  seed: string;
  side: number;
  letters: string;
  stale: string;
  words: CapturedWord[];
  epoch: number;
  startedAt: number;
  teamA: string[];
  teamB: string[];
  played: Record<string, string[]>;
  lastReject: Record<string, WordLockReject>;
}

export interface WordLockAction {
  type: "submit";
  path: number[];
}

function heldTiles(state: WordLockState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of [...state.teamA, ...state.teamB]) out[id] = 0;
  for (const word of state.words) {
    if (out[word.by] !== undefined) out[word.by] += word.path.length;
  }
  return out;
}

export const wordLockGame: MinigameServer<WordLockState, WordLockAction> = {
  kind: "wordlock",
  title: "Word Lock",
  tagline: "Hunt for words to claim the grid.",
  instructions:
    "Trace three or more letters in any direction to claim those tiles for " +
    "your team. Only a longer word crossing a claimed word can break it. " +
    "Unclaimed tiles reroll if nobody uses them.",
  playSeconds: WORDLOCK_PLAY_SECONDS,
  devOnly: false,

  init(snapshot: RosterSnapshot, seed: string, now: number): WordLockState {
    const side = gridSide(snapshot.teamA.length + snapshot.teamB.length);
    const played: Record<string, string[]> = {};
    for (const id of [...snapshot.teamA, ...snapshot.teamB]) played[id] = [];
    return {
      seed,
      side,
      letters: generateGrid(side, seed),
      stale: "1".repeat(side * side),
      words: [],
      epoch: 0,
      startedAt: now,
      teamA: [...snapshot.teamA],
      teamB: [...snapshot.teamB],
      played,
      lastReject: {},
    };
  },

  apply(state, playerId, action, now) {
    if (action.type !== "submit") return state;
    const team: "A" | "B" | null = state.teamA.includes(playerId)
      ? "A"
      : state.teamB.includes(playerId)
        ? "B"
        : null;
    if (team === null) return state;

    const refreshed = advanceRefresh({
      letters: state.letters,
      stale: state.stale,
      words: state.words,
      seed: state.seed,
      epoch: state.epoch,
      targetEpoch: refreshEpochAt(now, state.startedAt),
    });

    const result = resolveCapture({
      letters: refreshed.letters,
      side: state.side,
      words: state.words,
      path: action.path,
      playerId,
      team,
      played: state.played[playerId] ?? [],
      enforceNoRepeat: ONE_PLAY_PER_WORD,
    });

    if (!result.ok) {
      return {
        ...state,
        ...refreshed,
        lastReject: {
          ...state.lastReject,
          [playerId]: {
            reason: result.reason,
            at: now,
            blockedBy: result.blockedBy,
          },
        },
      };
    }

    const nextWords = result.words;
    return {
      ...state,
      ...refreshed,
      words: nextWords,
      // Freeing tiles resets their staleness: a tile a break just returned to
      // neutral must survive its first tick rather than reroll immediately.
      stale: neutralMask(state.words, state.letters.length),
      played: {
        ...state.played,
        [playerId]: [...(state.played[playerId] ?? []), result.word],
      },
      // A successful capture clears this player's stale rejection by rebuilding
      // the record without their key; writing `undefined` into it would leave a
      // present-but-empty entry that redact would ship as a live rejection.
      lastReject: Object.fromEntries(
        Object.entries(state.lastReject).filter(([id]) => id !== playerId),
      ),
    };
  },

  tick(state, now) {
    const refreshed = advanceRefresh({
      letters: state.letters,
      stale: state.stale,
      words: state.words,
      seed: state.seed,
      epoch: state.epoch,
      targetEpoch: refreshEpochAt(now, state.startedAt),
    });
    if (refreshed.epoch === state.epoch) return state;
    return { ...state, ...refreshed };
  },

  nextTickAt(state, now) {
    return nextRefreshAt(now, state.startedAt);
  },

  isFinished() {
    return false;
  },

  scores(state) {
    return heldTiles(state);
  },

  redact(state, viewerId): WordLockView {
    return {
      side: state.side,
      letters: state.letters,
      stale: state.stale,
      seed: state.seed,
      epoch: state.epoch,
      startedAt: state.startedAt,
      words: state.words,
      scores: heldTiles(state),
      teamA: state.teamA,
      teamB: state.teamB,
      played: viewerId === null ? [] : (state.played[viewerId] ?? []),
      lastReject:
        viewerId === null ? null : (state.lastReject[viewerId] ?? null),
    };
  },
};
