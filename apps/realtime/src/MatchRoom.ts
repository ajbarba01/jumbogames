/**
 * The per-match Durable Object: authoritative for a slot's duration. Verifies a
 * short-lived connect ticket, hydrates match state from the Next app on first
 * use, and holds every client for this match on one single-threaded instance —
 * which is why no optimistic-version retry loop is needed here. Storage, not
 * instance memory, is the source of truth; hibernation may evict this object at
 * any time between messages.
 */
import { clientMessageSchema, verifyTicket } from "@jumbo/protocol";
import type { ServerErrorFrame, ServerFrame } from "@jumbo/protocol";
import { actionSchemaFor, applyMatchEvent, MINIGAMES } from "@jumbo/engine";
import type { Env } from "./env";
import { loadRoom, saveRoom, type RoomState } from "./state";
import { fetchHydrate } from "./origin";
import { broadcast } from "./broadcast";

export interface Attachment {
  profileId: string;
  isPlayer: boolean;
}

export class MatchRoom implements DurableObject {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {
    // Keepalives must not wake a hibernating object.
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

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

    // Serialize the whole check-then-hydrate. Without this, every player
    // connecting at slot start sees an empty room and races a hydrate: the
    // first one's state takes a message and bumps seq, then a second in-flight
    // hydrate lands and overwrites it back to seq 0, silently discarding play.
    // The re-check inside the lock is what closes the window — awaiting the
    // lock alone would still let the loser overwrite the winner.
    return this.ctx.blockConcurrencyWhile(async () => {
      const settled = await loadRoom(this.ctx);
      if (settled) return settled;

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
    });
  }

  async webSocketMessage(
    ws: WebSocket,
    raw: string | ArrayBuffer,
  ): Promise<void> {
    // Identity comes off the socket, not off `this` — after hibernation this
    // object may be brand new while the socket is the same one.
    const viewer = ws.deserializeAttachment() as Attachment | null;
    if (!viewer) return;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(typeof raw === "string" ? raw : "");
    } catch {
      return this.reject(ws, "invalid");
    }

    const message = clientMessageSchema.safeParse(parsedJson);
    if (!message.success) return this.reject(ws, "invalid");

    const room = await loadRoom(this.ctx);
    if (!room) return this.reject(ws, "hydrate-failed");

    const slot = room.state.slots.find(
      (s) => s.ordinal === message.data.ordinal,
    );
    if (!slot) return this.reject(ws, "not-found");

    // Spectators read only. forceStart is host-only. Both are enforced here,
    // server-side, exactly as the route handlers enforced them.
    if (!viewer.isPlayer) return this.reject(ws, "unauthorized");
    if (
      message.data.type === "forceStart" &&
      viewer.profileId !== room.hostId
    ) {
      return this.reject(ws, "unauthorized");
    }

    const now = Date.now();
    let next = room.state;

    if (message.data.type === "action") {
      // The per-kind schema is the real validation; the wire schema only
      // established that an action object is present.
      const action = actionSchemaFor(slot.kind).safeParse(message.data.action);
      if (!action.success) return this.reject(ws, "invalid");
      next = applyMatchEvent(
        room.state,
        {
          type: "gameAction",
          ordinal: message.data.ordinal,
          playerId: viewer.profileId,
          action: action.data,
        },
        { now, games: MINIGAMES, initContext: {} },
      );
    } else {
      next = applyMatchEvent(
        room.state,
        message.data.type === "ready"
          ? {
              type: "playerReady",
              ordinal: message.data.ordinal,
              playerId: viewer.profileId,
            }
          : // The wire message is "forceStart"; the engine event is
            // "hostForceStart". Do not rename either — the wire name matches
            // the MatchClient verb, the event name matches the reducer.
            { type: "hostForceStart", ordinal: message.data.ordinal },
        { now, games: MINIGAMES, initContext: {} },
      );
    }

    // Idempotent events return the same object; nothing to write or broadcast.
    if (next === room.state) return;

    const updated: RoomState = { ...room, state: next, seq: room.seq + 1 };
    saveRoom(this.ctx, updated);
    broadcast(this.ctx, updated, now);
    await this.scheduleNext(updated);
  }

  webSocketClose(): void {
    // Nothing to clean up: identity lives on the socket's attachment, and the
    // object hibernates on its own once no work is pending.
  }

  webSocketError(): void {
    // Same as close — the runtime removes the socket from getWebSockets().
  }

  /** Arm the alarm for the active slot's next deadline. Implemented with alarms. */
  private async scheduleNext(_room: RoomState): Promise<void> {
    return;
  }

  private reject(ws: WebSocket, reason: ServerErrorFrame["reason"]): void {
    ws.send(JSON.stringify({ type: "error", reason } satisfies ServerFrame));
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
