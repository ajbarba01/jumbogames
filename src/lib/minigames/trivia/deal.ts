/**
 * Trivia deck builder and dealer. One deck is drawn per match and shared by
 * the whole team: a single cursor advances on every deal so teammates never
 * race through duplicate cards while the deck lasts, and once the cursor
 * wraps each player's own answered history decides what they see next, so a
 * player only repeats a card once they have personally exhausted the deck.
 */
import { seededShuffle } from "@/lib/random";

export interface BankQuestion {
  id: string;
  prompt: string;
  correctAnswer: string;
  incorrectAnswers: string[];
}

export interface DeckCard {
  questionId: string;
  prompt: string;
  choices: [string, string, string, string];
  correctIndex: number;
}

export function buildDeck(
  bank: BankQuestion[],
  seed: string,
  cap: number,
): DeckCard[] {
  const eligible = bank.filter((row) => row.incorrectAnswers.length === 3);
  const sampled = seededShuffle(eligible, seed).slice(0, cap);

  return sampled.map((row, i) => {
    const options = [row.correctAnswer, ...row.incorrectAnswers];
    const choices = seededShuffle(options, `${seed}:card:${i}`) as [
      string,
      string,
      string,
      string,
    ];
    return {
      questionId: row.id,
      prompt: row.prompt,
      choices,
      correctIndex: choices.indexOf(row.correctAnswer),
    };
  });
}

export function dealNext(
  deckLength: number,
  cursor: number,
  seen: readonly number[],
): { index: number | null; cursor: number } {
  if (deckLength === 0) return { index: null, cursor };

  const start = cursor % deckLength;
  let index = start;
  for (let step = 0; step < deckLength; step++) {
    const candidate = (start + step) % deckLength;
    if (!seen.includes(candidate)) {
      index = candidate;
      break;
    }
  }

  return { index, cursor: cursor + 1 };
}
