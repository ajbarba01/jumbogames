/**
 * The minigame contract. A game's server half is pure — init/apply/finish/
 * scores over an opaque state — so reducers and route handlers can drive any
 * game identically. Content games use the optional hooks: init context fed in
 * from the IO edge, a game-decided outcome that beats the mean comparison,
 * and per-viewer redaction for hidden info. Client surfaces register
 * separately (no React here).
 */

export type MinigameKind = "stub" | "trivia";

export interface RosterSnapshot {
  teamA: string[];
  teamB: string[];
}

export interface MinigameServer<S = unknown, A = unknown> {
  kind: MinigameKind;
  title: string;
  instructions: string;
  playSeconds: number;
  devOnly: boolean;
  init(snapshot: RosterSnapshot, seed: string, context?: unknown): S;
  apply(state: S, playerId: string, action: A, now: number): S;
  isFinished(state: S, now: number): boolean;
  scores(state: S): Record<string, number>;
  // A game-decided winner (e.g. a tug-of-war pin) that beats the
  // normalized-mean comparison at finalize; null defers to the means.
  outcome?(state: S): "A" | "B" | null;
  // Per-viewer payload redaction applied before a view leaves the server.
  // Games with hidden info strip it here; absent means payload is public.
  redact?(state: S, viewerId: string | null): unknown;
}
