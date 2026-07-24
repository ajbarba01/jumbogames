/**
 * Tests for the trivia deck builder and shared-cursor dealer: buildDeck's
 * seeded sample/cap/choice-shuffle is deterministic and defensive against
 * malformed bank rows, and dealNext's cyclic scan only repeats a card once
 * a player has personally seen the whole deck.
 */
import { describe, expect, it } from "vitest";
import { buildDeck, dealNext, type BankQuestion } from "./deal";

function makeBank(count: number): BankQuestion[] {
  const bank: BankQuestion[] = [];
  for (let i = 0; i < count; i++) {
    bank.push({
      id: `q${i}`,
      prompt: `prompt${i}`,
      correctAnswer: `correct${i}`,
      incorrectAnswers: [`wrong${i}a`, `wrong${i}b`, `wrong${i}c`],
    });
  }
  return bank;
}

describe("buildDeck", () => {
  const bank = makeBank(10);

  it("is deterministic for a seed and caps the deck", () => {
    const deck = buildDeck(bank, "s1", 4);
    expect(deck).toHaveLength(4);
    expect(deck.map((c) => c.questionId)).toEqual(["q9", "q2", "q7", "q8"]);
    expect(buildDeck(bank, "s1", 4)).toEqual(deck);
  });

  it("shuffles the four choices per card with the correct index tracking", () => {
    const deck = buildDeck(bank, "s1", 4);
    const bankById = new Map(bank.map((row) => [row.id, row]));
    for (const card of deck) {
      const row = bankById.get(card.questionId);
      expect(row).toBeDefined();
      expect([...card.choices].sort()).toEqual(
        [row!.correctAnswer, ...row!.incorrectAnswers].sort(),
      );
      expect(card.choices[card.correctIndex]).toBe(row!.correctAnswer);
    }
  });

  it("produces the exact per-card choice order and correct index", () => {
    const deck = buildDeck(bank, "s1", 4);
    expect(deck).toEqual([
      {
        questionId: "q9",
        prompt: "prompt9",
        choices: ["wrong9a", "wrong9b", "wrong9c", "correct9"],
        correctIndex: 3,
      },
      {
        questionId: "q2",
        prompt: "prompt2",
        choices: ["wrong2c", "wrong2b", "correct2", "wrong2a"],
        correctIndex: 2,
      },
      {
        questionId: "q7",
        prompt: "prompt7",
        choices: ["wrong7b", "correct7", "wrong7a", "wrong7c"],
        correctIndex: 1,
      },
      {
        questionId: "q8",
        prompt: "prompt8",
        choices: ["wrong8a", "wrong8c", "correct8", "wrong8b"],
        correctIndex: 2,
      },
    ]);
  });

  it("varies choice order across cards/seeds", () => {
    const deck = buildDeck(bank, "s1", 4);
    const indexes = deck.map((c) => c.correctIndex);
    expect(new Set(indexes).size).toBeGreaterThan(1);
    expect(indexes.some((i) => i !== 0)).toBe(true);

    const otherSeedDeck = buildDeck(bank, "s2", 4);
    expect(otherSeedDeck.map((c) => c.questionId)).not.toEqual(
      deck.map((c) => c.questionId),
    );
  });

  it("returns [] for an empty bank", () => {
    expect(buildDeck([], "s1", 4)).toEqual([]);
  });

  it("skips bank rows without exactly 3 incorrect answers", () => {
    const malformed: BankQuestion[] = [
      {
        id: "ok1",
        prompt: "p1",
        correctAnswer: "c1",
        incorrectAnswers: ["a", "b", "c"],
      },
      {
        id: "too-few",
        prompt: "p2",
        correctAnswer: "c2",
        incorrectAnswers: ["a", "b"],
      },
      {
        id: "too-many",
        prompt: "p3",
        correctAnswer: "c3",
        incorrectAnswers: ["a", "b", "c", "d"],
      },
      {
        id: "ok2",
        prompt: "p4",
        correctAnswer: "c4",
        incorrectAnswers: ["a", "b", "c"],
      },
    ];

    const deck = buildDeck(malformed, "s1", 10);
    expect(deck).toHaveLength(2);
    expect(deck.map((c) => c.questionId).sort()).toEqual(["ok1", "ok2"]);
  });
});

describe("dealNext", () => {
  it("deals the cursor and advances while the deck lasts", () => {
    expect(dealNext(3, 0, [])).toEqual({ index: 0, cursor: 1 });
  });

  it("on wrap deals the next personally-unseen card, scanning cyclically from cursor % length", () => {
    // deck length 3, cursor 4, seen [1] -> scan order 1,2,0 skips 1 -> index 2
    expect(dealNext(3, 4, [1])).toEqual({ index: 2, cursor: 5 });
  });

  it("repeats only at true personal exhaustion", () => {
    expect(dealNext(3, 5, [0, 1, 2])).toEqual({ index: 2, cursor: 6 }); // 5 % 3
  });

  it("returns null for an empty deck", () => {
    expect(dealNext(0, 0, [])).toEqual({ index: null, cursor: 0 });
  });
});
