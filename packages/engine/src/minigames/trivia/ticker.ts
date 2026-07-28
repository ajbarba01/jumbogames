/**
 * The trivia surface's anonymized event log, derived rather than fed: the
 * payload carries per-player scores and no event stream, so a change is
 * whatever moved between two pushes. Two answers landing inside one push
 * merge into a single summed row, and a player first seen in a push seeds a
 * baseline instead of reading as a gain — a spectator arriving at minute two
 * should not have the whole match land at once.
 */
import type { RosterSnapshot } from "../types";

export interface TickerEvent {
  id: number;
  side: "A" | "B";
  delta: number;
}

function sideOf(playerId: string, snapshot: RosterSnapshot): "A" | "B" | null {
  if (snapshot.teamA.includes(playerId)) return "A";
  if (snapshot.teamB.includes(playerId)) return "B";
  return null;
}

export function deriveTickerEvents(
  prev: Record<string, number>,
  next: Record<string, number>,
  snapshot: RosterSnapshot,
  nextId: number,
): { events: TickerEvent[]; nextId: number } {
  const events: TickerEvent[] = [];
  let id = nextId;
  // Sorted so the order of two changes inside one push is stable rather than
  // dependent on object key order.
  for (const playerId of Object.keys(next).sort()) {
    const before = prev[playerId];
    if (before === undefined) continue;
    const delta = next[playerId]! - before;
    if (delta === 0) continue;
    const side = sideOf(playerId, snapshot);
    if (side === null) continue;
    events.push({ id, side, delta });
    id += 1;
  }
  return { events, nextId: id };
}
