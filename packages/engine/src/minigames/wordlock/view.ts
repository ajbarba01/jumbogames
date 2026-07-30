/**
 * The per-viewer Word Lock payload. The game has no hidden information — one
 * board, visible to everyone, is the point — so this is a projection rather
 * than a redaction: it drops server-only bookkeeping other viewers have no use
 * for. The stale mask stays, because the client extrapolates the next refresh
 * from it against its own corrected clock.
 */
import type { CapturedWord, RejectReason } from "./capture";

export interface WordLockReject {
  reason: RejectReason;
  at: number;
  blockedBy: number[] | null;
}

export interface WordLockView {
  side: number;
  letters: string;
  stale: string;
  seed: string;
  epoch: number;
  startedAt: number;
  words: CapturedWord[];
  scores: Record<string, number>;
  teamA: string[];
  teamB: string[];
  /** The viewer's own played words; absent for spectators. */
  played: string[];
  /** The viewer's own last rejection; absent for spectators. */
  lastReject: WordLockReject | null;
}
