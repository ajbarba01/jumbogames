/**
 * The minigame contract. A game's server half is pure — init/apply/finish/
 * scores over an opaque state — so reducers and route handlers can drive any
 * game identically. Client surfaces register separately (no React here).
 */

export type MinigameKind = "stub";

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
  init(snapshot: RosterSnapshot, seed: string): S;
  apply(state: S, playerId: string, action: A): S;
  isFinished(state: S, now: number): boolean;
  scores(state: S): Record<string, number>;
}
