/**
 * Runtime Prisma client singleton. Connects through the pg driver adapter using
 * the pooled DATABASE_URL (transaction mode). A module-global instance avoids
 * exhausting pooled connections under dev hot-reload.
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// P2002 is Prisma's unique-constraint violation. Handlers turn a lost race
// (duplicate team name, second team for one player) into a clean 409.
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}
