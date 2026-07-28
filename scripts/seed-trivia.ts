/**
 * Seeds trivia_questions from the Open Trivia Database (OpenTDB,
 * https://opentdb.com), whose question bank is licensed CC BY-SA 4.0.
 * Requests a session token, then pulls up to 8 batches of 50 multiple-choice
 * questions, honoring OpenTDB's one-request-per-5-seconds rate limit.
 * Duplicate prompts are never re-inserted, but each run draws a fresh
 * random sample from OpenTDB, so re-running grows the bank with new
 * questions rather than converging to zero inserts.
 *
 * Draws easy and medium only by default (see DEFAULT_DIFFICULTIES for why),
 * rotating batches across the selected set because OpenTDB accepts one
 * difficulty per request.
 *
 * Run via `npm run seed:trivia`, which loads `.env.test.local` and always
 * targets the test/dev database. This script never chooses an environment
 * itself — seeding production means exporting a production `DATABASE_URL`
 * and running it directly, a deliberate manual act.
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const OPENTDB_TOKEN_URL = "https://opentdb.com/api_token.php?command=request";
const OPENTDB_QUESTIONS_URL = "https://opentdb.com/api.php";
const BATCH_SIZE = 50;
const MAX_BATCHES = 8;
const RATE_LIMIT_DELAY_MS = 5200;

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * Which difficulties to draw. Hard is excluded by default: a hacknight round
 * lasts two minutes and pulling power is bought with *answer rate*, so a bank
 * full of questions nobody can answer quickly flattens both teams onto the
 * floor tier and leaves the rope motionless. Override with
 * `TRIVIA_DIFFICULTIES=easy,medium,hard`.
 */
const DEFAULT_DIFFICULTIES: readonly Difficulty[] = ["easy", "medium"];

function difficultiesFromEnv(): readonly Difficulty[] {
  const raw = process.env.TRIVIA_DIFFICULTIES;
  if (!raw) return DEFAULT_DIFFICULTIES;
  const parsed = raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length > 0);
  const invalid = parsed.filter(
    (part) => !DIFFICULTIES.includes(part as Difficulty),
  );
  if (invalid.length > 0 || parsed.length === 0) {
    throw new Error(
      `TRIVIA_DIFFICULTIES must be a comma-separated subset of ${DIFFICULTIES.join(", ")}; got "${raw}"`,
    );
  }
  return parsed as Difficulty[];
}

// OpenTDB response codes this script branches on; anything else surfaces as
// a fetch failure.
const RESPONSE_CODE_SUCCESS = 0;
const RESPONSE_CODE_TOKEN_EXHAUSTED = 4;

interface TokenResponse {
  response_code: number;
  token?: string;
}

interface OpenTdbResult {
  category: string;
  difficulty: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface QuestionsResponse {
  response_code: number;
  results: OpenTdbResult[];
}

interface QuestionRow {
  prompt: string;
  correctAnswer: string;
  incorrectAnswers: string[];
  category: string;
  difficulty: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestToken(): Promise<string> {
  const res = await fetch(OPENTDB_TOKEN_URL);
  if (!res.ok) {
    throw new Error(`token request failed with status ${res.status}`);
  }
  const body = (await res.json()) as TokenResponse;
  if (body.response_code !== RESPONSE_CODE_SUCCESS || !body.token) {
    throw new Error(
      `token request returned response_code ${body.response_code}`,
    );
  }
  return body.token;
}

async function fetchBatch(
  token: string,
  difficulty: Difficulty,
): Promise<QuestionsResponse> {
  const url = new URL(OPENTDB_QUESTIONS_URL);
  url.searchParams.set("amount", String(BATCH_SIZE));
  url.searchParams.set("type", "multiple");
  url.searchParams.set("encode", "url3986");
  url.searchParams.set("token", token);
  // OpenTDB takes one difficulty per request, so the batch loop rotates
  // through the selected set rather than asking for them together.
  url.searchParams.set("difficulty", difficulty);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`batch request failed with status ${res.status}`);
  }
  return (await res.json()) as QuestionsResponse;
}

function toRow(result: OpenTdbResult): QuestionRow | null {
  const incorrectAnswers = result.incorrect_answers.map(decodeURIComponent);
  if (incorrectAnswers.length !== 3) {
    return null;
  }
  return {
    prompt: decodeURIComponent(result.question),
    correctAnswer: decodeURIComponent(result.correct_answer),
    incorrectAnswers,
    category: decodeURIComponent(result.category),
    difficulty: decodeURIComponent(result.difficulty),
  };
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const token = await requestToken();
    await sleep(RATE_LIMIT_DELAY_MS);

    const existing = await prisma.triviaQuestion.findMany({
      select: { prompt: true },
    });
    const knownPrompts = new Set(existing.map((row) => row.prompt));

    const difficulties = difficultiesFromEnv();
    console.log(`Drawing difficulties: ${difficulties.join(", ")}`);

    const rows: QuestionRow[] = [];
    let fetched = 0;
    let skipped = 0;

    for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
      if (batch > 0) {
        await sleep(RATE_LIMIT_DELAY_MS);
      }

      // Round-robin so the batch budget splits evenly across the set instead
      // of exhausting one difficulty before reaching the next.
      const difficulty = difficulties[batch % difficulties.length]!;
      const body = await fetchBatch(token, difficulty);

      if (body.response_code === RESPONSE_CODE_TOKEN_EXHAUSTED) {
        console.log("OpenTDB token exhausted; stopping early.");
        break;
      }
      if (body.response_code !== RESPONSE_CODE_SUCCESS) {
        throw new Error(
          `batch request returned response_code ${body.response_code}`,
        );
      }

      for (const result of body.results) {
        fetched += 1;
        const row = toRow(result);
        if (!row || knownPrompts.has(row.prompt)) {
          skipped += 1;
          continue;
        }
        knownPrompts.add(row.prompt);
        rows.push(row);
      }
    }

    const created =
      rows.length > 0
        ? await prisma.triviaQuestion.createMany({ data: rows })
        : { count: 0 };

    console.log(
      `fetched=${fetched} inserted=${created.count} skipped=${skipped}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`seed-trivia failed: ${message}`);
  process.exit(1);
});
