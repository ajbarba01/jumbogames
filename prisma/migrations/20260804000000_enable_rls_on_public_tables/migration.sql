-- Closes the public REST surface on every table in `public`.
--
-- Supabase grants `anon` and `authenticated` full DML on tables created in this
-- schema, and PostgREST exposes them at /rest/v1/<table> to anyone holding the
-- anon key — which ships in the browser bundle by design. Prisma does not emit
-- RLS statements, so every table added after `profiles` was world-readable and
-- world-writable. Enabling RLS with **no policies** denies both roles outright.
--
-- Nothing in the app is affected: Prisma connects as `postgres`, which bypasses
-- RLS, and the browser only ever uses Realtime broadcast/presence, never a table
-- read. `profiles` has run this way since the initial migration.
--
-- Do not add FORCE ROW LEVEL SECURITY — it would apply to the table owner and
-- cut off Prisma. Any future table in `public` needs this line too.
ALTER TABLE "tournaments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rounds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "matches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "minigame_slots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trivia_questions" ENABLE ROW LEVEL SECURITY;
