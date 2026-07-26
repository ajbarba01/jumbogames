/**
 * React half of the derived event log: holds the previous scores map across
 * payload pushes, runs the pure diff, and keeps the newest few rows. State is
 * adjusted during render rather than in an effect (React's "you might not
 * need an effect" pattern) so a push does not cascade a second commit.
 */
"use client";

import { useState } from "react";
import {
  deriveTickerEvents,
  type TickerEvent,
} from "@/lib/minigames/trivia/ticker";
import type { RosterSnapshot } from "@/lib/minigames/types";

/** Rows kept on screen; the list reserves height for exactly this many via
 *  the hand-tuned `h-24`/`h-28` classes on `Ticker` in `TriviaPlay.tsx` —
 *  changing this constant does not resize that reservation, so update both
 *  together. */
export const TICKER_LENGTH = 4;

export function useTicker(
  scores: Record<string, number>,
  snapshot: RosterSnapshot,
): TickerEvent[] {
  const [state, setState] = useState<{
    prev: Record<string, number>;
    events: TickerEvent[];
    nextId: number;
  }>({ prev: scores, events: [], nextId: 1 });

  if (state.prev !== scores) {
    const { events, nextId } = deriveTickerEvents(
      state.prev,
      scores,
      snapshot,
      state.nextId,
    );
    setState({
      prev: scores,
      events: events.length
        ? [...events, ...state.events].slice(0, TICKER_LENGTH)
        : state.events,
      nextId,
    });
  }

  return state.events;
}
