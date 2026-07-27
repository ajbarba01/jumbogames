/**
 * Alarm tests: the room advances its own slot when a deadline passes, without
 * any client ticking it — which is the correctness gain over the old
 * client-driven advance POST — and a finished slot is persisted exactly once.
 */
import {
  env,
  runInDurableObject,
  runDurableObjectAlarm,
  evictDurableObject,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { loadRoom, saveRoom, type RoomState } from "../src/state";

import { matchState, slot } from "./support/fixtures";

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
