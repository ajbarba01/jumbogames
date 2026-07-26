/**
 * E2E support for the multi-context lobby setup the round-level specs share:
 * signing a fresh account up, joining a game by its code, and creating a team
 * and readying it. Every spec that drives a real round needs all three across
 * several independent browser contexts, and they are identical wherever they
 * appear — so they live here once rather than being copied per spec. Hosting
 * stays with each spec, since the pool a game is created with is exactly what
 * that spec is choosing.
 */
import { expect, type Page } from "@playwright/test";

/** The password every E2E account is signed up with. */
export const PASSWORD = "password1234";

export async function signUp(
  page: Page,
  email: string,
  name: string,
): Promise<void> {
  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Display name").fill(name);
  await page.getByPlaceholder("Password (8+ characters)").fill(PASSWORD);
  await page.getByPlaceholder("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
}

export async function joinByCode(page: Page, code: string): Promise<void> {
  // The code field is segmented — focus the first cell and type; focus
  // advances per character.
  await page
    .getByRole("group", { name: "Game code" })
    .getByRole("textbox")
    .first()
    .click();
  await page.keyboard.type(code);
  await page.getByRole("button", { name: "Join" }).click();
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
