/**
 * MatchClient backed by the realtime Worker: seeds from the server render,
 * opens one WebSocket per match, and replaces its view from full state frames
 * rather than refetching. Optimistic predictions are held per pending sequence
 * number and retired — never merged — when the server catches up. Construct it
 * cheaply; call start() from an effect and destroy() to stop.
 */
"use client";

import {
  canPredict,
  predictSlot,
  retirePredictions,
  type Pending,
} from "@jumbo/engine";
import type { ClientMessage, ServerFrame } from "@jumbo/protocol";
import type { MatchClient, MatchView } from "./client";

const BACKOFF_MIN_MS = 250;
const BACKOFF_MAX_MS = 4000;

export interface WebSocketMatchOpts {
  tournamentId: string;
  matchId: string;
  socketUrl: string;
  ticket: string;
  serverNow: number;
}

export class WebSocketMatchClient implements MatchClient {
  private view: MatchView;
  private authoritative: MatchView;
  private offsetMs: number;
  private seq = 0;
  private lastServerSeq = -1;
  private pending: Pending[] = [];
  private socket: WebSocket | null = null;
  private backoff = BACKOFF_MIN_MS;
  // Two different reasons to hold no socket, and they must not be conflated.
  // `active` is the mounted/unmounted axis: destroy() clears it so a close
  // cannot reconnect behind an unmounted view, but start() may set it again —
  // React runs an effect's cleanup and setup on one instance across a
  // StrictMode double-invoke or a soft-navigation remount, and a client that
  // treated destroy() as final would come back dead. `terminal` is the
  // give-up axis and is never cleared.
  private active = false;
  private terminal = false;
  private ticket: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(
    initialView: MatchView,
    private readonly opts: WebSocketMatchOpts,
  ) {
    this.view = initialView;
    this.authoritative = initialView;
    this.offsetMs = opts.serverNow - Date.now();
    this.ticket = opts.ticket;
  }

  start(): void {
    if (this.socket || this.active || this.terminal) return;
    this.active = true;
    this.open();
  }

  getView(): MatchView {
    return this.view;
  }

  serverOffsetMs(): number {
    return this.offsetMs;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  ready(ordinal: number): void {
    this.send({ type: "ready", ordinal, seq: ++this.seq });
  }

  forceStart(ordinal: number): void {
    this.send({ type: "forceStart", ordinal, seq: ++this.seq });
  }

  act(ordinal: number, action: unknown): void {
    const seq = ++this.seq;
    this.send({
      type: "action",
      ordinal,
      seq,
      action: action as Record<string, unknown>,
    });

    // Tier 2 optimism: predict locally only when the game declares it can be
    // predicted from redacted state. Tier 1 games get acknowledgement feedback
    // from their surface instead, with no state change here.
    const slot = this.view.match.slots.find((s) => s.ordinal === ordinal);
    const viewerId = this.view.viewerId;
    if (!slot || !viewerId || !canPredict(slot.kind)) return;

    const now = Date.now() + this.offsetMs;
    const predicted = predictSlot(
      this.authoritative.match,
      ordinal,
      viewerId,
      action,
      now,
    );
    if (predicted === this.authoritative.match) return;

    this.pending = [
      ...this.pending,
      { seq, state: predicted, createdAt: Date.now() },
    ];
    this.view = { ...this.authoritative, match: predicted };
    this.emit();
  }

  destroy(): void {
    // Cleared before the close below, so the onclose it triggers sees an
    // inactive client and does not schedule a reconnect.
    this.active = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.socket?.close();
    this.socket = null;
    this.listeners.clear();
  }

  private open(): void {
    const url = `${this.opts.socketUrl}?ticket=${encodeURIComponent(this.ticket)}`;
    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.backoff = BACKOFF_MIN_MS;
    };
    socket.onmessage = (event: MessageEvent) => {
      this.receive(String(event.data));
    };
    socket.onclose = () => {
      this.socket = null;
      if (this.active && !this.terminal) this.scheduleReconnect();
    };
  }

  private receive(raw: string): void {
    let frame: ServerFrame;
    try {
      frame = JSON.parse(raw) as ServerFrame;
    } catch {
      return;
    }
    if (frame.type === "error") {
      // "unauthorized" is the recoverable one — almost always an expired
      // ticket — so let the close handler reconnect with a fresh one. The
      // rest are terminal for this viewer: retrying a match that does not
      // exist, or an origin that cannot hydrate, just loops forever at the
      // backoff ceiling. Stop and leave the seeded view on screen.
      if (frame.reason !== "unauthorized") this.terminal = true;
      return;
    }
    // Frames can arrive out of order across a reconnect; older ones are stale.
    if (frame.seq <= this.lastServerSeq) return;

    this.lastServerSeq = frame.seq;
    this.offsetMs = frame.serverNow - Date.now();
    this.authoritative = frame.view;

    // Server state always wins. Surviving predictions are re-layered on top for
    // display; they are never merged into authoritative state.
    this.pending = retirePredictions(this.pending, frame.seq, Date.now());
    const newest = this.pending[this.pending.length - 1];
    this.view = newest ? { ...frame.view, match: newest.state } : frame.view;
    this.emit();
  }

  private send(message: ClientMessage): void {
    if (this.socket?.readyState !== 1) return;
    this.socket.send(JSON.stringify(message));
  }

  private scheduleReconnect(): void {
    const delay = this.backoff;
    this.backoff = Math.min(this.backoff * 2, BACKOFF_MAX_MS);
    this.reconnectTimer = setTimeout(() => {
      void this.refreshTicketAndOpen();
    }, delay);
  }

  private async refreshTicketAndOpen(): Promise<void> {
    if (!this.active || this.terminal) return;
    try {
      const res = await fetch(
        `/api/tournaments/${this.opts.tournamentId}/matches/${this.opts.matchId}/ticket`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const { ticket } = (await res.json()) as { ticket: string };
        this.ticket = ticket;
      }
    } catch {
      // Keep the old ticket and try anyway; the next close reschedules.
    }
    // A destroy() can land while the ticket fetch is in flight; re-check before
    // opening, or a torn-down client resurrects itself with a live socket.
    if (!this.active || this.terminal) return;
    // Every prediction is abandoned across a reconnect — the authoritative
    // state on the far side may have moved arbitrarily far.
    this.pending = [];
    this.open();
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}
