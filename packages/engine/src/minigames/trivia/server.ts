/**
 * Tug O' Lore: each player answers their own stream of questions from a deck
 * shared with their team, and correct answers build their team's *pulling
 * power* — a tier that sets a constant force on the rope for as long as they
 * can hold it. The rope is the time-integral of the tier gap, so a team that
 * out-answers the other moves it continuously rather than in per-answer jerks,
 * and a deficit reads as distance to be closed rather than a verdict.
 *
 * A wrong answer costs time, not points: it locks the player out briefly and
 * deals a fresh card. Dumping a card you do not recognise is therefore real,
 * intended play, priced in seconds.
 *
 * Nothing here ticks. Tier and rope are pure functions of stored state plus a
 * server-stamped clock, so `isFinished` and `outcome` can discover a pin that
 * happened during an idle stretch without a loop behind the match.
 */
import type { MinigameServer, RosterSnapshot } from "../types";
import { buildDeck, dealNext, type BankQuestion, type DeckCard } from "./deal";
import {
  advanceRope,
  INITIAL_ROPE,
  pinnedSide,
  ropeK,
  type RopeState,
} from "./rope";
import { addCharge, INITIAL_TIER, resolveTier, type TierState } from "./tiers";
import { DECK_CAP, LOCKOUT_MS, TIE_EPSILON } from "./tuning";
import type { TriviaView } from "./view";

export interface TriviaPlayerState {
  current: number | null;
  seen: number[];
  score: number;
  /** Answers applied for this player, right or wrong — the client's one
   *  reliable "the server resolved my card" edge now that a wrong answer
   *  leaves the score untouched. */
  answers: number;
  /** Epoch ms until which this player's choices are locked; 0 when free. */
  lockedUntil: number;
  lastResult: "correct" | "wrong" | null;
}

export interface TriviaState {
  deck: DeckCard[];
  cursorA: number;
  cursorB: number;
  teamA: string[];
  teamB: string[];
  players: Record<string, TriviaPlayerState>;
  tierA: TierState;
  tierB: TierState;
  rope: RopeState;
  /** Rope sensitivity, fixed at init from the roster sizes. */
  k: number;
}

export interface TriviaAction {
  type: "answer";
  deckIndex: number;
  choiceIndex: number;
}

export const TRIVIA_PLAY_SECONDS = 120;
export const SCORE_CORRECT = 1;

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
      answers: 0,
      lockedUntil: 0,
      lastResult: null,
    };
  }
  return cursor;
}

export const triviaGame: MinigameServer<TriviaState, TriviaAction> = {
  kind: "trivia",
  title: "Tug O' Lore",
  tagline: "Trivia tug of war.",
  instructions:
    "Right answers raise your team's pull, and it slips back if you stall. " +
    "A wrong answer locks your cards for three seconds.",
  playSeconds: TRIVIA_PLAY_SECONDS,
  devOnly: false,
  init(
    snapshot: RosterSnapshot,
    seed: string,
    _now: number,
    context?: unknown,
  ): TriviaState {
    const bank = Array.isArray(context) ? (context as BankQuestion[]) : [];
    const deck = buildDeck(bank, seed, DECK_CAP);
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
      tierA: INITIAL_TIER,
      tierB: INITIAL_TIER,
      rope: INITIAL_ROPE,
      k: ropeK(snapshot.teamA.length, snapshot.teamB.length),
    };
  },
  apply(state, playerId, action, now) {
    // A pin is derived, not stored: once the rope has latched, further answers
    // cannot move it, and the slot is already decided.
    const advanced = advanceRope(
      state.rope,
      state.tierA,
      state.tierB,
      now,
      state.k,
    );
    if (pinnedSide(advanced) !== null) return state;

    const player = state.players[playerId];
    if (!player) return state;
    if (now < player.lockedUntil) return state;
    if (player.current === null || action.deckIndex !== player.current) {
      return state;
    }
    const card = state.deck[action.deckIndex];
    if (!card) return state;

    const side: "A" | "B" = state.teamA.includes(playerId) ? "A" : "B";
    const teamSize = side === "A" ? state.teamA.length : state.teamB.length;
    const correct = action.choiceIndex === card.correctIndex;

    // Tiers resolve to `now` whether or not this answer charges them, so a
    // demotion that fell due during an idle stretch is recorded rather than
    // silently skipped. addCharge resolves internally, so the charging side is
    // handed the stored state and takes the single resolution path.
    let tierA = resolveTier(state.tierA, now);
    let tierB = resolveTier(state.tierB, now);
    if (correct) {
      const gain = 1 / Math.max(1, teamSize);
      if (side === "A") tierA = addCharge(state.tierA, now, gain);
      else tierB = addCharge(state.tierB, now, gain);
    }

    // Every answer consumes a card — dumping one you don't know is how you
    // skip it, and the cost is the lockout below, not the deck.
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
      tierA,
      tierB,
      rope: advanced,
      players: {
        ...state.players,
        [playerId]: {
          current,
          seen,
          score: player.score + (correct ? SCORE_CORRECT : 0),
          answers: player.answers + 1,
          lockedUntil: correct ? player.lockedUntil : now + LOCKOUT_MS,
          lastResult: correct ? "correct" : "wrong",
        },
      },
    };
  },
  isFinished(state, now) {
    return (
      pinnedSide(
        advanceRope(state.rope, state.tierA, state.tierB, now, state.k),
      ) !== null
    );
  },
  scores(state) {
    const out: Record<string, number> = {};
    for (const [id, player] of Object.entries(state.players)) {
      out[id] = player.score;
    }
    return out;
  },
  /**
   * The rope decides the slot. Under continuous force most matches end on the
   * buzzer rather than on a pin, so this is the common path — and the rope is
   * the one object the room watched for two minutes. Only a dead heat inside
   * TIE_EPSILON defers to the normalized score means.
   */
  outcome(state, now) {
    const rope = advanceRope(
      state.rope,
      state.tierA,
      state.tierB,
      now,
      state.k,
    );
    const pin = pinnedSide(rope);
    if (pin !== null) return pin;
    if (Math.abs(rope.p) < TIE_EPSILON) return null;
    return rope.p > 0 ? "A" : "B";
  },
  /**
   * Ships stored state raw — there is no clock here, so nothing is advanced.
   * The client holds the same pure functions and extrapolates the rope and the
   * draining tier timers from this plus its own server-corrected clock.
   * `pinned` reads the stored rope, which is accurate for a latched pin because
   * `advanceRope` writes the latched value into state on the answer that caused
   * it.
   */
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
      tierA: state.tierA,
      tierB: state.tierB,
      k: state.k,
      pinned: pinnedSide(state.rope),
      scores,
      question: card
        ? {
            deckIndex: player!.current!,
            prompt: card.prompt,
            choices: card.choices,
          }
        : null,
      answers: player?.answers ?? 0,
      lockedUntil: player?.lockedUntil ?? 0,
      lastResult: player ? player.lastResult : null,
    };
  },
};
