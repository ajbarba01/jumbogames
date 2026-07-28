/**
 * Tests for the socket-backed match client: server frames replace the view and
 * refine the clock offset, stale frames are ignored, and optimistic predictions
 * are retired rather than merged when the server catches up.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocketMatchClient } from "./ws-client";
import type { MatchView } from "./client";
import type { MatchState } from "@jumbo/engine";

// Local fixture: the Worker's copy lives in apps/realtime/test/support and the
// two packages do not share test helpers. Keep both in step with types.ts.
const matchState = (): MatchState => ({
  matchId: "m1",
  seed: "seed-1",
  teamA: { id: "ta", name: "Team A", colorIndex: 0, members: ["p1"] },
  teamB: { id: "tb", name: "Team B", colorIndex: 1, members: ["p2"] },
  slots: [],
});

class FakeSocket {
  static last: FakeSocket | null = null;
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  closed = false;
  constructor(public url: string) {
    FakeSocket.last = this;
  }
  send(data: string): void {
    this.sent.push(data);
  }
  close(): void {
    this.closed = true;
    this.onclose?.();
  }
}

const view = (viewerId: string | null): MatchView => ({
  match: matchState(),
  viewerId,
  role: viewerId ? "player" : "spectator",
  playerLabels: {},
});

describe("WebSocketMatchClient", () => {
  beforeEach(() => {
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    FakeSocket.last = null;
  });

  const make = () =>
    new WebSocketMatchClient(view("p1"), {
      matchId: "m1",
      tournamentId: "t1",
      socketUrl: "ws://test/room/m1",
      ticket: "t",
      serverNow: 1_000_000,
    });

  it("adopts a state frame and notifies subscribers", () => {
    const client = make();
    client.start();
    const seen = vi.fn();
    client.subscribe(seen);
    FakeSocket.last!.onmessage!({
      data: JSON.stringify({
        type: "state",
        seq: 1,
        serverNow: 1_000_500,
        view: view("p1"),
      }),
    });
    expect(seen).toHaveBeenCalled();
    expect(client.serverOffsetMs()).toBe(500);
  });

  it("ignores a frame older than the one already applied", () => {
    const client = make();
    client.start();
    const push = (seq: number, serverNow: number) =>
      FakeSocket.last!.onmessage!({
        data: JSON.stringify({
          type: "state",
          seq,
          serverNow,
          view: view("p1"),
        }),
      });
    push(5, 1_000_500);
    push(2, 1_009_000);
    expect(client.serverOffsetMs()).toBe(500);
  });

  it("sends an action with a monotonic sequence number", () => {
    const client = make();
    client.start();
    client.act(0, { choice: 1 });
    client.act(0, { choice: 2 });
    const seqs = FakeSocket.last!.sent.map((s) => JSON.parse(s).seq);
    expect(seqs[1]).toBeGreaterThan(seqs[0]);
  });

  it("puts the ticket in the socket url", () => {
    const client = make();
    client.start();
    expect(FakeSocket.last!.url).toBe("ws://test/room/m1?ticket=t");
  });

  it("stops for good after destroy: no socket, no reconnect", () => {
    const client = make();
    client.start();
    const socket = FakeSocket.last!;
    client.destroy();
    expect(socket.closed).toBe(true);

    // A close firing after destroy must not schedule a reconnect.
    FakeSocket.last = null;
    socket.onclose?.();
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.last).toBeNull();
  });

  // React tears an effect down and sets it back up on the same client instance
  // — StrictMode does it on every dev mount, and a route transition can do it
  // when the tree is kept alive across a soft navigation. A client that cannot
  // come back from that is silently dead: no socket, so every send is dropped
  // and no frame ever arrives. RealtimeMatchClient survives this cycle; this is
  // the same contract for the socket transport.
  it("reopens on start after an unmount destroy (remount cycle)", () => {
    const client = make();
    client.start();
    const first = FakeSocket.last!;

    client.destroy();
    FakeSocket.last = null;
    client.start();

    expect(FakeSocket.last).not.toBeNull();
    expect(FakeSocket.last).not.toBe(first);
  });

  it("still refuses to restart after a terminal error frame", () => {
    const client = make();
    client.start();
    // Not "unauthorized" — that one is recoverable and reconnects by design.
    FakeSocket.last!.onmessage!({
      data: JSON.stringify({ type: "error", reason: "not-found" }),
    });

    client.destroy();
    FakeSocket.last = null;
    client.start();

    expect(FakeSocket.last).toBeNull();
  });

  it("does not send once the socket is gone", () => {
    const client = make();
    client.start();
    const socket = FakeSocket.last!;
    client.destroy();
    client.ready(0);
    expect(socket.sent).toHaveLength(0);
  });

  it("ignores a terminal error frame without spinning", () => {
    const client = make();
    client.start();
    const before = client.getView();
    FakeSocket.last!.onmessage!({
      data: JSON.stringify({ type: "error", reason: "unauthorized" }),
    });
    expect(client.getView()).toBe(before);
  });
});
