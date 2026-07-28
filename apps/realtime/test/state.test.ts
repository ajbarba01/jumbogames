/**
 * Storage tests for the room: state round-trips through ctx.storage, and — the
 * property that matters most — survives the object being evicted from memory
 * mid-match, which is exactly what WebSocket hibernation does.
 */
import { env, runInDurableObject, evictDurableObject } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { loadRoom, saveRoom, type RoomState } from "../src/state";
import { matchState } from "./support/fixtures";

const room: RoomState = {
  state: matchState(),
  hostId: "host-1",
  tournamentId: "t-1",
  memberIds: ["p1", "p2"],
  labels: { p1: "Ada", p2: "Grace" },
  initContext: {},
  seq: 7,
  lastPersistedOrdinal: -1,
};

describe("room storage", () => {
  it("round-trips through storage", async () => {
    const id = env.MATCH_ROOM.idFromName("storage-roundtrip");
    const stub = env.MATCH_ROOM.get(id);
    await runInDurableObject(stub, async (_instance, ctx) => {
      saveRoom(ctx, room);
      await expect(loadRoom(ctx)).resolves.toEqual(room);
    });
  });

  it("survives eviction from memory", async () => {
    const id = env.MATCH_ROOM.idFromName("storage-eviction");
    const stub = env.MATCH_ROOM.get(id);
    await runInDurableObject(stub, async (_instance, ctx) => {
      saveRoom(ctx, room);
    });

    await evictDurableObject(stub);

    await runInDurableObject(stub, async (_instance, ctx) => {
      const reloaded = await loadRoom(ctx);
      expect(reloaded?.seq).toBe(7);
      expect(reloaded?.labels.p2).toBe("Grace");
    });
  });

  it("returns null for a room that was never written", async () => {
    const id = env.MATCH_ROOM.idFromName("storage-empty");
    const stub = env.MATCH_ROOM.get(id);
    await runInDurableObject(stub, async (_instance, ctx) => {
      await expect(loadRoom(ctx)).resolves.toBeNull();
    });
  });
});
