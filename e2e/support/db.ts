/**
 * E2E test support: direct database access for preconditions the UI cannot set
 * up itself, such as promoting a freshly signed-up user to admin so they can
 * host, and for reading ids the DOM deliberately never renders (team ids,
 * profile ids, match rows) so a spec can address a route directly or prove a
 * server-side effect the UI cannot show. Uses a plain pg query against the same
 * test-project DATABASE_URL the app server runs against — deliberately not the
 * app's Prisma client, to keep the generated client out of the Playwright
 * runtime.
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

export async function promoteToAdmin(email: string): Promise<void> {
  await query("UPDATE profiles SET role = 'admin' WHERE email = $1", [email]);
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
