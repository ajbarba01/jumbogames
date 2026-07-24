/**
 * Zod schemas for the trivia question-bank CRUD API, parsed at the route
 * boundary before any handler logic runs. The create/update schemas share a
 * duplicate-answer refinement: a correct answer that also appears among the
 * wrong answers would make the per-deal choice shuffle judge the wrong slot.
 */
import { z } from "zod";

export const QUESTIONS_PAGE_SIZE = 20;

const DUPLICATE_ANSWER_MESSAGE = "Correct answer duplicates a wrong answer";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hasDuplicateAnswer(
  correctAnswer: string,
  incorrectAnswers: string[],
): boolean {
  const correct = normalize(correctAnswer);
  return incorrectAnswers.some((answer) => normalize(answer) === correct);
}

export const triviaQuestionSchema = z
  .object({
    prompt: z.string().trim().min(1).max(500),
    correctAnswer: z.string().min(1).max(200),
    incorrectAnswers: z.array(z.string().min(1).max(200)).length(3),
    category: z.string().max(100).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  })
  .refine(
    (data) => !hasDuplicateAnswer(data.correctAnswer, data.incorrectAnswers),
    { message: DUPLICATE_ANSWER_MESSAGE, path: ["incorrectAnswers"] },
  );

export const triviaQuestionUpdateSchema = z
  .object({
    prompt: z.string().trim().min(1).max(500),
    correctAnswer: z.string().min(1).max(200),
    incorrectAnswers: z.array(z.string().min(1).max(200)).length(3),
    category: z.string().max(100).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  })
  .partial()
  .refine(
    (data) =>
      data.correctAnswer === undefined ||
      data.incorrectAnswers === undefined ||
      !hasDuplicateAnswer(data.correctAnswer, data.incorrectAnswers),
    { message: DUPLICATE_ANSWER_MESSAGE, path: ["incorrectAnswers"] },
  );

export const questionListQuerySchema = z.object({
  q: z.string().max(200).default(""),
  page: z.coerce.number().int().min(1).default(1),
});
