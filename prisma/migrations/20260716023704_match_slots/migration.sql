-- CreateEnum
CREATE TYPE "MinigameKind" AS ENUM ('stub');

-- CreateEnum
CREATE TYPE "RoundState" AS ENUM ('pending', 'active', 'complete');

-- CreateEnum
CREATE TYPE "SlotPhase" AS ENUM ('upcoming', 'gate', 'countdown', 'playing', 'scoring', 'done');

-- CreateEnum
CREATE TYPE "SlotWinner" AS ENUM ('A', 'B', 'tie');

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "rounds" ADD COLUMN     "drawn_games" "MinigameKind"[],
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "state" "RoundState" NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "minigame_slots" (
    "id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "kind" "MinigameKind" NOT NULL,
    "phase" "SlotPhase" NOT NULL DEFAULT 'upcoming',
    "ready" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "snapshot" JSONB,
    "countdown_ends_at" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),
    "scoring_ends_at" TIMESTAMP(3),
    "payload" JSONB,
    "norm_a" DOUBLE PRECISION,
    "norm_b" DOUBLE PRECISION,
    "winner" "SlotWinner",

    CONSTRAINT "minigame_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "minigame_slots_match_id_ordinal_key" ON "minigame_slots"("match_id", "ordinal");

-- AddForeignKey
ALTER TABLE "minigame_slots" ADD CONSTRAINT "minigame_slots_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
