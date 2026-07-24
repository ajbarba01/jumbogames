/**
 * The IO edge of minigame init: per-kind loaders that fetch whatever a
 * game's `init` needs from the database, keyed so the write seam can resolve
 * only the kinds actually gating a match before calling the pure reducer.
 */
import { prisma } from "@/lib/prisma";
import type { MinigameKind } from "./types";
import type { BankQuestion } from "./trivia/deal";

export const INIT_CONTEXT_LOADERS: Partial<
  Record<MinigameKind, () => Promise<unknown>>
> = {
  trivia: (): Promise<BankQuestion[]> =>
    prisma.triviaQuestion.findMany({
      select: {
        id: true,
        prompt: true,
        correctAnswer: true,
        incorrectAnswers: true,
      },
      orderBy: { createdAt: "asc" },
      take: 500, // deck sampling cap upstream; oldest-first keeps it stable
    }),
};
