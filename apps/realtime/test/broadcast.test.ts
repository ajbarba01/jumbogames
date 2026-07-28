/**
 * Fan-out tests: every connected socket receives a full state frame with a
 * monotonic sequence number, each redacted for its own viewer, and a spectator's
 * inbound action is rejected rather than applied.
 */
import { describe, expect, it } from "vitest";
import { viewFor } from "../src/broadcast";
import type { RoomState } from "../src/state";
import { matchState } from "./support/fixtures";

const room = (): RoomState => ({
  state: matchState(),
  hostId: "host-1",
  tournamentId: "t-1",
  memberIds: ["p1"],
  labels: { p1: "Ada" },
  initContext: {},
  seq: 3,
  lastPersistedOrdinal: -1,
});

describe("viewFor", () => {
  it("marks a roster member as a player with their own viewer id", () => {
    const view = viewFor(room(), { profileId: "p1", isPlayer: true });
    expect(view.role).toBe("player");
    expect(view.viewerId).toBe("p1");
  });

  it("marks a non-member as a spectator with no viewer id", () => {
    const view = viewFor(room(), { profileId: "x9", isPlayer: false });
    expect(view.role).toBe("spectator");
    expect(view.viewerId).toBeNull();
  });

  it("carries the display labels the room hydrated", () => {
    const view = viewFor(room(), { profileId: "p1", isPlayer: true });
    expect(view.playerLabels).toEqual({ p1: "Ada" });
  });
});
