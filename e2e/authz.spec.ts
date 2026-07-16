/**
 * Authorization E2E (graded — backend-enforced authorization): a signed-in user
 * with no relationship to a tournament is refused (404) on its lobby, its board,
 * and a match view, even holding valid ids. Proves the shared viewer-membership
 * gate. Runs against the dedicated test Supabase project.
 */
import { test, expect, type Page } from "@playwright/test";
import { promoteToAdmin, firstMatchId } from "./support/db";

const PASSWORD = "password1234";

async function signUp(page: Page, email: string): Promise<void> {
  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill(PASSWORD);
  await page.getByPlaceholder("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
}

test("a non-member is refused on lobby, board, and match", async ({
  browser,
}) => {
  const stamp = Date.now();
  const hostEmail = `e2e-authz-host+${stamp}@test.example.com`;
  const playerEmail = `e2e-authz-player+${stamp}@test.example.com`;
  const outsiderEmail = `e2e-authz-outsider+${stamp}@test.example.com`;

  const hostContext = await browser.newContext();
  const playerContext = await browser.newContext();
  const outsiderContext = await browser.newContext();
  const host = await hostContext.newPage();
  const player = await playerContext.newPage();
  const outsider = await outsiderContext.newPage();

  // Host: sign up, gain admin, create a tournament.
  await signUp(host, hostEmail);
  await promoteToAdmin(hostEmail);
  await host.reload();
  await host.getByRole("button", { name: "Create tournament" }).click();
  await host.waitForURL(/\/host$/);
  await host.getByPlaceholder("Tournament name").fill("Authz Cup");
  await host.getByRole("button", { name: "Create and host" }).click();
  await host.waitForURL(/\/t\/[^/]+$/);
  // Create-and-host fires the slam wipe; the destination is inert while covered
  // and `.fill()` no-ops against an inert field, so wait for the panel to clear
  // before typing.
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  const tournamentUrl = host.url();
  const tournamentId = tournamentUrl.split("/t/")[1];
  expect(tournamentId).toBeTruthy();

  const code = (await host.getByTestId("game-code").textContent())?.trim();
  expect(code).toBeTruthy();

  // The lobby is joinable by code, so during the lobby phase any signed-in user
  // may read it (they may hold the code) — the gate deliberately opens here.
  // The same URL is refused once the tournament locks (asserted after start).
  await signUp(outsider, outsiderEmail);
  const lobbyResponse = await outsider.goto(tournamentUrl);
  expect(lobbyResponse?.status()).toBe(200);

  // Host readies team Alpha; player joins and readies team Bravo, so Start
  // unlocks (two ready teams).
  await host.getByPlaceholder("Team name").fill("Alpha");
  await host.getByRole("button", { name: "Create team" }).click();
  await expect(host.getByText("Alpha")).toBeVisible();
  await host.getByRole("button", { name: "Ready up" }).click();

  await signUp(player, playerEmail);
  await player
    .getByRole("group", { name: "Game code" })
    .getByRole("textbox")
    .first()
    .click();
  await player.keyboard.type(code as string);
  await player.getByRole("button", { name: "Join" }).click();
  await player.waitForURL(/\/t\/[^/]+$/);
  await expect(player.getByTestId("slam-wipe")).toHaveCount(0);

  await player.getByPlaceholder("Team name").fill("Bravo");
  await player.getByRole("button", { name: "Create team" }).click();
  await player.getByRole("button", { name: "Ready up" }).click();

  await expect(host.getByText("Bravo")).toBeVisible();
  const startButton = host.getByRole("button", { name: "Start tournament" });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Both surfaces reach the round board (tournament is now active, matches
  // persisted).
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // The outsider is still refused on the same URL now that it renders the board.
  const boardResponse = await outsider.goto(tournamentUrl);
  expect(boardResponse?.status()).toBe(404);

  // And is refused on a real match view — a valid id read from the DB.
  const matchId = await firstMatchId(tournamentId);
  expect(matchId).toBeTruthy();
  const matchResponse = await outsider.goto(`/t/${tournamentId}/m/${matchId}`);
  expect(matchResponse?.status()).toBe(404);

  await hostContext.close();
  await playerContext.close();
  await outsiderContext.close();
});
