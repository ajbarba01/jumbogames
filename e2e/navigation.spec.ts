/**
 * Navigation-hardening E2E: the two protocols that the wipe and lobby specs
 * cannot reach. First, a lobby restored by browser back shows state that
 * changed while it was away — the client router cache reuses a page's RSC
 * payload on back/forward, and no Realtime broadcast reaches an unmounted
 * client, so only an explicit resync on restore can heal it. Second, the host's
 * round-start beat plays the slam wipe, so the board swap happens behind the
 * panel rather than in the open.
 *
 * Match entry's own wipe is covered separately, in round-start.spec.ts, now
 * that the E2E server's minigame pool is non-empty (see playwright.config.ts).
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

async function hostTournament(page: Page, name: string): Promise<string> {
  await page.getByRole("button", { name: "Create tournament" }).click();
  await page.waitForURL(/\/host$/);
  await page.getByPlaceholder("Tournament name").fill(name);
  await page.getByRole("button", { name: "Create and host" }).click();
  await page.waitForURL(/\/t\/[^/]+$/);
  // The destination subtree is inert while covered and `.fill()` no-ops
  // against it rather than waiting, so let the panel detach before reading.
  await expect(page.getByTestId("slam-wipe")).toHaveCount(0);
  const code = (await page.getByTestId("game-code").textContent())?.trim();
  expect(code).toBeTruthy();
  return code as string;
}

async function joinByCode(page: Page, code: string): Promise<void> {
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

test("a lobby restored by browser back shows a team created while it was away", async ({
  browser,
}) => {
  const stamp = Date.now();
  const hostEmail = `e2e-back-host+${stamp}@test.example.com`;
  const playerEmail = `e2e-back-player+${stamp}@test.example.com`;

  const hostContext = await browser.newContext();
  const playerContext = await browser.newContext();
  const host = await hostContext.newPage();
  const player = await playerContext.newPage();

  await signUp(host, hostEmail);
  await promoteToAdmin(hostEmail);
  await host.reload();
  const code = await hostTournament(host, "Back Nav Cup");

  await signUp(player, playerEmail);
  await joinByCode(player, code);
  await expect(player.getByPlaceholder("Team name")).toBeVisible();

  // The host leaves the lobby BEFORE the change happens. Two things matter
  // here: leaving unmounts the client, so no Realtime broadcast can deliver
  // the team below (which would make this pass trivially); and leaving via the
  // in-app link is a client-side navigation, so the return trip is a client
  // router cache restore rather than a fresh document fetch.
  await host.getByRole("link", { name: "← Home" }).click();
  await expect(host.getByRole("button", { name: "Rejoin" })).toBeVisible();

  await player.getByPlaceholder("Team name").fill("Bravo");
  await player.getByRole("button", { name: "Create team" }).click();
  await expect(player.getByText("Bravo")).toBeVisible();

  // Back restores the lobby from the client router cache; the resync-on-restore
  // hook refetches canonical state, so the team is present without waiting for
  // any further broadcast.
  await host.goBack();
  await host.waitForURL(/\/t\/[^/]+$/);
  await expect(host.getByText("Bravo")).toBeVisible();

  await hostContext.close();
  await playerContext.close();
});

test("the host round-start beat plays the wipe", async ({ browser }) => {
  const stamp = Date.now();
  const hostEmail = `e2e-beat-host+${stamp}@test.example.com`;
  const playerEmail = `e2e-beat-player+${stamp}@test.example.com`;

  const hostContext = await browser.newContext();
  const playerContext = await browser.newContext();
  const host = await hostContext.newPage();
  const player = await playerContext.newPage();

  await signUp(host, hostEmail);
  await promoteToAdmin(hostEmail);
  await host.reload();
  const code = await hostTournament(host, "Beat Wipe Cup");

  await host.getByPlaceholder("Team name").fill("Alpha");
  await host.getByRole("button", { name: "Create team" }).click();
  await expect(host.getByText("Alpha")).toBeVisible();
  await host.getByRole("button", { name: "Ready up" }).click();

  await signUp(player, playerEmail);
  await joinByCode(player, code);
  await player.getByPlaceholder("Team name").fill("Bravo");
  await player.getByRole("button", { name: "Create team" }).click();
  await player.getByRole("button", { name: "Ready up" }).click();

  await expect(host.getByText("Bravo")).toBeVisible();
  const startTournament = host.getByRole("button", {
    name: "Start tournament",
  });
  await expect(startTournament).toBeEnabled();
  await startTournament.click();

  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);
  await expect(
    player.getByRole("heading", { name: "Standings" }),
  ).toBeVisible();
  await expect(player.getByTestId("slam-wipe")).toHaveCount(0);

  // The host starts the round. The POST is awaited uncovered, then the board
  // swap runs inside the wipe's transition — so the panel must appear and then
  // fully detach, leaving the started board interactive.
  const startRound = host.getByRole("button", { name: "Start round 1" });
  await expect(startRound).toBeVisible();
  await startRound.click();
  await expect(host.getByTestId("slam-wipe")).toBeVisible();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // Team Alpha is the host's own team, and this two-team tournament pairs it
  // against Bravo — so once the board reflects the started round, auto-pull
  // carries the host straight off the board and into that match instead of
  // leaving the started board in view.
  await expect(host).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);
  await expect(
    host.getByRole("button", { name: /Button Masher/ }),
  ).toBeVisible();

  await hostContext.close();
  await playerContext.close();
});
