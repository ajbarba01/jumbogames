/**
 * Lobby happy-path E2E: an admin hosts a game, a player joins by code, both
 * create and ready a team, and the host starts. Exercises the full M3 shell
 * flow through real auth and Realtime against the test Supabase project,
 * including the lobby → board start beat firing the slam wipe on both clients.
 * The host is a fresh signup promoted to admin — a precondition the UI cannot
 * set for itself.
 *
 * The surface is now one tabbed page at every phase, so this spec also pins the
 * pre-start shape: the Board tab present but disabled with its own status line,
 * and the team tab naming what the viewer has. That has one consequence the
 * step order below is built around — the team tab shows the viewer's OWN team
 * once they have one, so a host who has made a team can no longer see the
 * lobby's other teams or the waiting-players list until the board unlocks.
 * Assertions about other teams therefore run either before the host makes
 * theirs, or from the board after the start.
 */
import { test, expect, type Page } from "@playwright/test";
import { pickStubPool } from "./support/create";
import { promoteToAdmin } from "./support/db";
import { expectNoHorizontalOverflow } from "./support/viewport";

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
  await signUp(host, hostEmail, "Ada");
  await promoteToAdmin(hostEmail);
  await host.reload();

  await host.getByRole("button", { name: "Create a game" }).click();
  await host.waitForURL(/\/create$/);
  await host.getByPlaceholder("Thursday hacknight").fill("E2E Cup");
  // Under JUMBO_TEST_MINIGAME_POOL every registered kind is eligible and
  // nothing is auto-selected, so the pool has to be picked explicitly.
  await pickStubPool(host);
  await host.getByRole("button", { name: "Create game" }).click();
  await host.waitForURL(/\/t\/[^/]+$/);
  // Create-and-host now fires the slam wipe (a game-beat crossing into the
  // tournament surface): the destination subtree is `inert` — and `.fill()`
  // silently no-ops against an inert field rather than waiting it out the way
  // `.click()` does — so wait for the panel to fully detach before typing.
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  const code = (await host.getByTestId("game-code").textContent())?.trim();
  expect(code).toBeTruthy();

  // Player: sign up and join by code, before any team exists — while the host
  // is still on the picker and can therefore see the waiting-players card. The
  // code field is segmented: focus the first cell and type; focus advances per
  // character.
  await signUp(player, playerEmail, "Grace");
  await player
    .getByRole("group", { name: "Game code" })
    .getByRole("textbox")
    .first()
    .click();
  await player.keyboard.type(code as string);
  await player.getByRole("button", { name: "Join" }).click();
  await player.waitForURL(/\/t\/[^/]+$/);
  // Join also fires the slam wipe now — same inert/`.fill()` hazard as above.
  await expect(player.getByTestId("slam-wipe")).toHaveCount(0);

  // The teamless player shows up in the host's "not on a team yet" card,
  // driven by lobby presence. Presence renders the player's display name, not
  // their email (leak-fix regression guard): the name must be visible and the
  // email must not appear at all.
  await expect(host.getByText("Not on a team yet")).toBeVisible();
  await expect(host.getByText("Grace")).toBeVisible();
  await expect(host.getByText(playerEmail)).toHaveCount(0);

  // Host creates and readies team Alpha; the host's tab now shows their own
  // team room rather than the picker.
  await host.getByPlaceholder("Team name").fill("Alpha");
  await host.getByRole("button", { name: "Create team" }).click();
  await expect(host.getByText("Alpha")).toBeVisible();
  await host.getByRole("button", { name: "Ready up" }).click();

  // Alpha reaches the still-teamless player's picker over Realtime.
  await expect(player.getByText("Alpha")).toBeVisible();

  await player.getByPlaceholder("Team name").fill("Bravo");
  await player.getByRole("button", { name: "Create team" }).click();
  await player.getByRole("button", { name: "Ready up" }).click();

  // Once rostered, the player's own team room lists them by display name and
  // never by email — the same leak guard, on the roster render this time.
  await expect(player.getByText("Grace")).toBeVisible();
  await expect(player.getByText(playerEmail)).toHaveCount(0);

  // The tab bar is present from the start; the Board is locked until the host
  // starts, and says so rather than showing an empty schedule.
  await expect(host.getByRole("tab", { name: "Board" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(
    host.getByText("Board opens when the host starts the game"),
  ).toBeVisible();
  await expect(host.getByRole("tab", { name: "My team" })).toBeVisible();
  await expect(player.getByRole("tab", { name: "My team" })).toBeVisible();

  // Bravo readying up is what unlocks Start, and that fact reaches the host
  // only over Realtime — the host is on their own team room and cannot see
  // Bravo itself until the board opens, so the enabled Start is the assertion
  // that the roster change actually arrived.
  const startButton = host.getByRole("button", { name: "Start game" });
  await expect(startButton).toBeEnabled();

  // The lobby is fully populated here — code, a team room, the host dock — so
  // it is the right moment to hold it to the floor width (docs/UI.md).
  await expectNoHorizontalOverflow(host, "/t/[id] (lobby, host)");
  await expectNoHorizontalOverflow(player, "/t/[id] (lobby, player)");

  await startButton.click();

  // The start beat is Realtime-driven (not a local navigation), so it fires
  // the slam wipe on every client together — assert the panel actually plays
  // on both, not just that the board eventually shows up unwiped.
  await expect(host.getByTestId("slam-wipe")).toBeVisible();
  await expect(player.getByTestId("slam-wipe")).toBeVisible();

  // Both surfaces swap to the round board once the game starts: the Board tab
  // unlocks and auto-selects, and the board is what the panel now shows.
  await expect(host.getByRole("tab", { name: "Board" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();
  await expect(host.getByText("Round 1", { exact: true })).toBeVisible();
  await expect(
    player.getByRole("heading", { name: "Standings" }),
  ).toBeVisible();

  // The board is also the first place the host can see the other team at all,
  // so the standings are where "Bravo arrived" is finally read directly. Scoped
  // to the standings section because the schedule names it a second time.
  const standings = host
    .getByRole("heading", { name: "Standings" })
    .locator("xpath=./ancestor::section[1]");
  await expect(standings.getByText("Bravo")).toBeVisible();

  // The panel fully detaches on both clients afterward — never traps them
  // under it. Same hazard as the create/join wipes above: the destination is
  // `inert` while covered, so anything relying on interactivity must wait for
  // this before proceeding.
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);
  await expect(player.getByTestId("slam-wipe")).toHaveCount(0);

  // The round board carries the widest content in the app (standings plus the
  // round's matches), and a spectator may well be on a phone.
  await expectNoHorizontalOverflow(host, "/t/[id] (round board, host)");
  await expectNoHorizontalOverflow(player, "/t/[id] (round board, player)");

  // Home offers a rejoin while the tournament is live; it routes back to it.
  await host.goto("/");
  const rejoin = host.getByRole("button", { name: "Rejoin" });
  await expect(rejoin).toBeVisible();
  await rejoin.click();
  await host.waitForURL(/\/t\/[^/]+$/);

  // Host ends the game behind the confirm; both boards flip to ended.
  await host.getByRole("button", { name: "End game" }).click();
  await host
    .getByRole("dialog", { name: "End game?" })
    .getByRole("button", { name: "End game" })
    .click();
  await expect(host.getByText("Ended · final standings")).toBeVisible();
  await expect(player.getByText("Ended · final standings")).toBeVisible();

  await hostContext.close();
  await playerContext.close();
});
