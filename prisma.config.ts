/**
 * Prisma CLI configuration (Prisma 7): schema/migrations paths and the
 * connection used by migrate/db commands. Uses the direct (session-mode)
 * connection; the app runtime connects via the pooled URL through a driver
 * adapter instead.
 */
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: [".env.local", ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
