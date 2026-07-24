-- AlterEnum
ALTER TYPE "MinigameKind" ADD VALUE 'trivia';

-- CreateTable
CREATE TABLE "trivia_questions" (
    "id" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "incorrect_answers" TEXT[],
    "category" TEXT,
    "difficulty" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trivia_questions_pkey" PRIMARY KEY ("id")
);
