/**
 * The per-match Durable Object: authoritative for a slot's duration. Verifies a
 * short-lived connect ticket, hydrates match state from the Next app on first
 * use, and holds every client for this match on one single-threaded instance —
 * which is why no optimistic-version retry loop is needed here. Storage, not
 * instance memory, is the source of truth; hibernation may evict this object at
 * any time between messages.
 */
import { clientMessageSchema, verifyTicket } from "@jumbo/protocol";
import type {
  ServerErrorFrame,
  ServerFrame,
  ServerStateFrame,
} from "@jumbo/protocol";
import {
  actionSchemaFor,
  applyMatchEvent,
  MINIGAMES,
  derivePhase,
  pendingAdvance,
} from "@jumbo/engine";
import type { Env } from "./env";
import { loadRoom, saveRoom, type RoomState } from "./state";
import { fetchHydrate, postPersist } from "./origin";
import { broadcast, viewFor } from "./broadcast";

export interface Attachment {
  profileId: string;
  isPlayer: boolean;
}

/** Persist retry budget. Beyond this the slot waits for the next deadline. */
const PERSIST_MAX_RETRIES = 5;
const PERSIST_RETRY_MS = 5_000;

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
      ? await verifyTicket(ticket, this.env.REALTIME_TICKET_KEY)
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

    // Seed this socket immediately. Frames are otherwise only sent when
    // somebody acts, so a client that connects (or reconnects) mid-slot would
    // render whatever it last knew — indefinitely, since this transport has no
    // heartbeat — and a reconnecting client keeps its pre-drop authoritative
    // view, which may be arbitrarily stale.
    const frame: ServerStateFrame = {
      type: "state",
      seq: room.seq,
      serverNow: Date.now(),
      view: viewFor(room, attachment),
    };
    server.send(JSON.stringify(frame));

    return new Response(null, { status: 101, webSocket: client });
  }

  /**
   * Load the room, hydrating from the origin the first time it is needed.
   *
   * The roster it captures is never refreshed for the life of the match, and
   * `isPlayer` is decided from it once per connection and then frozen onto the
   * socket's attachment. That is only correct because DESIGN decision 17 makes
   * a roster change impossible while a team has a live match — join, leave and
   * kick all pass `requireRosterOpen`, which refuses for exactly the window in
   * which this object exists. Relax that rule and this object becomes wrong
   * immediately: a removed player keeps `isPlayer` and keeps acting. The engine
   * already has a `rosterChanged` event for that day; nothing here applies it.
   */
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
        initContext: hydrated.initContext,
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
        { now, games: MINIGAMES, initContext: room.initContext },
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
        { now, games: MINIGAMES, initContext: room.initContext },
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

  /**
   * Arm the alarm for whatever the match is next waiting on — a countdown
   * ending, a play deadline, or a scoring beat. The DO owns its own clock, so a
   * match progresses with no client connected at all.
   */
  private async scheduleNext(room: RoomState): Promise<void> {
    const now = Date.now();

    // Something is already due (an elapsed deadline, or a game that finished
    // early on its own terms — a trivia rope pin has no timestamp at all).
    // Arm immediately rather than computing a future instant that would leave
    // it unprocessed.
    if (pendingAdvance(room.state, now)) {
      await this.ctx.storage.setAlarm(now);
      return;
    }

    // Only the ACTIVE slot's phase-relevant timestamp counts. The reducer does
    // not clear a timestamp once its phase has passed — a slot in `playing`
    // still carries the countdownEndsAt it advanced through — so reducing over
    // every timestamp on every slot arms an instant in the past, workerd fires
    // it at once, pendingAdvance finds nothing due, and the handler returns
    // without re-arming. That leaves the real deadline unarmed and the match
    // wedged in `playing` forever.
    const phase = derivePhase(room.state);
    if (phase.kind === "complete") {
      await this.ctx.storage.deleteAlarm();
      return;
    }

    const slot = phase.slot;
    const next =
      slot.phase === "countdown"
        ? slot.countdownEndsAt
        : slot.phase === "playing"
          ? slot.deadline
          : slot.phase === "scoring"
            ? slot.scoringEndsAt
            : null;

    if (next === null) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(next);
  }

  /**
   * Fires when a slot's deadline passes. Applies every advance the engine says
   * is due, broadcasts, persists any slot that just finished, and re-arms for
   * whatever comes next.
   */
  async alarm(): Promise<void> {
    const room = await loadRoom(this.ctx);
    if (!room) return;

    const now = Date.now();
    let state = room.state;
    let seq = room.seq;

    // Several deadlines can be due at once after a hibernation gap; drain them
    // all rather than advancing one phase per alarm.
    for (let guard = 0; guard < 8; guard++) {
      const due = pendingAdvance(state, now);
      if (!due) break;
      const next = applyMatchEvent(state, due.event, {
        now,
        games: MINIGAMES,
        initContext: room.initContext,
      });
      if (next === state) break;
      state = next;
      seq += 1;
    }

    if (seq === room.seq) return;

    const updated: RoomState = { ...room, state, seq };
    saveRoom(this.ctx, updated);
    broadcast(this.ctx, updated, now);

    await this.persistFinished(updated);
    // persistFinished awaits a fetch, during which a client message can land
    // and move the room on. Arm from what storage actually holds now, not from
    // the snapshot this handler started with.
    const settled = (await loadRoom(this.ctx)) ?? updated;
    await this.scheduleNext(settled);
  }

  /**
   * Write back any slot that has finished since the last persist. Failure is
   * retried by the next alarm rather than lost; the slot stays replayable from
   * Postgres's last completed state until it succeeds.
   */
  private async persistFinished(room: RoomState): Promise<void> {
    const done = room.state.slots
      .filter((slot) => slot.phase === "done")
      .map((slot) => slot.ordinal);
    const highest = done.length === 0 ? -1 : Math.max(...done);
    if (highest <= room.lastPersistedOrdinal) return;

    // MatchState carries its own matchId, so this does not depend on the object
    // having been addressed by name — ctx.id.name is undefined for an id created
    // any other way, and that failure would be silent.
    const ok = await postPersist(
      this.env,
      room.state.matchId,
      room.state,
      highest,
    );

    // Re-read before writing. Cloudflare's input gates defer incoming events
    // only while a STORAGE operation is outstanding — they do not cover fetch.
    // A player's message can therefore be delivered during the request above,
    // bump seq, and be written; writing back the pre-fetch snapshot would
    // rewind seq and silently discard that action, and every client (which
    // already holds the higher seq) would drop frames until the room caught
    // back up.
    const current = await loadRoom(this.ctx);
    if (!current) return;

    if (!ok) {
      // Bounded retry: an origin that is durably down (rotated secret, 500s)
      // must not make every live match hammer /persist forever with no client
      // connected. Back off, then give up and leave the slot for the next
      // natural deadline — Postgres still holds the last completed state.
      const failures = (current.persistFailures ?? 0) + 1;
      saveRoom(this.ctx, { ...current, persistFailures: failures });
      if (failures <= PERSIST_MAX_RETRIES) {
        const backoff = PERSIST_RETRY_MS * 2 ** (failures - 1);
        await this.ctx.storage.setAlarm(Date.now() + backoff);
      }
      return;
    }
    saveRoom(this.ctx, {
      ...current,
      lastPersistedOrdinal: highest,
      persistFailures: 0,
    });
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
