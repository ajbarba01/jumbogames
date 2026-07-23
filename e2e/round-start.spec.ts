/**
 * Round-start E2E: what a host's "Start round" click sets in motion now that
 * the E2E server's minigame pool is non-empty (see playwright.config.ts).
 * Board auto-pull carries roster players straight into their live match;
 * staff (host/admin) get a spectate link into any live match from the board;
 * a sitting-out team's player sees the board's bye card instead of one; and
 * starting the next round force-yields players still parked on their
 * finished match's end screen into their new one.
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

async function createAndReadyTeam(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder("Team name").fill(name);
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page.getByText(name)).toBeVisible();
  await page.getByRole("button", { name: "Ready up" }).click();
}

// The overview's "up next" slot card carries the drawn game's title, which is
// only ever rendered on a mounted match container (see Overview.tsx) — a
// match-page-only signal rather than an invented test id.
const MATCH_SLOT_CARD = { name: /Button Masher/ };

// The board never renders a match id either, so a player's own address bar is
// the only place to read the one they've been pulled into — matching the
// out-of-band read pattern the other specs use for ids the DOM withholds.
function matchLocationFromUrl(page: Page): {
  tournamentId: string;
  matchId: string;
} {
  const url = new URL(page.url());
  const found = /\/t\/([^/]+)\/m\/([^/]+)$/.exec(url.pathname);
  if (!found) throw new Error(`Expected a match URL, got ${page.url()}`);
  return { tournamentId: found[1], matchId: found[2] };
}

test("board auto-pull carries players into their match while the host stays on the board", async ({
  browser,
}) => {
  const stamp = Date.now();
  const hostEmail = `e2e-pull-host+${stamp}@test.example.com`;
  const alphaEmail = `e2e-pull-p1+${stamp}@test.example.com`;
  const bravoEmail = `e2e-pull-p2+${stamp}@test.example.com`;

  const hostContext = await browser.newContext();
  const alphaContext = await browser.newContext();
  const bravoContext = await browser.newContext();
  const host = await hostContext.newPage();
  const alpha = await alphaContext.newPage();
  const bravo = await bravoContext.newPage();

  await signUp(host, hostEmail);
  await promoteToAdmin(hostEmail);
  await host.reload();
  const code = await hostTournament(host, "Auto Pull Cup");

  // The host never joins a team, so it has no live match of its own.
  await signUp(alpha, alphaEmail);
  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");

  await signUp(bravo, bravoEmail);
  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await expect(host.getByText("Bravo")).toBeVisible();
  const startTournament = host.getByRole("button", {
    name: "Start tournament",
  });
  await expect(startTournament).toBeEnabled();
  await startTournament.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  const startRound = host.getByRole("button", { name: "Start round 1" });
  await expect(startRound).toBeVisible();
  await startRound.click();
  await expect(host.getByTestId("slam-wipe")).toBeVisible();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // Both rostered players are pulled straight off the board and into their
  // match — neither deliberately navigated there.
  await expect(alpha).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);
  await expect(bravo).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);
  await expect(alpha.getByRole("button", MATCH_SLOT_CARD)).toBeVisible();
  await expect(bravo.getByRole("button", MATCH_SLOT_CARD)).toBeVisible();

  // The host is on neither team, so it has no match to be pulled into and
  // stays on the board.
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();
  await expect(startRound).toHaveCount(0);

  await hostContext.close();
  await alphaContext.close();
  await bravoContext.close();
});

test("the host sees a spectate link into a live match and it opens the match", async ({
  browser,
}) => {
  const stamp = Date.now();
  const hostEmail = `e2e-spectate-host+${stamp}@test.example.com`;
  const alphaEmail = `e2e-spectate-p1+${stamp}@test.example.com`;
  const bravoEmail = `e2e-spectate-p2+${stamp}@test.example.com`;

  const hostContext = await browser.newContext();
  const alphaContext = await browser.newContext();
  const bravoContext = await browser.newContext();
  const host = await hostContext.newPage();
  const alpha = await alphaContext.newPage();
  const bravo = await bravoContext.newPage();

  await signUp(host, hostEmail);
  await promoteToAdmin(hostEmail);
  await host.reload();
  const code = await hostTournament(host, "Spectate Cup");

  await signUp(alpha, alphaEmail);
  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");

  await signUp(bravo, bravoEmail);
  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await expect(host.getByText("Bravo")).toBeVisible();
  const startTournament = host.getByRole("button", {
    name: "Start tournament",
  });
  await expect(startTournament).toBeEnabled();
  await startTournament.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  await host.getByRole("button", { name: "Start round 1" }).click();
  await expect(host.getByTestId("slam-wipe")).toBeVisible();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // The host is staff (host + admin, see resolveViewer) and is on neither
  // team, so it stays on the board and sees the live match's spectate link.
  const spectate = host.getByRole("link", { name: "Spectate" });
  await expect(spectate).toBeVisible();
  await spectate.click();
  await expect(host).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);
  await expect(host.getByRole("button", MATCH_SLOT_CARD)).toBeVisible();

  await hostContext.close();
  await alphaContext.close();
  await bravoContext.close();
});

test("a sitting-out team's player sees the board's bye card", async ({
  browser,
}) => {
  const stamp = Date.now();
  const hostEmail = `e2e-bye-host+${stamp}@test.example.com`;
  const alphaEmail = `e2e-bye-p1+${stamp}@test.example.com`;
  const bravoEmail = `e2e-bye-p2+${stamp}@test.example.com`;
  const charlieEmail = `e2e-bye-p3+${stamp}@test.example.com`;

  const hostContext = await browser.newContext();
  const alphaContext = await browser.newContext();
  const bravoContext = await browser.newContext();
  const charlieContext = await browser.newContext();
  const host = await hostContext.newPage();
  const alpha = await alphaContext.newPage();
  const bravo = await bravoContext.newPage();
  const charlie = await charlieContext.newPage();

  await signUp(host, hostEmail);
  await promoteToAdmin(hostEmail);
  await host.reload();
  const code = await hostTournament(host, "Bye Cup");

  await signUp(alpha, alphaEmail);
  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");

  await signUp(bravo, bravoEmail);
  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await signUp(charlie, charlieEmail);
  await joinByCode(charlie, code);
  await createAndReadyTeam(charlie, "Charlie");

  await expect(host.getByText("Charlie")).toBeVisible();
  const startTournament = host.getByRole("button", {
    name: "Start tournament",
  });
  await expect(startTournament).toBeEnabled();
  await startTournament.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  await host.getByRole("button", { name: "Start round 1" }).click();
  await expect(host.getByTestId("slam-wipe")).toBeVisible();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // The circle-method schedule seeds from server-side state the test cannot
  // predict, so which of the three teams sits out round 1 is read off the
  // host's own schedule rather than assumed.
  const round1Heading = host.getByText("Round 1", { exact: true });
  const round1Card = round1Heading.locator("xpath=./ancestor::div[1]");
  const byeRow = round1Card.locator("li").filter({ hasText: "bye" });
  await expect(byeRow).toHaveCount(1);
  const byeRowText = (await byeRow.textContent()) ?? "";
  const byeTeamName = byeRowText.replace(/bye$/i, "").trim();

  const playerByTeam: Record<string, Page> = {
    Alpha: alpha,
    Bravo: bravo,
    Charlie: charlie,
  };
  const byePlayer = playerByTeam[byeTeamName];
  expect(byePlayer).toBeDefined();

  await expect(byePlayer!.getByText("Bye round")).toBeVisible();

  await hostContext.close();
  await alphaContext.close();
  await bravoContext.close();
  await charlieContext.close();
});

test("starting the next round force-yields players off their finished match's end screen", async ({
  browser,
}) => {
  // The stub's own countdown/play/scoring deadlines (see lifecycle.ts) put a
  // firm ~18s floor under finishing round 1's matches, on top of the usual
  // signup and lobby setup, so the default per-test budget is too tight.
  test.setTimeout(120_000);

  const stamp = Date.now();
  const hostEmail = `e2e-yield-host+${stamp}@test.example.com`;
  const alphaEmail = `e2e-yield-p1+${stamp}@test.example.com`;
  const bravoEmail = `e2e-yield-p2+${stamp}@test.example.com`;
  const charlieEmail = `e2e-yield-p3+${stamp}@test.example.com`;
  const deltaEmail = `e2e-yield-p4+${stamp}@test.example.com`;

  const hostContext = await browser.newContext();
  const alphaContext = await browser.newContext();
  const bravoContext = await browser.newContext();
  const charlieContext = await browser.newContext();
  const deltaContext = await browser.newContext();
  const host = await hostContext.newPage();
  const alpha = await alphaContext.newPage();
  const bravo = await bravoContext.newPage();
  const charlie = await charlieContext.newPage();
  const delta = await deltaContext.newPage();

  await signUp(host, hostEmail);
  await promoteToAdmin(hostEmail);
  await host.reload();
  const code = await hostTournament(host, "Force Yield Cup");

  // Four teams, not two: a round-robin schedules zero byes only for an even
  // team count, so this is the smallest field that guarantees both tracked
  // players (Alpha and Bravo) land on a real match — never a bye — in round 2
  // as well as round 1, whichever way the schedule pairs them.
  await signUp(alpha, alphaEmail);
  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");

  await signUp(bravo, bravoEmail);
  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await signUp(charlie, charlieEmail);
  await joinByCode(charlie, code);
  await createAndReadyTeam(charlie, "Charlie");

  await signUp(delta, deltaEmail);
  await joinByCode(delta, code);
  await createAndReadyTeam(delta, "Delta");

  await expect(host.getByText("Delta")).toBeVisible();
  const startTournament = host.getByRole("button", {
    name: "Start tournament",
  });
  await expect(startTournament).toBeEnabled();
  await startTournament.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  await host.getByRole("button", { name: "Start round 1" }).click();
  await expect(host.getByTestId("slam-wipe")).toBeVisible();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // Auto-pull carries all four players into one of round 1's two matches.
  // Alpha's and Bravo's ids are recorded now, before either match is played,
  // so round 2's ids can later be proven different rather than assumed.
  for (const player of [alpha, bravo, charlie, delta]) {
    await expect(player).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);
    await expect(player.getByRole("button", MATCH_SLOT_CARD)).toBeVisible();
  }
  const alphaRound1Match = matchLocationFromUrl(alpha).matchId;
  const bravoRound1Match = matchLocationFromUrl(bravo).matchId;

  // The gate's ready button is driven by a shared-element zoom animation
  // whose completion callback is what unlocks it — awkward to pilot from
  // four independent browser contexts and no part of what this test is
  // about. The host's force-start valve (see the force-start route) skips
  // the ready gate outright and is exactly what it's for.
  for (const player of [alpha, bravo, charlie, delta]) {
    const { tournamentId, matchId } = matchLocationFromUrl(player);
    const origin = new URL(player.url()).origin;
    const res = await hostContext.request.post(
      `${origin}/api/tournaments/${tournamentId}/matches/${matchId}/slots/0/force-start`,
    );
    expect(res.ok()).toBe(true);
  }

  // From here the stub runs itself off persisted deadlines — countdown, a
  // fixed play window, then scoring — with no player input at all. Both
  // round 1 matches must reach their end screen for the round itself to flip
  // complete server-side.
  await Promise.all(
    [alpha, bravo, charlie, delta].map((player) =>
      expect(
        player.getByRole("heading", { name: "Match complete" }),
      ).toBeVisible({ timeout: 30_000 }),
    ),
  );

  // Alpha and Bravo are left sitting on that end screen — nothing here ever
  // clicks "Back to round board" — so only the host starting round 2 can move
  // them next.
  const startRound2 = host.getByRole("button", { name: "Start round 2" });
  await expect(startRound2).toBeVisible({ timeout: 15_000 });
  await startRound2.click();
  await expect(host.getByTestId("slam-wipe")).toBeVisible();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // The point of the test: the round-start broadcast force-yields both
  // players off their dead round 1 end screen and onto their round 2 match —
  // a genuinely different match id, not merely the same URL re-rendered.
  await alpha.waitForURL(
    (url) => {
      const found = /\/m\/([^/]+)$/.exec(url.pathname);
      return found !== null && found[1] !== alphaRound1Match;
    },
    { timeout: 15_000 },
  );
  await bravo.waitForURL(
    (url) => {
      const found = /\/m\/([^/]+)$/.exec(url.pathname);
      return found !== null && found[1] !== bravoRound1Match;
    },
    { timeout: 15_000 },
  );
  await expect(
    alpha.getByRole("heading", { name: "Match complete" }),
  ).toHaveCount(0);
  await expect(
    bravo.getByRole("heading", { name: "Match complete" }),
  ).toHaveCount(0);
  await expect(alpha.getByRole("button", MATCH_SLOT_CARD)).toBeVisible();
  await expect(bravo.getByRole("button", MATCH_SLOT_CARD)).toBeVisible();

  await hostContext.close();
  await alphaContext.close();
  await bravoContext.close();
  await charlieContext.close();
  await deltaContext.close();
});
