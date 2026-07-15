/**
 * Lobby happy-path E2E: an admin hosts a tournament, a player joins by code,
 * both create and ready a team, and the host starts. Exercises the full M3
 * shell flow through real auth and Realtime against the test Supabase project.
 * The host is a fresh signup promoted to admin — a precondition the UI cannot
 * set for itself.
 */
import { test, expect, type Page } from "@playwright/test";
import { promoteToAdmin } from "./support/db";

const PASSWORD = "password1234";

async function signUp(page: Page, email: string): Promise<void> {
  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill(PASSWORD);
  await page.getByPlaceholder("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
}

test("admin hosts, player joins, teams ready up, and the host starts", async ({
  browser,
}) => {
  const stamp = Date.now();
  const hostEmail = `e2e-host+${stamp}@test.example.com`;
  const playerEmail = `e2e-player+${stamp}@test.example.com`;

  const hostContext = await browser.newContext();
  const playerContext = await browser.newContext();
  const host = await hostContext.newPage();
  const player = await playerContext.newPage();

  // Host: sign up, gain admin, and create a tournament.
  await signUp(host, hostEmail);
  await promoteToAdmin(hostEmail);
  await host.reload();

  await host.getByPlaceholder("Tournament name").fill("E2E Cup");
  await host.getByRole("button", { name: "Create and host" }).click();
  await host.waitForURL(/\/t\/[^/]+$/);

  const code = (await host.getByTestId("game-code").textContent())?.trim();
  expect(code).toBeTruthy();

  // Host creates and readies team Alpha.
  await host.getByPlaceholder("Team name").fill("Alpha");
  await host.getByRole("button", { name: "Create team" }).click();
  await expect(host.getByText("Alpha")).toBeVisible();
  await host.getByRole("button", { name: "Ready up" }).click();

  // Player: sign up, join by code, create and ready team Bravo.
  await signUp(player, playerEmail);
  await player.getByPlaceholder("Game code").fill(code as string);
  await player.getByRole("button", { name: "Join" }).click();
  await player.waitForURL(/\/t\/[^/]+$/);

  await expect(player.getByText("Alpha")).toBeVisible();
  await player.getByPlaceholder("Team name").fill("Bravo");
  await player.getByRole("button", { name: "Create team" }).click();
  await player.getByRole("button", { name: "Ready up" }).click();

  // Host sees Bravo arrive over Realtime; Start enables once all are ready.
  await expect(host.getByText("Bravo")).toBeVisible();
  const startButton = host.getByRole("button", { name: "Start tournament" });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Both surfaces reflect the started tournament.
  await expect(host.getByText("Tournament started")).toBeVisible();
  await expect(player.getByText("Tournament started")).toBeVisible();

  await hostContext.close();
  await playerContext.close();
});
