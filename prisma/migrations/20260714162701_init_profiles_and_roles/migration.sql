-- CreateEnum
CREATE TYPE "Role" AS ENUM ('player', 'admin', 'owner');

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'player',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- Deny-all RLS: handlers are the only door to profiles (Prisma bypasses RLS).
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
