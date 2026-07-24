/**
 * Unit tests for the trivia question-bank schemas: create/update shape
 * bounds, the duplicate-answer refinement (case-insensitive, trimmed), and
 * the list-query defaults/coercion.
 */
import { describe, it, expect } from "vitest";
import {
  triviaQuestionSchema,
  triviaQuestionUpdateSchema,
  questionListQuerySchema,
} from "./trivia";

function validQuestion() {
  return {
    prompt: "What is the capital of France?",
    correctAnswer: "Paris",
    incorrectAnswers: ["London", "Berlin", "Madrid"],
    category: "Geography",
    difficulty: "easy" as const,
  };
}

describe("triviaQuestionSchema", () => {
  it("accepts a valid question", () => {
    const parsed = triviaQuestionSchema.safeParse(validQuestion());
    expect(parsed.success).toBe(true);
  });

  it("rejects incorrectAnswers with the wrong length", () => {
    const parsed = triviaQuestionSchema.safeParse({
      ...validQuestion(),
      incorrectAnswers: ["London", "Berlin"],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty prompt", () => {
    const parsed = triviaQuestionSchema.safeParse({
      ...validQuestion(),
      prompt: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown difficulty", () => {
    const parsed = triviaQuestionSchema.safeParse({
      ...validQuestion(),
      difficulty: "impossible",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a correctAnswer duplicated among incorrectAnswers", () => {
    const parsed = triviaQuestionSchema.safeParse({
      ...validQuestion(),
      correctAnswer: "Paris",
      incorrectAnswers: ["London", "Paris", "Madrid"],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(
        "Correct answer duplicates a wrong answer",
      );
    }
  });

  it("rejects a duplicate that only differs by case and whitespace", () => {
    const parsed = triviaQuestionSchema.safeParse({
      ...validQuestion(),
      correctAnswer: "Paris",
      incorrectAnswers: ["London", "  PARIS  ", "Madrid"],
    });
    expect(parsed.success).toBe(false);
  });

  it("allows optional category and difficulty to be omitted", () => {
    const parsed = triviaQuestionSchema.safeParse({
      prompt: "What is the capital of France?",
      correctAnswer: "Paris",
      incorrectAnswers: ["London", "Berlin", "Madrid"],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("triviaQuestionUpdateSchema", () => {
  it("accepts a partial payload with a single field", () => {
    const parsed = triviaQuestionUpdateSchema.safeParse({
      prompt: "Updated prompt?",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts an empty object at the schema level", () => {
    const parsed = triviaQuestionUpdateSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });

  it("enforces the duplicate check only when both answer fields present", () => {
    const dup = triviaQuestionUpdateSchema.safeParse({
      correctAnswer: "Paris",
      incorrectAnswers: ["London", "paris", "Madrid"],
    });
    expect(dup.success).toBe(false);
  });

  it("skips the duplicate check when only one answer field is present", () => {
    const parsed = triviaQuestionUpdateSchema.safeParse({
      correctAnswer: "Paris",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("questionListQuerySchema", () => {
  it("defaults q to empty string and page to 1", () => {
    const parsed = questionListQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.q).toBe("");
      expect(parsed.data.page).toBe(1);
    }
  });

  it("coerces a string page to a number", () => {
    const parsed = questionListQuerySchema.safeParse({ page: "3" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.page).toBe(3);
    }
  });
});
