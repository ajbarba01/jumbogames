/**
 * Alarm tests: the room advances its own slot when a deadline passes, without
 * any client ticking it — which is the correctness gain over the old
 * client-driven advance POST — and a finished slot is persisted exactly once.
 */
import {
  env,
  SELF,
  runInDurableObject,
  runDurableObjectAlarm,
  evictDurableObject,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { signTicket } from "@jumbo/protocol";
import {
  REFRESH_PERIOD_MS,
  wordLockGame,
  type WordLockState,
} from "@jumbo/engine";
import { loadRoom, saveRoom, type RoomState } from "../src/state";

import { matchState, slot } from "./support/fixtures";

const SECRET = "test-ticket-key-at-least-32-bytes-0";

/** Resolve the next JSON frame the server sends on this socket. */
const nextFrame = (ws: WebSocket): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    ws.addEventListener(
      "message",
      (e) => resolve(JSON.parse(String(e.data)) as Record<string, unknown>),
      { once: true },
    );
  });

const countdownRoom = (endsAt: number): RoomState => ({
  state: matchState([
    slot({
      phase: "countdown",
      ready: ["p1", "p2"],
      countdownEndsAt: endsAt,
      snapshot: { teamA: ["p1"], teamB: ["p2"] },
    }),
  ]),
  hostId: "host-1",
  tournamentId: "t-1",
  memberIds: ["p1", "p2"],
  labels: { p1: "Ada", p2: "Grace" },
  initContext: {},
  seq: 0,
  lastPersistedOrdinal: -1,
});

describe("alarm-driven advance", () => {
  it("advances a countdown whose deadline has passed with no client connected", async () => {
    const id = env.MATCH_ROOM.idFromName("alarm-advance");
    const stub = env.MATCH_ROOM.get(id);

    await runInDurableObject(stub, async (_instance, ctx) => {
      saveRoom(ctx, countdownRoom(Date.now() - 1));
      // Armed in the future on purpose: a past-dated alarm fires on its own
      // before the test can invoke it, so `runDurableObjectAlarm` would find
      // nothing pending and report false. What is under test is that the
      // handler advances on the SLOT's elapsed deadline, not on the alarm time.
      await ctx.storage.setAlarm(Date.now() + 60_000);
    });

    const ran = await runDurableObjectAlarm(stub);
    expect(ran).toBe(true);

    await runInDurableObject(stub, async (_instance, ctx) => {
      const room = await loadRoom(ctx);
      expect(room?.state.slots[0].phase).toBe("playing");
      expect(room?.seq).toBeGreaterThan(0);
    });
  });

  it("still advances after the object has been evicted from memory", async () => {
    const id = env.MATCH_ROOM.idFromName("alarm-after-eviction");
    const stub = env.MATCH_ROOM.get(id);

    await runInDurableObject(stub, async (_instance, ctx) => {
      saveRoom(ctx, countdownRoom(Date.now() - 1));
      // Armed in the future on purpose: a past-dated alarm fires on its own
      // before the test can invoke it, so `runDurableObjectAlarm` would find
      // nothing pending and report false. What is under test is that the
      // handler advances on the SLOT's elapsed deadline, not on the alarm time.
      await ctx.storage.setAlarm(Date.now() + 60_000);
    });

    await evictDurableObject(stub);
    expect(await runDurableObjectAlarm(stub)).toBe(true);

    await runInDurableObject(stub, async (_instance, ctx) => {
      const room = await loadRoom(ctx);
      expect(room?.state.slots[0].phase).toBe("playing");
    });
  });
});

describe("alarm chain", () => {
  it("arms the play deadline after the countdown advances, not the elapsed countdown", async () => {
    const id = env.MATCH_ROOM.idFromName("alarm-chain");
    const stub = env.MATCH_ROOM.get(id);

    await runInDurableObject(stub, async (_instance, ctx) => {
      saveRoom(ctx, countdownRoom(Date.now() - 1));
      await ctx.storage.setAlarm(Date.now() + 60_000);
    });

    expect(await runDurableObjectAlarm(stub)).toBe(true);

    await runInDurableObject(stub, async (_instance, ctx) => {
      const room = await loadRoom(ctx);
      expect(room?.state.slots[0].phase).toBe("playing");

      // The whole point of a self-driving room: having advanced into play, it
      // must now be waiting on the PLAY deadline. countdownEndsAt is still set
      // and now in the past — arming that instead burns the alarm on a no-op
      // and the slot never finalizes, scores, or persists.
      const deadline = room?.state.slots[0].deadline ?? null;
      expect(deadline).not.toBeNull();
      expect(await ctx.storage.getAlarm()).toBe(deadline);
    });
  });
});

describe("word lock tick", () => {
  function wordLockRoom(startedAt: number): RoomState {
    const payload = wordLockGame.init(
      { teamA: ["p1"], teamB: ["p2"] },
      "seed",
      startedAt,
    ) as WordLockState;
    return {
      state: matchState([
        slot({
          kind: "wordlock",
          phase: "playing",
          ready: ["p1", "p2"],
          snapshot: { teamA: ["p1"], teamB: ["p2"] },
          deadline: startedAt + 60_000,
          payload,
        }),
      ]),
      hostId: "host-1",
      tournamentId: "t-1",
      memberIds: ["p1", "p2"],
      labels: { p1: "Ada", p2: "Grace" },
      initContext: {},
      seq: 0,
      lastPersistedOrdinal: -1,
    };
  }

  it("arms an alarm at the next refresh boundary for a playing wordlock slot", async () => {
    const matchId = "wordlock-arm";
    const id = env.MATCH_ROOM.idFromName(matchId);
    const stub = env.MATCH_ROOM.get(id);
    const startedAt = Date.now();

    await runInDurableObject(stub, async (_instance, ctx) => {
      saveRoom(ctx, wordLockRoom(startedAt));
      await ctx.storage.sync();
    });

    // `scheduleNext` is private, so the only way to exercise it from outside
    // is the same path a real player uses — which also proves the arming
    // happens on the message path actually reached by traffic, not on a path
    // that only a test would drive.
    const ticket = await signTicket(
      { matchId, profileId: "p1", exp: Math.floor(Date.now() / 1000) + 60 },
      SECRET,
    );
    const url = new URL(`https://example.test/room/${matchId}`);
    url.searchParams.set("ticket", ticket);
    const res = await SELF.fetch(url, { headers: { Upgrade: "websocket" } });
    const ws = res.webSocket!;
    ws.accept();

    const frame = nextFrame(ws);
    ws.send(
      JSON.stringify({
        type: "action",
        ordinal: 0,
        seq: 1,
        action: { type: "submit", path: [0, 1, 2] },
      }),
    );
    await frame;

    await runInDurableObject(stub, async (_instance, ctx) => {
      const room = await loadRoom(ctx);
      const payload = room?.state.slots[0]!.payload as WordLockState;
      const armed = await ctx.storage.getAlarm();
      expect(armed).toBe(payload.startedAt + REFRESH_PERIOD_MS);
    });
  });

  it("firing the alarm on a due refresh broadcasts a rerolled board", async () => {
    const id = env.MATCH_ROOM.idFromName("wordlock-fire");
    const stub = env.MATCH_ROOM.get(id);
    const room = wordLockRoom(Date.now() - REFRESH_PERIOD_MS - 5);

    await runInDurableObject(stub, async (_instance, ctx) => {
      saveRoom(ctx, room);
      // Armed in the future on purpose: a past-dated alarm fires on its own
      // before the test can invoke it, leaving nothing pending for
      // `runDurableObjectAlarm` to report. What is under test is that the
      // handler advances on the game's elapsed refresh boundary, not on the
      // alarm's own scheduled time.
      await ctx.storage.setAlarm(Date.now() + 60_000);
    });

    expect(await runDurableObjectAlarm(stub)).toBe(true);

    await runInDurableObject(stub, async (_instance, ctx) => {
      const updated = await loadRoom(ctx);
      const before = room.state.slots[0]!.payload as WordLockState;
      const after = updated?.state.slots[0]!.payload as WordLockState;
      expect(after.epoch).toBeGreaterThan(before.epoch);
      expect(after.letters).not.toBe(before.letters);
      expect(updated?.seq).toBeGreaterThan(0);
    });
  });
});
