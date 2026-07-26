/**
 * E2E support for the create form's pool picker. Under
 * JUMBO_TEST_MINIGAME_POOL every registered kind is eligible, so nothing is
 * auto-selected and a spec must say which minigame its game plays. Most specs
 * want the stub, whose deterministic countdown/play/scoring deadlines run a
 * match with no player input at all.
 */
import { expect, type Page } from "@playwright/test";

// Registry titles, not kind ids — the picker renders the title (see
// src/lib/minigames/{stub,trivia}/server.ts).
const STUB_TITLE = /Button Masher/i;
const TRIVIA_TITLE = /Trivia Tug-of-War/i;

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
}

/** Selects trivia alone, so the round draw can only land on it. */
export async function pickTriviaPool(page: Page): Promise<void> {
  await pick(page, TRIVIA_TITLE);
  await unpick(page, STUB_TITLE);
}
