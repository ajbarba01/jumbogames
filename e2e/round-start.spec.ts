/**
 * Round-start E2E: what a host's "Start round" click sets in motion now that
 * the E2E server's minigame pool is non-empty (see playwright.config.ts).
 * Board auto-pull carries roster players straight into their live match;
 * staff (host/admin) get a spectate link into any live match from the board;
 * a sitting-out team's player sees the board's bye card instead of one; and
 * starting the next round force-yields players still parked on their
 * finished match's end screen into their new one. Restarting a game back to
 * the lobby is covered here too — it is a schedule-lifecycle mutation, and its
 * whole point is what survives it.
 * A finished round's result reaching the standings board — and the ended
 * board's final state — is covered here too, since it needs the same stub
 * round lifecycle.
 */
import { type Page } from "@playwright/test";
import { pickStubPool } from "./support/create";
import {
  createAndReadyTeam,
  joinByCode,
  readyUpThroughGate,
} from "./support/flows";
import { test, expect } from "./support/personas";
import { expectNoHorizontalOverflow } from "./support/viewport";

async function hostTournament(page: Page, name: string): Promise<string> {
  await page.getByRole("button", { name: "Create a game" }).click();
  await page.waitForURL(/\/create$/);
  await page.getByPlaceholder("Thursday hacknight").fill(name);
  // Under JUMBO_TEST_MINIGAME_POOL every registered kind is eligible and
  // nothing is auto-selected, so pin the pool to the deterministic stub — the
  // assertions below read its match card and run without player input.
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
  signedIn,
}) => {
  const { page: host } = await signedIn("admin");
  const { page: alpha } = await signedIn("p1");
  const { page: bravo } = await signedIn("p2");

  const code = await hostTournament(host, "Auto Pull Cup");

  // The host never joins a team, so it has no live match of its own.
  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");

  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await expect(host.getByText("Bravo")).toBeVisible();
  const startGame = host.getByRole("button", { name: "Start game" });
  await expect(startGame).toBeEnabled();
  await startGame.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  const startRound = host.getByRole("button", { name: "Start round 1" });
  await expect(startRound).toBeVisible();
  await startRound.click();
  // Wait for the round-transition wipe to clear before reading the board. Only
  // the settled (unmounted) state is asserted: the wipe is a fast transient that
  // can finish before a `toBeVisible()` poll ever catches it, so asserting it
  // was seen mid-sweep is inherently racy.
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
});

test("the host restarts a running game back to the lobby with its teams intact", async ({
  signedIn,
}) => {
  const { page: host } = await signedIn("admin");
  const { page: alpha } = await signedIn("p1");
  const { page: bravo } = await signedIn("p2");

  const code = await hostTournament(host, "Restart Cup");

  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");
  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await expect(host.getByText("Bravo")).toBeVisible();
  await host.getByRole("button", { name: "Start game" }).click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  // Restart is destructive and host-only, so it sits behind a confirm. The
  // dock button and the dialog's confirm share a label, so the second click is
  // scoped to the dialog by its aria-label rather than picked by position.
  await host.getByRole("button", { name: "Restart game" }).click();
  const confirm = host.getByRole("dialog", { name: "Restart game?" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "Restart game" }).click();

  // Back in the lobby: the board is gone and the game is startable again.
  await expect(host.getByRole("heading", { name: "Standings" })).toHaveCount(0);
  const startAgain = host.getByRole("button", { name: "Start game" });
  await expect(startAgain).toBeVisible();

  // The point of restart over delete: the roster survives, so the same teams
  // can play again without being rebuilt. Ready flags survive with it, and the
  // dock's own status line is the assertion for that — a still-enabled Start
  // would also be satisfied by the override button beside it.
  await expect(host.getByText("All teams are ready.")).toBeVisible();
  await expect(startAgain).toBeEnabled();

  // The names themselves live on the team picker, not the board: pre-start the
  // Board tab is deliberately empty ("Board opens when the host starts the
  // game"), so the roster has to be read where it is actually rendered.
  await host.getByRole("tab", { name: "Join a team" }).click();
  await expect(host.getByText("Alpha")).toBeVisible();
  await expect(host.getByText("Bravo")).toBeVisible();
});

test("the host sees a spectate link into a live match and it opens the match", async ({
  signedIn,
}) => {
  const { page: host } = await signedIn("admin");
  const { page: alpha } = await signedIn("p1");
  const { page: bravo } = await signedIn("p2");

  const code = await hostTournament(host, "Spectate Cup");

  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");

  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await expect(host.getByText("Bravo")).toBeVisible();
  const startGame = host.getByRole("button", { name: "Start game" });
  await expect(startGame).toBeEnabled();
  await startGame.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  await host.getByRole("button", { name: "Start round 1" }).click();
  // Wait for the round-transition wipe to clear before reading the board. Only
  // the settled (unmounted) state is asserted: the wipe is a fast transient that
  // can finish before a `toBeVisible()` poll ever catches it, so asserting it
  // was seen mid-sweep is inherently racy.
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // The host is staff (host + admin, see resolveViewer) and is on neither
  // team, so it stays on the board and sees the live match's spectate link.
  const spectate = host.getByRole("link", { name: "Spectate" });
  await expect(spectate).toBeVisible();
  await spectate.click();
  await expect(host).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);
  await expect(host.getByRole("button", MATCH_SLOT_CARD)).toBeVisible();

  // The match surface is where a player spends the round, phone in hand.
  await expectNoHorizontalOverflow(host, "/t/[id]/m/[matchId]");
});

test("a sitting-out team's player sees the board's bye card", async ({
  signedIn,
}) => {
  // Three signups, a lobby setup and a round start already sit close to the
  // default 30s budget, and the retry loop at the end needs its own 20s to be
  // worth anything. Leaving them to share one budget would let the per-test
  // timeout cut the retries short — the same two-budgets-collide bug that made
  // FORCE_REVEAL_MS a coin flip. Give the retry room that is actually its own.
  test.setTimeout(90_000);

  const { page: host } = await signedIn("admin");
  const { page: alpha } = await signedIn("p1");
  const { page: bravo } = await signedIn("p2");
  const { page: charlie } = await signedIn("p3");

  const code = await hostTournament(host, "Bye Cup");

  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");

  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await joinByCode(charlie, code);
  await createAndReadyTeam(charlie, "Charlie");

  await expect(host.getByText("Charlie")).toBeVisible();
  const startGame = host.getByRole("button", { name: "Start game" });
  await expect(startGame).toBeEnabled();
  await startGame.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  await host.getByRole("button", { name: "Start round 1" }).click();
  // Wait for the round-transition wipe to clear before reading the board. Only
  // the settled (unmounted) state is asserted: the wipe is a fast transient that
  // can finish before a `toBeVisible()` poll ever catches it, so asserting it
  // was seen mid-sweep is inherently racy.
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

  // The bye player takes no action this round, so their board only learns of the
  // bye from a Realtime broadcast -> router.refresh() (see BoardRefresher). That
  // push to an idle client is the flakiest hop in the suite. Reloading forces the
  // same fresh server render the app performs on tab-restore (useRefreshOnRestore),
  // so the assertion reflects server truth (viewerBye) rather than a possibly-
  // dropped or delayed broadcast.
  //
  // The reload is retried as a unit rather than awaited once: the broadcast this
  // step exists to bypass can still land while the reload is in flight, and the
  // refresh it triggers tears the navigation out from under Playwright
  // (`net::ERR_ABORTED; maybe frame was detached?`). That failure is instant, so
  // a longer timeout on the reload buys nothing — only another attempt does. A
  // bye card that never renders still fails once the outer budget runs out.
  await expect(async () => {
    await byePlayer!.reload();
    await expect(byePlayer!.getByText("Bye round")).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 20_000 });
});

test("starting the next round force-yields players off their finished match's end screen", async ({
  signedIn,
}) => {
  // The stub's own countdown/play/scoring deadlines (see lifecycle.ts) put a
  // firm ~18s floor under finishing round 1's matches, on top of the usual
  // signup and lobby setup, so the default per-test budget is too tight.
  test.setTimeout(120_000);

  const { page: host } = await signedIn("admin");
  const { page: alpha } = await signedIn("p1");
  const { page: bravo } = await signedIn("p2");
  const { page: charlie } = await signedIn("p3");
  const { page: delta } = await signedIn("p4");

  const code = await hostTournament(host, "Force Yield Cup");

  // Four teams, not two: a round-robin schedules zero byes only for an even
  // team count, so this is the smallest field that guarantees both tracked
  // players (Alpha and Bravo) land on a real match — never a bye — in round 2
  // as well as round 1, whichever way the schedule pairs them.
  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");

  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await joinByCode(charlie, code);
  await createAndReadyTeam(charlie, "Charlie");

  await joinByCode(delta, code);
  await createAndReadyTeam(delta, "Delta");

  await expect(host.getByText("Delta")).toBeVisible();
  const startGame = host.getByRole("button", { name: "Start game" });
  await expect(startGame).toBeEnabled();
  await startGame.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  await host.getByRole("button", { name: "Start round 1" }).click();
  // Wait for the round-transition wipe to clear before reading the board. Only
  // the settled (unmounted) state is asserted: the wipe is a fast transient that
  // can finish before a `toBeVisible()` poll ever catches it, so asserting it
  // was seen mid-sweep is inherently racy.
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

  await readyUpThroughGate([alpha, bravo, charlie, delta]);

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
  // Wait for the round-transition wipe to clear before reading the board. Only
  // the settled (unmounted) state is asserted: the wipe is a fast transient that
  // can finish before a `toBeVisible()` poll ever catches it, so asserting it
  // was seen mid-sweep is inherently racy.
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
});

test("a finished minigame reaches the standings and the ended board crowns its winner", async ({
  signedIn,
}) => {
  // The stub's countdown/play/scoring deadlines put a firm ~18s floor under
  // finishing the round, on top of signup and lobby setup.
  test.setTimeout(120_000);

  const { page: host } = await signedIn("admin");
  const { page: alpha } = await signedIn("p1");
  const { page: bravo } = await signedIn("p2");

  const code = await hostTournament(host, "Standings Cup");

  // Two teams is one match and one round, so the whole round-robin completes
  // here and the game can be ended without a second round.
  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");
  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await expect(host.getByText("Bravo")).toBeVisible();
  await host.getByRole("button", { name: "Start game" }).click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  await host.getByRole("button", { name: "Start round 1" }).click();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  await expect(alpha).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);
  await expect(bravo).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);
  await readyUpThroughGate([alpha, bravo]);

  // The stub ties at 0-0, which records no winner at all. Alpha mashes once
  // and Bravo never does, so Alpha's team mean beats zero and the slot
  // resolves to a real, predictable winner for the board to show.
  // Exact, not substring: "MASH" is also a substring of the Overview slot
  // card's "Button Masher" label, and that card's shared-layout exit
  // animation (see Overview.tsx's motion.button layoutId) keeps it mounted
  // for a beat after StubPlay's own MASH button appears, so an unscoped name
  // match hits both and Playwright's strict mode rejects it.
  const mash = alpha.getByRole("button", { name: "MASH", exact: true });
  await expect(mash).toBeEnabled({ timeout: 30_000 });
  await mash.click();
  await expect(alpha.getByText("You: 1")).toBeVisible();

  // Both players must reach the end screen for the round to flip complete
  // server-side.
  await Promise.all(
    [alpha, bravo].map((player) =>
      expect(
        player.getByRole("heading", { name: "Match complete" }),
      ).toBeVisible({ timeout: 30_000 }),
    ),
  );

  // The standings table's rows and the schedule's matchup rows are both
  // `<li>` elements that carry a team's name, so a bare listitem-and-name
  // filter is ambiguous once round 1 lands in the schedule below. Scoping to
  // the section that owns the "Standings" heading keeps the row to the one
  // table this test means to read.
  const standingsSection = host
    .locator("section")
    .filter({ has: host.getByRole("heading", { name: "Standings" }) });
  const alphaRow = standingsSection
    .getByRole("listitem")
    .filter({ hasText: "Alpha" });
  // A row is rank, team, games-won and movement, each its own direct <span>
  // (see StandingRow in round-board.tsx). Alpha ends the round undefeated at
  // rank 1 with 1 game won, so the row carries "1" twice — a plain text
  // filter is ambiguous the same way alphaRow itself was, and for the same
  // reason. The games-won column is the one that actually proves the finished
  // minigame reached the board, so it is addressed by position.
  const alphaGamesWon = alphaRow.locator("> span").nth(2);
  const alphaRank = alphaRow.locator("> span").nth(0);
  const alphaTeamName = alphaRow.locator("> span").nth(1);

  // The host took no action during the match, so its board learns of the
  // result only from a Realtime broadcast — the flakiest hop in the suite.
  // Reloading forces the same fresh server render the app performs on
  // tab-restore, so the assertion reflects server truth. Retried as a unit
  // because a broadcast landing mid-reload tears the navigation out from
  // under Playwright.
  await expect(async () => {
    await host.reload();
    await expect(alphaGamesWon).toHaveText("1", { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });

  // computeStandings has no phase input and getBoardState calls it
  // unconditionally, so Alpha is already rank 1 the instant it wins the only
  // match — well before "End game" is clicked. Rank alone can never
  // distinguish crowned from merely-winning, so the pre-end baseline this
  // test needs is the winner's team-name size, captured here before ending,
  // not its rank. There is still no final banner at this point.
  await expect(host.getByText("Ended · final standings")).toHaveCount(0);
  const beforeSize = await alphaTeamName.evaluate(
    (el) => getComputedStyle(el).fontSize,
  );

  // End the game: host-only, behind a confirm whose button shares the dock
  // button's label, so the second click is scoped to the dialog.
  await host.getByRole("button", { name: "End game" }).click();
  const confirm = host.getByRole("dialog", { name: "End game?" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "End game" }).click();

  // The ended board is the final-standings surface: same table, now frozen.
  // Alpha won the only minigame, so it is rank 1 alone once the game ends —
  // still true, though rank never changed and so cannot prove crowning.
  await expect(host.getByText("Ended · final standings")).toBeVisible({
    timeout: 15_000,
  });
  await expect(alphaRank).toHaveText("1", { timeout: 15_000 });

  // The champion treatment (round-board.tsx) swaps the winner's team-name
  // span from text-lg/font-bold to font-display/text-2xl — a size and voice
  // change, not a badge or label, since UI.md forbids word markers. Assert
  // the size actually grows once Alpha is crowned, rather than asserting a
  // class string a token rename would break, and rather than reusing rank —
  // which reads "1" identically whether or not the crown ever renders.
  await expect(async () => {
    const afterSize = await alphaTeamName.evaluate(
      (el) => getComputedStyle(el).fontSize,
    );
    expect(parseFloat(afterSize)).toBeGreaterThan(parseFloat(beforeSize));
  }).toPass({ timeout: 15_000 });

  // The board is also read on a phone between rounds.
  await expectNoHorizontalOverflow(host, "/t/[id] (ended board)");
});
