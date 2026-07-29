/**
 * E2E support for the create form's pool picker. Under
 * JUMBO_TEST_MINIGAME_POOL every registered kind is eligible, so nothing is
 * auto-selected and a spec must say which minigame its game plays. Most specs
 * want the stub, whose deterministic countdown/play/scoring deadlines run a
 * match with no player input at all.
 */
import { expect, type Page } from "@playwright/test";

// Registry titles, not kind ids — the picker renders the title (see
// packages/engine/src/minigames/{stub,trivia}/server.ts). Renaming a game in
// the registry breaks every spec that picks a pool, including the ones that
// only *unpick* it, so these are the first thing to check when a whole file's
// worth of tests dies in setup.
const STUB_TITLE = /Button Masher/i;
const TRIVIA_TITLE = /Tug O' Lore/i;
const WORDLOCK_TITLE = /Word Lock/i;

async function pick(page: Page, title: RegExp): Promise<void> {
  const card = page.getByRole("button", { name: title });
  await expect(card).toBeVisible();
  if ((await card.getAttribute("aria-pressed")) !== "true") {
    await card.click();
  }
  await expect(card).toHaveAttribute("aria-pressed", "true");
}

async function unpick(page: Page, title: RegExp): Promise<void> {
  const card = page.getByRole("button", { name: title });
  if ((await card.getAttribute("aria-pressed")) === "true") {
    await card.click();
  }
  await expect(card).toHaveAttribute("aria-pressed", "false");
}

/** Selects the deterministic stub and deselects anything else. */
export async function pickStubPool(page: Page): Promise<void> {
  await pick(page, STUB_TITLE);
  await unpick(page, TRIVIA_TITLE);
  await unpick(page, WORDLOCK_TITLE);
}

/** Selects trivia alone, so the round draw can only land on it. */
export async function pickTriviaPool(page: Page): Promise<void> {
  await pick(page, TRIVIA_TITLE);
  await unpick(page, STUB_TITLE);
  await unpick(page, WORDLOCK_TITLE);
}

/** Selects Word Lock alone, so the round draw can only land on it. */
export async function pickWordLockPool(page: Page): Promise<void> {
  await pick(page, WORDLOCK_TITLE);
  await unpick(page, STUB_TITLE);
  await unpick(page, TRIVIA_TITLE);
}
