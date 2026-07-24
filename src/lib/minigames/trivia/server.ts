/**
 * Trivia tug-of-war: each player answers their own stream of questions from
 * a deck shared with their team, and every answer pulls a rope toward or
 * away from their side. A wall touch pins the match and decides the winner
 * outright, so a team can come back from behind at any point right up to
 * the pin instead of a running score locking in the outcome early.
 */
import type { MinigameServer, RosterSnapshot } from "../types";
import { buildDeck, dealNext, type BankQuestion, type DeckCard } from "./deal";
import { applyPull, pinnedSide, type RopeState } from "./rope";
import type { TriviaView } from "./view";

export interface TriviaPlayerState {
  current: number | null;
  seen: number[];
  score: number;
  lastResult: "correct" | "wrong" | null;
}

export interface TriviaState {
  deck: DeckCard[];
  cursorA: number;
  cursorB: number;
  teamA: string[];
  teamB: string[];
  players: Record<string, TriviaPlayerState>;
  rope: RopeState;
  pinned: "A" | "B" | null;
}

export interface TriviaAction {
  type: "answer";
  deckIndex: number;
  choiceIndex: number;
}

export const TRIVIA_PLAY_SECONDS = 120;
export const TRIVIA_DECK_CAP = 150;
export const SCORE_CORRECT = 3;
export const SCORE_WRONG = -1;

function dealOpeners(
  deckLength: number,
  roster: readonly string[],
  players: Record<string, TriviaPlayerState>,
): number {
  let cursor = 0;
  for (const id of roster) {
    const dealt = dealNext(deckLength, cursor, []);
    cursor = dealt.cursor;
    players[id] = {
      current: dealt.index,
      seen: [],
      score: 0,
      lastResult: null,
    };
  }
  return cursor;
}

export const triviaGame: MinigameServer<TriviaState, TriviaAction> = {
  kind: "trivia",
  title: "Trivia Tug-of-War",
  instructions:
    "Answer your own stream of questions. Right answers pull the rope your " +
    "way, wrong ones slip it back — pin the other team or lead when time " +
    "runs out.",
  playSeconds: TRIVIA_PLAY_SECONDS,
  devOnly: false,
  init(snapshot: RosterSnapshot, seed: string, context?: unknown): TriviaState {
    const bank = Array.isArray(context) ? (context as BankQuestion[]) : [];
    const deck = buildDeck(bank, seed, TRIVIA_DECK_CAP);
    const players: Record<string, TriviaPlayerState> = {};
    const cursorA = dealOpeners(deck.length, snapshot.teamA, players);
    const cursorB = dealOpeners(deck.length, snapshot.teamB, players);
    return {
      deck,
      cursorA,
      cursorB,
      teamA: [...snapshot.teamA],
      teamB: [...snapshot.teamB],
      players,
      rope: { p: 0, at: 0 },
      pinned: null,
    };
  },
  apply(state, playerId, action, now) {
    if (state.pinned !== null) return state;
    const player = state.players[playerId];
    if (!player) return state;
    if (player.current === null || action.deckIndex !== player.current) {
      return state;
    }
    const card = state.deck[action.deckIndex];
    if (!card) return state;

    const side: "A" | "B" = state.teamA.includes(playerId) ? "A" : "B";
    const teamSize = side === "A" ? state.teamA.length : state.teamB.length;
    const correct = action.choiceIndex === card.correctIndex;
    const rope = applyPull(state.rope, now, { side, correct, teamSize });
    const pinned = pinnedSide(rope);
    const seen = [...player.seen, action.deckIndex];

    let cursorA = state.cursorA;
    let cursorB = state.cursorB;
    let current: number | null;
    if (side === "A") {
      const dealt = dealNext(state.deck.length, cursorA, seen);
      cursorA = dealt.cursor;
      current = dealt.index;
    } else {
      const dealt = dealNext(state.deck.length, cursorB, seen);
      cursorB = dealt.cursor;
      current = dealt.index;
    }

    return {
      ...state,
      cursorA,
      cursorB,
      rope,
      pinned,
      players: {
        ...state.players,
        [playerId]: {
          current,
          seen,
          score: player.score + (correct ? SCORE_CORRECT : SCORE_WRONG),
          lastResult: correct ? "correct" : "wrong",
        },
      },
    };
  },
  isFinished(state) {
    return state.pinned !== null;
  },
  scores(state) {
    const out: Record<string, number> = {};
    for (const [id, player] of Object.entries(state.players)) {
      out[id] = player.score;
    }
    return out;
  },
  outcome(state) {
    return state.pinned;
  },
  redact(state, viewerId): TriviaView {
    const scores: Record<string, number> = {};
    for (const [id, player] of Object.entries(state.players)) {
      scores[id] = player.score;
    }
    const player = viewerId !== null ? state.players[viewerId] : undefined;
    const card =
      player && player.current !== null ? state.deck[player.current] : null;
    return {
      rope: state.rope,
      pinned: state.pinned,
      scores,
      question: card
        ? {
            deckIndex: player!.current!,
            prompt: card.prompt,
            choices: card.choices,
          }
        : null,
      lastResult: player ? player.lastResult : null,
    };
  },
};
