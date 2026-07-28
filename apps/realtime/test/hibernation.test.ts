/**
 * The load-bearing hibernation property: a socket's identity lives on its
 * serialized attachment, not on the Durable Object's instance memory, so a
 * message sent after the object has been evicted is still attributed to the
 * right viewer. If identity were cached on `this`, the object rebuilt after
 * eviction would have no idea who the socket belongs to.
 */
import {
  env,
  SELF,
  runInDurableObject,
  evictDurableObject,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { signTicket } from "@jumbo/protocol";
import { saveRoom, type RoomState } from "../src/state";
import { matchState, slot } from "./support/fixtures";

const SECRET = "test-ticket-key-at-least-32-bytes-0";
const MATCH = "hibernation-match";

// Seeded directly into storage so the connect path finds an existing room and
// never reaches the (deliberately dead) origin. Phase "gate" is what makes
// playerReady a real state change rather than a no-op.
const seeded = (): RoomState => ({
  state: matchState([slot({ phase: "gate" })]),
  hostId: "p1",
  tournamentId: "t-1",
  memberIds: ["p1", "p2"],
  labels: { p1: "Ada", p2: "Grace" },
  initContext: {},
  seq: 0,
  lastPersistedOrdinal: -1,
});

/** Resolve the next JSON frame the server sends on this socket. */
const nextFrame = (ws: WebSocket): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    ws.addEventListener(
      "message",
      (e) => resolve(JSON.parse(String(e.data)) as Record<string, unknown>),
      { once: true },
    );
  });

describe("hibernation", () => {
  it("still attributes a message to its sender after the object is evicted", async () => {
    const id = env.MATCH_ROOM.idFromName(MATCH);
    const stub = env.MATCH_ROOM.get(id);

    await runInDurableObject(stub, async (_instance, ctx) => {
      saveRoom(ctx, seeded());
      await ctx.storage.sync();
    });

    const ticket = await signTicket(
      {
        matchId: MATCH,
        profileId: "p1",
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      SECRET,
    );
    const url = new URL(`https://example.test/room/${MATCH}`);
    url.searchParams.set("ticket", ticket);
    const res = await SELF.fetch(url, { headers: { Upgrade: "websocket" } });
    const ws = res.webSocket;
    expect(ws).toBeTruthy();
    ws!.accept();

    // Evict AFTER the socket is established. The socket survives; the object's
    // memory does not. Anything cached on `this` is gone from here on.
    await evictDurableObject(stub);

    const frame = nextFrame(ws!);
    ws!.send(JSON.stringify({ type: "ready", ordinal: 0, seq: 1 }));

    const received = await frame;
    expect(received.type).toBe("state");
    // Attributed to p1 — proof the attachment, not instance memory, carried the
    // identity across the eviction.
    const view = received.view as { viewerId: string | null; role: string };
    expect(view.viewerId).toBe("p1");
    expect(view.role).toBe("player");

    // And the reducer actually ran as p1: p1 is now ready, p2 is not.
    await runInDurableObject(stub, async (_instance, ctx) => {
      const room = await ctx.storage.get<RoomState>("room");
      expect(room?.state.slots[0].ready).toEqual(["p1"]);
      expect(room?.seq).toBe(1);
    });
  });

  it("rejects a spectator's action after eviction, server-side", async () => {
    const id = env.MATCH_ROOM.idFromName("hibernation-spectator");
    const stub = env.MATCH_ROOM.get(id);

    await runInDurableObject(stub, async (_instance, ctx) => {
      saveRoom(ctx, seeded());
      await ctx.storage.sync();
    });

    // "x9" is on neither team, so the room admits them as a spectator.
    const ticket = await signTicket(
      {
        matchId: "hibernation-spectator",
        profileId: "x9",
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      SECRET,
    );
    const url = new URL("https://example.test/room/hibernation-spectator");
    url.searchParams.set("ticket", ticket);
    const res = await SELF.fetch(url, { headers: { Upgrade: "websocket" } });
    res.webSocket!.accept();

    await evictDurableObject(stub);

    const frame = nextFrame(res.webSocket!);
    res.webSocket!.send(JSON.stringify({ type: "ready", ordinal: 0, seq: 1 }));

    await expect(frame).resolves.toMatchObject({
      type: "error",
      reason: "unauthorized",
    });
  });
});
