/**
 * MatchClient backed by the real routes and Realtime: seeds from the server
 * render, refetches the audience-filtered snapshot on every change ping, POSTs
 * the player's verbs, and runs a local ticker that nudges the advance route when
 * a persisted deadline passes. Drops in behind MatchClient — components unchanged.
 */
"use client";

import type { MatchClient, MatchView } from "./client";
import { pendingAdvance } from "./timers";
import { subscribeToMatch } from "@/lib/realtime/subscribe";

const TICK_MS = 250;

export interface RealtimeMatchOpts {
  tournamentId: string;
  matchId: string;
}

export class RealtimeMatchClient implements MatchClient {
  private view: MatchView;
  private readonly listeners = new Set<() => void>();
  private readonly base: string;
  private readonly matchId: string;
  private readonly unsubscribe: () => void;
  private readonly timer: ReturnType<typeof setInterval>;

  constructor(initialView: MatchView, opts: RealtimeMatchOpts) {
    this.view = initialView;
    this.matchId = opts.matchId;
    this.base = `/api/tournaments/${opts.tournamentId}/matches/${opts.matchId}`;
    this.unsubscribe = subscribeToMatch(
      opts.matchId,
      () => void this.refetch(),
    );
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  getView(): MatchView {
    return this.view;
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
      this.view = (await res.json()) as MatchView;
      for (const listener of this.listeners) listener();
    } catch {
      // Keep the last good view; the next ping or tick refetches.
    }
  }

  private tick(): void {
    const advance = pendingAdvance(this.view.match, Date.now());
    if (advance) {
      void this.post(`${this.base}/slots/${advance.event.ordinal}/advance`);
    }
  }
}
