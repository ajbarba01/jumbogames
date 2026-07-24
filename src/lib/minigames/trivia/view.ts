/**
 * The trivia minigame's redacted client view: what a slot's payload looks
 * like once it reaches the browser. No React and no server-only fields (the
 * deck, other players' hands) — only what any given viewer is allowed to see.
 */
import type { RopeState } from "./rope";

export interface TriviaView {
  rope: RopeState;
  pinned: "A" | "B" | null;
  scores: Record<string, number>;
  question: {
    deckIndex: number;
    prompt: string;
    choices: [string, string, string, string];
  } | null;
  lastResult: "correct" | "wrong" | null;
}
