/**
 * E2E test support: direct database access for preconditions the UI cannot set
 * up itself, such as promoting a freshly signed-up user to admin so they can
 * host. Uses a plain pg query against the same test-project DATABASE_URL the
 * app server runs against — deliberately not the app's Prisma client, to keep
 * the generated client out of the Playwright runtime.
 */
import { Client } from "pg";

export async function promoteToAdmin(email: string): Promise<void> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("UPDATE profiles SET role = 'admin' WHERE email = $1", [
      email,
    ]);
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
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(
      `SELECT m.id FROM matches m
         JOIN rounds r ON r.id = m.round_id
        WHERE r.tournament_id = $1 AND m.team_b_id IS NOT NULL
        ORDER BY r.ordinal ASC
        LIMIT 1`,
      [tournamentId],
    );
    return result.rows[0]?.id ?? null;
  } finally {
    await client.end();
  }
}
