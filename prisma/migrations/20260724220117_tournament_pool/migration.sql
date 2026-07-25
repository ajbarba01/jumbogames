-- Gives each tournament its own minigame pool: the set of minigame kinds it draws
-- from at match time. Previously the pool was global to the deployment; this makes
-- it per-game so hosts can choose which minigames their game uses. Legacy rows are
-- backfilled below so no pre-existing game ends up with an empty pool.

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "pool" "MinigameKind"[] DEFAULT ARRAY[]::"MinigameKind"[];

-- Legacy rows predate per-game pools. Seed them with the production-eligible
-- set as it stands today, written literally rather than computed so this
-- migration keeps meaning the same thing after the registry changes. The
-- predicate covers NULL as well as '{}': a column added without a default
-- leaves existing rows NULL, which an equality test silently misses.
UPDATE "tournaments" SET "pool" = ARRAY['trivia']::"MinigameKind"[] WHERE "pool" IS NULL OR "pool" = '{}';
