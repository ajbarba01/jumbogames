/**
 * The surface every match view consumes: a view snapshot + subscription
 * (server truth) and the player's few verbs. Implemented by the fake dev
 * client today; the Realtime-backed client swaps in behind this interface.
 */
import type { MatchView } from "@jumbo/engine";

export type { MatchView, ViewerRole } from "@jumbo/engine";

// The match GET returns the view plus the server's wall clock at send time, so
// the client can estimate its offset from server time and correct countdowns.
export interface MatchSnapshotPayload {
  view: MatchView;
  serverNow: number;
  /** Short-lived credential for this viewer's match socket. */
  ticket: string;
  /** wss:// endpoint for this match's room. */
  socketUrl: string;
}

export interface MatchClient {
  getView(): MatchView;
  /**
   * Estimated serverClock - clientClock in ms. Add to Date.now() before
   * comparing against a server timestamp (deadline, countdown end) so a client
   * with a skewed clock still paces against server time.
   */
  serverOffsetMs(): number;
  subscribe(listener: () => void): () => void;
  ready(ordinal: number): void;
  act(ordinal: number, action: unknown): void;
  forceStart(ordinal: number): void;
}
