/**
 * The per-match Durable Object: authoritative for a slot's duration. Verifies a
 * short-lived connect ticket, hydrates match state from the Next app on first
 * use, and holds every client for this match on one single-threaded instance —
 * which is why no optimistic-version retry loop is needed here. Storage, not
 * instance memory, is the source of truth; hibernation may evict this object at
 * any time between messages.
 */
import { verifyTicket } from "@jumbo/protocol";
import type { ServerErrorFrame, ServerFrame } from "@jumbo/protocol";
import type { Env } from "./env";
import { loadRoom, saveRoom, type RoomState } from "./state";
import { fetchHydrate } from "./origin";

export interface Attachment {
  profileId: string;
  isPlayer: boolean;
}

export class MatchRoom implements DurableObject {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const matchId = url.pathname.replace(/^\/room\//, "");
    const ticket = url.searchParams.get("ticket");

    const [client, server] = Object.values(new WebSocketPair());

    const claims = ticket
      ? await verifyTicket(ticket, this.env.REALTIME_SHARED_SECRET)
      : null;
    if (!claims || claims.matchId !== matchId) {
      return this.refuse(client, server, "unauthorized");
    }

    const room = await this.room(matchId);
    if (!room) return this.refuse(client, server, "hydrate-failed");

    const attachment: Attachment = {
      profileId: claims.profileId,
      isPlayer: room.memberIds.includes(claims.profileId),
    };
    // Attachments survive hibernation; instance fields do not. Identity must
    // live here or a rehydrated object cannot tell who a socket belongs to.
    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);

    return new Response(null, { status: 101, webSocket: client });
  }

  /** Load the room, hydrating from the origin the first time it is needed. */
  private async room(matchId: string): Promise<RoomState | null> {
    const existing = await loadRoom(this.ctx);
    if (existing) return existing;

    const hydrated = await fetchHydrate(this.env, matchId);
    if (!hydrated) return null;

    const room: RoomState = {
      state: hydrated.state,
      hostId: hydrated.hostId,
      tournamentId: hydrated.tournamentId,
      memberIds: hydrated.memberIds,
      labels: hydrated.labels,
      seq: 0,
      lastPersistedOrdinal: -1,
    };
    saveRoom(this.ctx, room);
    return room;
  }

  private refuse(
    client: WebSocket,
    server: WebSocket,
    reason: ServerErrorFrame["reason"],
  ): Response {
    server.accept();
    server.send(
      JSON.stringify({ type: "error", reason } satisfies ServerFrame),
    );
    server.close(1008, reason);
    return new Response(null, { status: 101, webSocket: client });
  }
}
