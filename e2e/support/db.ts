/**
 * E2E test support: direct database access for preconditions the UI cannot set
 * up itself, such as stocking the trivia bank, and for reading ids the DOM
 * deliberately never renders (team ids, profile ids, match rows) so a spec can
 * address a route directly or prove a server-side effect the UI cannot show.
 * Uses a plain pg query against the same test-project DATABASE_URL the app
 * server runs against — deliberately not the app's Prisma client, to keep the
 * generated client out of the Playwright runtime.
 *
 * Roles are deliberately absent: personas.ts owns them, so no spec can promote
 * an account that a later spec expects to be a plain player.
 */
import { Client } from "pg";

/** Runs one query against the test project and hands back its rows. */
async function query<T extends Record<string, unknown>>(
  sql: string,
  values: unknown[],
): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query<T>(sql, values);
    return result.rows;
  } finally {
    await client.end();
  }
}

// The board never renders a match id in the DOM, and a non-member cannot see
// one at all, so the authz spec reads it straight from the DB — the same
// out-of-band precondition pattern as promoteToAdmin. Returns the first
// non-bye match of a started tournament (team_b_id is not null).
export async function firstMatchId(
  tournamentId: string,
): Promise<string | null> {
  const rows = await query<{ id: string }>(
    `SELECT m.id FROM matches m
       JOIN rounds r ON r.id = m.round_id
      WHERE r.tournament_id = $1 AND m.team_b_id IS NOT NULL
      ORDER BY r.ordinal ASC
      LIMIT 1`,
    [tournamentId],
  );
  return rows[0]?.id ?? null;
}

// Team ids never reach the DOM, so a spec that addresses a membership route
// directly — which is the only way to assert a server rule rather than the UI
// face of it — reads the id here.
export async function teamIdByName(
  tournamentId: string,
  name: string,
): Promise<string> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM teams WHERE tournament_id = $1 AND name = $2`,
    [tournamentId, name],
  );
  const id = rows[0]?.id;
  if (!id)
    throw new Error(`No team named ${name} in tournament ${tournamentId}`);
  return id;
}

// Profile ids are likewise withheld from the DOM; the leader-only kick route
// needs a real target id to prove it refuses a non-leader.
export async function profileIdByEmail(email: string): Promise<string> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM profiles WHERE email = $1`,
    [email],
  );
  const id = rows[0]?.id;
  if (!id) throw new Error(`No profile for ${email}`);
  return id;
}

// A stocked question bank is a precondition no UI flow can set up cheaply:
// checkContentReady 409s a round start whose draw contains trivia while the
// bank is empty (see round-draw.ts), so a trivia round cannot even be drawn
// without rows. Six is comfortably more than one match consumes.
const E2E_QUESTION_COUNT = 6;

/**
 * Stocks the bank with a fixed set of recognisable questions. Idempotent: the
 * table has no unique index on `prompt` (see schema.prisma), so `ON CONFLICT`
 * would never fire and a re-run would grow the bank without bound — the
 * existence guard is what keeps repeated runs against the shared test project
 * flat. `id` and `updated_at` are supplied explicitly because neither carries
 * a database-level default (Prisma generates both in application code).
 */
export async function seedTriviaQuestions(): Promise<void> {
  for (let i = 1; i <= E2E_QUESTION_COUNT; i += 1) {
    await query(
      `INSERT INTO trivia_questions
         (id, prompt, correct_answer, incorrect_answers, category, difficulty, created_at, updated_at)
       SELECT gen_random_uuid()::text, $1::text, $2::text, $3::text[], $4::text, $5::text, now(), now()
        WHERE NOT EXISTS (SELECT 1 FROM trivia_questions WHERE prompt = $1::text)`,
      [
        `E2E trivia ${i}: which answer is correct?`,
        `Correct ${i}`,
        [`Wrong ${i}a`, `Wrong ${i}b`, `Wrong ${i}c`],
        "E2E",
        "easy",
      ],
    );
  }
}

/**
 * The answer the server will score as correct for a prompt, looked up in the
 * question bank.
 *
 * The deal is seeded per match from a bank shared with every other spec's
 * leftovers, so which card a player holds cannot be predicted — but the prompt
 * is on screen, and the bank is the same server truth the deal drew from. This
 * deliberately does not read the slot's payload: under the socket transport the
 * Durable Object owns live match state and only archives a slot to Postgres
 * once it is done, so mid-match that row holds nothing. Reading the bank works
 * on either transport.
 */
export async function correctAnswerForPrompt(prompt: string): Promise<string> {
  const rows = await query<{ correct_answer: string }>(
    `SELECT correct_answer FROM trivia_questions WHERE prompt = $1`,
    [prompt],
  );
  const answer = rows[0]?.correct_answer;
  if (answer === undefined) {
    throw new Error(`No trivia question in the bank with prompt ${prompt}`);
  }
  return answer;
}

// Match.team_a_id / team_b_id are ON DELETE CASCADE, so a team wrongly deleted
// after the game starts takes its scheduled matches with it silently. Counting
// them is the only way to see that from a test.
export async function matchCountForTeam(teamId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM matches
      WHERE team_a_id = $1 OR team_b_id = $1`,
    [teamId],
  );
  return Number(rows[0]?.count ?? "0");
}
