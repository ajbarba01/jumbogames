/**
 * Unit tests for the create-game request schema. The pool is validated
 * fail-closed at the write boundary so a hand-rolled request cannot store an
 * unregistered kind, or a dev-only kind on a production game.
 */
import { describe, expect, it, vi } from "vitest";
import { createTournamentSchema } from "./tournament";

const base = { name: "Thursday hacknight", minigamesPerMatch: 2 };

describe("createTournamentSchema", () => {
  it("accepts a pool of eligible kinds", () => {
    const parsed = createTournamentSchema.safeParse({
      ...base,
      pool: ["stub"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty pool", () => {
    const parsed = createTournamentSchema.safeParse({ ...base, pool: [] });
    expect(parsed.success).toBe(false);
  });

  it("rejects a missing pool", () => {
    const parsed = createTournamentSchema.safeParse(base);
    expect(parsed.success).toBe(false);
  });

  it("rejects an unregistered kind", () => {
    const parsed = createTournamentSchema.safeParse({
      ...base,
      pool: ["chess"],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate kinds", () => {
    const parsed = createTournamentSchema.safeParse({
      ...base,
      pool: ["stub", "stub"],
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps K independent of pool size", () => {
    // Spec D-ledger C1: a short pool repeats rather than capping K.
    const parsed = createTournamentSchema.safeParse({
      name: "Solo pool",
      minigamesPerMatch: 4,
      pool: ["stub"],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a dev-only kind when running in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    if (process.env.JUMBO_TEST_MINIGAME_POOL) {
      vi.stubEnv("JUMBO_TEST_MINIGAME_POOL", "");
    }
    try {
      const parsed = createTournamentSchema.safeParse({
        ...base,
        pool: ["stub"],
      });
      expect(parsed.success).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("accepts a non-dev-only kind when running in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    if (process.env.JUMBO_TEST_MINIGAME_POOL) {
      vi.stubEnv("JUMBO_TEST_MINIGAME_POOL", "");
    }
    try {
      const parsed = createTournamentSchema.safeParse({
        ...base,
        pool: ["trivia"],
      });
      expect(parsed.success).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
