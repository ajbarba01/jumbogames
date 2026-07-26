/**
 * Authorization E2E (graded — backend-enforced authorization). The gate is now
 * split by kind rather than by membership: **reads are open, writes are not**
 * (DESIGN decision 16 — link = read, code = write). So this file proves the
 * pair. A signed-in stranger with no relationship to a game reads its board and
 * a real match view — requests that used to 404 — while the game code, which is
 * the write credential, is never rendered to them. And the write routes refuse
 * what the open read might otherwise have unlocked: joining a team with the
 * wrong code, creating a team with the wrong code (a separate route with its
 * own code check), and a non-leader kicking a team-mate.
 *
 * Runs against the dedicated test Supabase project.
 */
import { test, expect, type Page } from "@playwright/test";
import { pickStubPool } from "./support/create";
import { firstMatchId, profileIdByEmail, teamIdByName } from "./support/db";

const PASSWORD = "password1234";

async function signUp(page: Page, email: string, name: string): Promise<void> {
  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Display name").fill(name);
  await page.getByPlaceholder("Password (8+ characters)").fill(PASSWORD);
  await page.getByPlaceholder("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
}

test("a non-member reads the board and a match but is never handed the code", async ({
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

  // Host: sign up and create a game. Creation is open to any signed-in user
  // (M7) — no admin precondition needed here.
  await signUp(host, hostEmail, "Ada");
  await host.getByRole("button", { name: "Create a game" }).click();
  await host.waitForURL(/\/create$/);
  await host.getByPlaceholder("Thursday hacknight").fill("Authz Cup");
  await pickStubPool(host);
  await host.getByRole("button", { name: "Create game" }).click();
  await host.waitForURL(/\/t\/[^/]+$/);
  // Create fires the slam wipe; the destination is inert while covered
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
  await signUp(outsider, outsiderEmail, "Ivy");
  const lobbyResponse = await outsider.goto(tournamentUrl);
  expect(lobbyResponse?.status()).toBe(200);

  // Host readies team Alpha; player joins and readies team Bravo, so Start
  // unlocks (two ready teams).
  await host.getByPlaceholder("Team name").fill("Alpha");
  await host.getByRole("button", { name: "Create team" }).click();
  await expect(host.getByText("Alpha")).toBeVisible();
  await host.getByRole("button", { name: "Ready up" }).click();

  await signUp(player, playerEmail, "Grace");
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

  // The host is on their own team room now, so Bravo readying up reaches them
  // only as the enabled Start.
  const startButton = host.getByRole("button", { name: "Start game" });
  await expect(startButton).toBeEnabled();
  await startButton.click();

  // Both surfaces reach the round board (game is now active, matches
  // persisted).
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // Spectate by link: the outsider now reads the board (DESIGN decision 16)…
  const boardResponse = await outsider.goto(tournamentUrl);
  expect(boardResponse?.status()).toBe(200);
  await expect(
    outsider.getByRole("heading", { name: "Standings" }),
  ).toBeVisible();

  // …but the code is a write credential and is never handed to them.
  await expect(outsider.getByTestId("game-code")).toHaveCount(0);

  // And a real match view opens for them too — a valid id read from the DB.
  const matchId = await firstMatchId(tournamentId);
  expect(matchId).toBeTruthy();
  const matchResponse = await outsider.goto(`/t/${tournamentId}/m/${matchId}`);
  expect(matchResponse?.status()).toBe(200);

  await hostContext.close();
  await playerContext.close();
  await outsiderContext.close();
});

test("the write routes refuse a wrong code and a non-leader kick", async ({
  browser,
}) => {
  const stamp = Date.now();
  const hostEmail = `e2e-write-host+${stamp}@test.example.com`;
  const playerEmail = `e2e-write-player+${stamp}@test.example.com`;
  const outsiderEmail = `e2e-write-outsider+${stamp}@test.example.com`;

  const hostContext = await browser.newContext();
  const playerContext = await browser.newContext();
  const outsiderContext = await browser.newContext();
  const host = await hostContext.newPage();
  const player = await playerContext.newPage();
  const outsider = await outsiderContext.newPage();

  await signUp(host, hostEmail, "Ada");
  await host.getByRole("button", { name: "Create a game" }).click();
  await host.waitForURL(/\/create$/);
  await host.getByPlaceholder("Thursday hacknight").fill("Write Guard Cup");
  await pickStubPool(host);
  await host.getByRole("button", { name: "Create game" }).click();
  await host.waitForURL(/\/t\/[^/]+$/);
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  const tournamentId = host.url().split("/t/")[1].split("?")[0];
  const code = (await host.getByTestId("game-code").textContent())?.trim();
  expect(code).toBeTruthy();

  // The host leads Alpha; the player joins it, so the player is a member who
  // is NOT the leader — the only shape in which the leader-only rule can fail
  // open.
  await host.getByPlaceholder("Team name").fill("Alpha");
  await host.getByRole("button", { name: "Create team" }).click();
  await expect(host.getByText("Alpha")).toBeVisible();

  await signUp(player, playerEmail, "Grace");
  await player
    .getByRole("group", { name: "Game code" })
    .getByRole("textbox")
    .first()
    .click();
  await player.keyboard.type(code as string);
  await player.getByRole("button", { name: "Join" }).click();
  await player.waitForURL(/\/t\/[^/]+$/);
  await expect(player.getByTestId("slam-wipe")).toHaveCount(0);
  await player.getByRole("button", { name: "Join" }).click();
  await expect(player.getByRole("tab", { name: "My team" })).toBeVisible();

  await signUp(outsider, outsiderEmail, "Ivy");

  const teamId = await teamIdByName(tournamentId, "Alpha");
  const hostProfileId = await profileIdByEmail(hostEmail);
  const wrongCode = code === "ZZZZZZ" ? "YYYYYY" : "ZZZZZZ";

  // Joining a team with a code that isn't this game's is refused, even though
  // the outsider may legitimately read the page.
  const badJoin = await outsider.request.post(
    `/api/tournaments/${tournamentId}/teams/${teamId}/members`,
    { data: { code: wrongCode } },
  );
  expect(badJoin.status()).toBe(403);

  // Team creation is a separate route with its own code check — creating a
  // team seats the creator, so it is a join too, and an unguarded create would
  // be a way onto the roster without ever holding the code.
  const badCreate = await outsider.request.post(
    `/api/tournaments/${tournamentId}/teams`,
    { data: { name: "Sneaky", code: wrongCode } },
  );
  expect(badCreate.status()).toBe(403);

  // The refusal is the code, not the route: the same call with the real code
  // is accepted, so the 403 above cannot be a false pass from a broken route.
  const goodCreate = await outsider.request.post(
    `/api/tournaments/${tournamentId}/teams`,
    { data: { name: "Charlie", code } },
  );
  expect(goodCreate.status()).toBe(201);

  // A member who is not the leader cannot kick a team-mate — here the leader
  // themselves, the most valuable target.
  const badKick = await player.request.delete(
    `/api/tournaments/${tournamentId}/teams/${teamId}/members/${hostProfileId}`,
  );
  expect(badKick.status()).toBe(403);

  await hostContext.close();
  await playerContext.close();
  await outsiderContext.close();
});
