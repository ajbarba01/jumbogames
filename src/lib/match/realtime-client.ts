/**
 * MatchClient backed by the real routes and Realtime: seeds from the server
 * render, refetches the audience-filtered snapshot on every change ping, POSTs
 * the player's verbs, and runs a local ticker that nudges the advance route when
 * a persisted deadline passes. Drops in behind MatchClient — components unchanged.
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
  private readonly unsubscribe: () => void;
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly heartbeat: ReturnType<typeof setInterval>;

  constructor(initialView: MatchView, opts: RealtimeMatchOpts) {
    this.view = initialView;
    this.offsetMs = opts.serverNow - Date.now();
    this.matchId = opts.matchId;
    this.base = `/api/tournaments/${opts.tournamentId}/matches/${opts.matchId}`;
    this.unsubscribe = subscribeToMatch(
      opts.matchId,
      () => void this.refetch(),
    );
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.heartbeat = setInterval(() => void this.refetch(), HEARTBEAT_MS);
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
    clearInterval(this.timer);
    clearInterval(this.heartbeat);
    this.unsubscribe();
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
