/**
 * The per-viewer match snapshot shape: server truth (MatchState) plus the
 * role and label metadata a client needs to render it. Shared by the Next
 * app and the realtime Worker so both produce and consume the identical
 * shape across the wire contract in @jumbo/protocol.
 */
import type { MatchState } from "./types";

export type ViewerRole = "player" | "spectator";

export interface MatchView {
  match: MatchState;
  viewerId: string | null;
  role: ViewerRole;
  playerLabels: Record<string, string>;
}
