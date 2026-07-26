/**
 * E2E support for the multi-context lobby setup the round-level specs share:
 * joining a game by its code, and creating a team and readying it. Every spec
 * that drives a real round needs both across several independent browser
 * contexts, and they are identical wherever they appear — so they live here
 * once rather than being copied per spec. Getting a signed-in context at all
 * belongs to personas.ts; hosting stays with each spec, since the pool a game
 * is created with is exactly what that spec is choosing.
 */
import { expect, type Page } from "@playwright/test";

export async function joinByCode(page: Page, code: string): Promise<void> {
  // The code field is segmented — focus the first cell and type; focus
  // advances per character.
  await page
    .getByRole("group", { name: "Game code" })
    .getByRole("textbox")
    .first()
    .click();
  await page.keyboard.type(code);
  // Exact: home also carries a "Rejoin <game>" button whenever the account is
  // already in a live game, and personas usually are.
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await page.waitForURL(/\/t\/[^/]+$/);
  await expect(page.getByTestId("slam-wipe")).toHaveCount(0);
}

export async function createAndReadyTeam(
  page: Page,
  name: string,
): Promise<void> {
  await page.getByPlaceholder("Team name").fill(name);
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page.getByText(name)).toBeVisible();
  await page.getByRole("button", { name: "Ready up" }).click();
}
