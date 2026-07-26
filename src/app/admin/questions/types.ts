/**
 * Shared vocabulary for the /admin/questions surface: the question shape the
 * API returns, the payload its editor posts, the difficulty levels and the two
 * separate sentinel vocabularies built on them (the list's filter, the editor's
 * choice), and the one error reader every request on this surface funnels
 * through.
 */
export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTY_LEVELS)[number];

/** The filter's own vocabulary: "any difficulty" is a client-side sentinel and
 *  is never sent to the API, which accepts only the three real levels. */
export const ANY_DIFFICULTY = "any difficulty";
export const DIFFICULTY_FILTERS = [
  ANY_DIFFICULTY,
  ...DIFFICULTY_LEVELS,
] as const;
export type DifficultyFilter = (typeof DIFFICULTY_FILTERS)[number];

/** The editor's own vocabulary, deliberately not the filter's: "no difficulty"
 *  means this question carries no level, where the filter's sentinel means
 *  "don't narrow the list". One string for both would conflate them. */
export const NO_DIFFICULTY = "no difficulty";
export const DIFFICULTY_CHOICES = [
  NO_DIFFICULTY,
  ...DIFFICULTY_LEVELS,
] as const;
export type DifficultyChoice = (typeof DIFFICULTY_CHOICES)[number];

export interface Question {
  id: string;
  prompt: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  category: string | null;
  difficulty: string | null;
}

export interface QuestionPayload {
  prompt: string;
  correctAnswer: string;
  incorrectAnswers: [string, string, string];
  category?: string;
  difficulty?: Difficulty;
}

/** Pulls the API's `error` string out of a failed response, or the fallback. */
export async function readError(
  res: Response,
  fallback: string,
): Promise<string> {
  const data: unknown = await res.json().catch(() => null);
  if (
    data !== null &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return fallback;
}
