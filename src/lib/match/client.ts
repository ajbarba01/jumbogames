/**
 * The surface every match view consumes: a view snapshot + subscription
 * (server truth) and the player's few verbs. Implemented by the fake dev
 * client today; the Realtime-backed client swaps in behind this interface.
 */
import type { MatchState } from "./types";

export type ViewerRole = "player" | "spectator";

export interface MatchView {
  match: MatchState;
  viewerId: string | null;
  role: ViewerRole;
  playerLabels: Record<string, string>;
}

export interface MatchClient {
  getView(): MatchView;
  subscribe(listener: () => void): () => void;
  ready(ordinal: number): void;
  act(ordinal: number, action: unknown): void;
  forceStart(ordinal: number): void;
}
