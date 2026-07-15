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
