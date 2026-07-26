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
import { type Page } from "@playwright/test";
import { pickStubPool } from "./support/create";
import { test, expect } from "./support/personas";

async function hostTournament(page: Page, name: string): Promise<string> {
  await page.getByRole("button", { name: "Create a game" }).click();
  await page.waitForURL(/\/create$/);
  await page.getByPlaceholder("Thursday hacknight").fill(name);
  await pickStubPool(page);
  await page.getByRole("button", { name: "Create game" }).click();
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
  // Exact: home also carries a "Rejoin <game>" button whenever the account is
  // already in a live game, and personas usually are.
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await page.waitForURL(/\/t\/[^/]+$/);
  await expect(page.getByTestId("slam-wipe")).toHaveCount(0);
}

test("a lobby restored by browser back shows a team created while it was away", async ({
  signedIn,
}) => {
  const { page: host } = await signedIn("host");
  const { page: player } = await signedIn("p1");

  const code = await hostTournament(host, "Back Nav Cup");

  await joinByCode(player, code);
  await expect(player.getByPlaceholder("Team name")).toBeVisible();

  // The host leaves the lobby BEFORE the change happens. Two things matter
  // here: leaving unmounts the client, so no Realtime broadcast can deliver
  // the team below (which would make this pass trivially); and leaving via the
  // in-app link is a client-side navigation, so the return trip is a client
  // router cache restore rather than a fresh document fetch.
  await host.getByRole("link", { name: "← Home" }).click();
  // Named rather than bare "Rejoin": the account carries games from earlier
  // specs, so only this game's own rejoin proves the host actually left.
  await expect(
    host.getByRole("button", { name: "Rejoin Back Nav Cup" }),
  ).toBeVisible();

  await player.getByPlaceholder("Team name").fill("Bravo");
  await player.getByRole("button", { name: "Create team" }).click();
  await expect(player.getByText("Bravo")).toBeVisible();

  // Back restores the lobby from the client router cache; the resync-on-restore
  // hook refetches canonical state, so the team is present without waiting for
  // any further broadcast.
  await host.goBack();
  await host.waitForURL(/\/t\/[^/]+$/);
  await expect(host.getByText("Bravo")).toBeVisible();
});

test("the host round-start beat plays the wipe", async ({ signedIn }) => {
  const { page: host } = await signedIn("host");
  const { page: player } = await signedIn("p1");

  const code = await hostTournament(host, "Beat Wipe Cup");

  await host.getByPlaceholder("Team name").fill("Alpha");
  await host.getByRole("button", { name: "Create team" }).click();
  await expect(host.getByText("Alpha")).toBeVisible();
  await host.getByRole("button", { name: "Ready up" }).click();

  await joinByCode(player, code);
  await player.getByPlaceholder("Team name").fill("Bravo");
  await player.getByRole("button", { name: "Create team" }).click();
  await player.getByRole("button", { name: "Ready up" }).click();

  // The host is on their own team room, so Bravo readying up shows up only as
  // the dock's Start unlocking — the tabbed surface has no all-teams view
  // before the board opens.
  const startGame = host.getByRole("button", { name: "Start game" });
  await expect(startGame).toBeEnabled();
  await startGame.click();

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
});
