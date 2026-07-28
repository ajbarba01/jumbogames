/**
 * The Durable Object's own durable state. ctx.storage is the source of truth —
 * never instance fields — because WebSocket hibernation evicts the object from
 * memory while leaving its sockets connected. Writes are not awaited: Cloudflare
 * output gates hold outgoing messages until the write has flushed, so no client
 * can observe state that is not yet durable.
 */
import type { MatchState, MinigameKind } from "@jumbo/engine";

const KEY = "room";

export interface RoomState {
  state: MatchState;
  hostId: string;
  tournamentId: string;
  memberIds: string[];
  labels: Record<string, string>;
  /**
   * Per-kind init context loaded at the IO edge and handed over by hydrate —
   * the trivia question bank, for instance. The DO cannot load this itself
   * (it is a Postgres read), so it is carried for the room's whole lifetime:
   * a slot that gates later in the match still needs it at init time.
   */
  initContext: Partial<Record<MinigameKind, unknown>>;
  /** Monotonic, bumped on every state change; clients drop stale frames by it. */
  seq: number;
  /** Highest ordinal already persisted to Postgres, so replays are no-ops. */
  lastPersistedOrdinal: number;
  /**
   * Consecutive persist failures, bounding the retry so a durably-failing
   * origin cannot make every live match hammer the persist route forever.
   * Optional because rooms written before this field existed are still in
   * storage; absent reads as zero.
   */
  persistFailures?: number;
}

export async function loadRoom(
  ctx: DurableObjectState,
): Promise<RoomState | null> {
  const stored = await ctx.storage.get<RoomState>(KEY);
  return stored ?? null;
}

export function saveRoom(ctx: DurableObjectState, room: RoomState): void {
  // Deliberately not awaited — see the header comment on output gates.
  void ctx.storage.put(KEY, room);
}
