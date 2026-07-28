/**
 * DTOs for the two authenticated server-to-server hops between the realtime
 * Worker and the Next app: hydrating a match's initial state out of Postgres,
 * and persisting a finished slot back into it. Prisma types never cross this
 * boundary — only these plain shapes do.
 */
import type { MatchState, MinigameKind } from "@jumbo/engine";

export interface HydrateResponse {
  state: MatchState;
  hostId: string;
  tournamentId: string;
  /** Every profile on either team of this match; decides player vs spectator. */
  memberIds: string[];
  /** Display names for every member, for MatchView.playerLabels. */
  labels: Record<string, string>;
  /** Per-kind init context loaded at the IO edge (e.g. the trivia bank). */
  initContext: Partial<Record<MinigameKind, unknown>>;
  serverNow: number;
}

export interface PersistRequest {
  /** The full slot set as the DO holds it; Next writes it through slotWriteData. */
  state: MatchState;
  /** Highest ordinal the DO considers finished, for idempotent replays. */
  completedOrdinal: number;
}

export interface PersistResponse {
  ok: boolean;
}
