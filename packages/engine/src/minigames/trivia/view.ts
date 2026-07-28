/**
 * The trivia minigame's redacted client view: what a slot's payload looks like
 * once it reaches the browser. No React and no server-only fields (the deck,
 * other players' hands) — only what a given viewer is allowed to see.
 *
 * Tier state and `k` are public on purpose: they are what let the client
 * extrapolate the rope and the draining tier timers between pushes, using the
 * same pure functions the server used to produce them.
 */
import type { RopeState } from "./rope";
import type { TierState } from "./tiers";

export interface TriviaView {
  rope: RopeState;
  tierA: TierState;
  tierB: TierState;
  /** Rope sensitivity for this match; fixed at init from the roster sizes. */
  k: number;
  pinned: "A" | "B" | null;
  scores: Record<string, number>;
  question: {
    deckIndex: number;
    prompt: string;
    choices: [string, string, string, string];
  } | null;
  /**
   * How many answers this viewer has had applied. Monotonic, and moved by
   * wrong answers too — which no longer move the score — so the client has one
   * reliable "the server has resolved my card" edge for both verdicts.
   */
  answers: number;
  /** Epoch ms until which this viewer's choices are locked; 0 when free. */
  lockedUntil: number;
  lastResult: "correct" | "wrong" | null;
}
