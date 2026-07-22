/**
 * MatchClient backed by the real routes and Realtime: seeds from the server
 * render, refetches the audience-filtered snapshot on every change ping, POSTs
 * the player's verbs, and runs a local ticker that nudges the advance route when
 * a persisted deadline passes. Construct it cheaply; call start() from an effect
 * to begin IO and destroy() to stop. Drops in behind MatchClient.
 */
"use client";

import type { MatchClient, MatchSnapshotPayload, MatchView } from "./client";
import { pendingAdvance } from "./timers";
import { subscribeToMatch } from "@/lib/realtime/subscribe";

const TICK_MS = 250;
// The ticker notices a passed deadline every TICK_MS, but the advance POST is
// idempotent server-side, so retry it at most once a second while due — the
// 250ms cadence would otherwise spam the serverless route four times a second.
const ADVANCE_RETRY_MS = 1000;
// A slow poll that bounds staleness if a Realtime ping is dropped: without it a
// client whose websocket missed a change freezes until its own next POST.
// Realtime stays the fast path; this only backstops it.
const HEARTBEAT_MS = 5000;

export interface RealtimeMatchOpts {
  tournamentId: string;
  matchId: string;
  // Server wall clock at seed time, used to bootstrap the clock offset before
  // the first refetch refines it.
  serverNow: number;
}

export class RealtimeMatchClient implements MatchClient {
  private view: MatchView;
  // Estimated serverClock - clientClock, so timestamp comparisons on this
  // (possibly skewed) client read against server time. Seeded here, refined by
  // every refetch.
  private offsetMs: number;
  private lastAdvanceAt = 0;
  private readonly listeners = new Set<() => void>();
  private readonly base: string;
  private readonly matchId: string;
  private unsubscribe: (() => void) | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;

  constructor(initialView: MatchView, opts: RealtimeMatchOpts) {
    this.view = initialView;
    this.offsetMs = opts.serverNow - Date.now();
    this.matchId = opts.matchId;
    this.base = `/api/tournaments/${opts.tournamentId}/matches/${opts.matchId}`;
  }

  // Begin IO: the Realtime subscription and the tick/heartbeat timers. Kept out
  // of the constructor and driven from an effect, because React StrictMode and
  // Fast Refresh double-invoke a useState initializer — a side-effectful
  // constructor there leaks a second client whose subscription and timers run
  // forever with nothing mounted to them. Idempotent; pairs with destroy().
  start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = subscribeToMatch(
      this.matchId,
      () => void this.refetch(),
    );
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.heartbeat = setInterval(() => void this.refetch(), HEARTBEAT_MS);
    void this.refetch();
  }

  getView(): MatchView {
    return this.view;
  }

  serverOffsetMs(): number {
    return this.offsetMs;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  ready(ordinal: number): void {
    void this.post(`${this.base}/slots/${ordinal}/ready`);
  }

  act(ordinal: number, action: unknown): void {
    void this.post(`${this.base}/slots/${ordinal}/action`, action);
  }

  forceStart(ordinal: number): void {
    void this.post(`${this.base}/slots/${ordinal}/force-start`);
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.unsubscribe) this.unsubscribe();
    this.timer = null;
    this.heartbeat = null;
    this.unsubscribe = null;
    this.listeners.clear();
  }

  private async post(url: string, body?: unknown): Promise<void> {
    try {
      await fetch(url, {
        method: "POST",
        headers:
          body === undefined
            ? undefined
            : { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      // The change ping (or the next tick) reconverges; a dropped verb is retried
      // by the user or absorbed by the server's idempotent no-ops.
    }
    await this.refetch();
  }

  private async refetch(): Promise<void> {
    try {
      const res = await fetch(this.base, { cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as MatchSnapshotPayload;
      this.view = payload.view;
      this.offsetMs = payload.serverNow - Date.now();
      for (const listener of this.listeners) listener();
    } catch {
      // Keep the last good view; the next ping or tick refetches.
    }
  }

  private tick(): void {
    const advance = pendingAdvance(this.view.match, Date.now() + this.offsetMs);
    if (!advance) return;
    const now = Date.now();
    if (now - this.lastAdvanceAt < ADVANCE_RETRY_MS) return;
    this.lastAdvanceAt = now;
    void this.post(`${this.base}/slots/${advance.event.ordinal}/advance`);
  }
}
