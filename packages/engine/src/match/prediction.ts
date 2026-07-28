/**
 * Client-side optimistic prediction (tier 2 of the optimism standard). A
 * minigame is predictable only if it declares `predict` — which a
 * hidden-information game must not, since its viewer cannot compute its own
 * result from redacted state (DESIGN.md decision 23). Predictions are display
 * only: they are retired wholesale when the server catches up, and never merged
 * into authoritative state.
 */
import { MINIGAMES } from "../minigames/registry";
import type { MinigameKind } from "../minigames/types";
import type { MatchState } from "./types";

export const PREDICTION_TTL_MS = 5000;

export interface Pending {
  seq: number;
  state: MatchState;
  createdAt: number;
}

export function canPredict(kind: MinigameKind): boolean {
  return typeof MINIGAMES[kind].predict === "function";
}

/**
 * Apply the player's own action locally through the game's own reducer. Returns
 * the input state unchanged when the game is not predictable, the ordinal is
 * unknown, or the slot is not in play — so a caller can apply this
 * unconditionally and let the engine decide.
 */
export function predictSlot(
  state: MatchState,
  ordinal: number,
  playerId: string,
  action: unknown,
  now: number,
): MatchState {
  const slot = state.slots.find((s) => s.ordinal === ordinal);
  if (!slot || slot.phase !== "playing") return state;

  const game = MINIGAMES[slot.kind];
  if (typeof game.predict !== "function") return state;
  if (slot.payload === null || slot.payload === undefined) return state;

  const next = game.predict(slot.payload, playerId, action, now);
  if (next === slot.payload) return state;

  return {
    ...state,
    slots: state.slots.map((s) =>
      s.ordinal === ordinal ? { ...s, payload: next } : s,
    ),
  };
}

/**
 * Retire predictions the server has answered, plus any that have outlived the
 * TTL — the latter guards against a dropped acknowledgement leaving a
 * prediction on screen forever.
 */
export function retirePredictions(
  pending: readonly Pending[],
  serverSeq: number,
  now: number,
): Pending[] {
  return pending.filter(
    (p) => p.seq > serverSeq && now - p.createdAt < PREDICTION_TTL_MS,
  );
}
