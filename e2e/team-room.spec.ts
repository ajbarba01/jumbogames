/**
 * Team-room E2E: the roster is fluid between rounds and shut during one, and a
 * signed-in stranger can spectate a game by bare link.
 *
 * Three behaviours, none of which existed before this slice:
 *
 * 1. **Roster fluidity.** Joining, leaving and a leader's kick are open after
 *    the game has started, whenever the team has no live match. Two emptying
 *    paths are covered separately because they fail in opposite directions and
 *    both fail silently: post-start the team must SURVIVE with no members
 *    (Match.teamA/teamB are `onDelete: Cascade`, so deleting it would take the
 *    schedule with it and raise nothing), and pre-start it must be DELETED
 *    (a guard that over-corrects turns the emptied-team delete into a
 *    permanent no-op and leaves ghost teams in every lobby).
 * 2. **The lock.** A team in a live match refuses roster changes. That is a
 *    server rule, so the disabled Join is not the evidence — the 409 from the
 *    membership route is.
 * 3. **Spectate by link.** A signed-in user who never held the code opens the
 *    game and reads the board and a live match. This is a NEW GRANT, not a
 *    tidy-up: before this slice the identical request returned 404. The code
 *    stays a write credential, so the picker asks them for it and refuses a
 *    wrong one.
 *
 * Floor-width guards for the game surfaces live here rather than in
 * responsive.spec, which sweeps non-game routes only: the started game these
 * tests build is what those surfaces need, and it is built here.
 */
import { type Locator, type Page } from "@playwright/test";
import { pickStubPool } from "./support/create";
import { matchCountForTeam, teamIdByName } from "./support/db";
import { test, expect } from "./support/personas";
import { expectNoHorizontalOverflow } from "./support/viewport";

const CODE_LENGTH = 6;
const LOCK_MESSAGE = "In a match — opens after this round";

// The overview's "up next" slot card carries the drawn game's title and is
// only ever rendered on a mounted match container — a match-page-only signal
// rather than an invented test id (same rationale as round-start.spec).
const MATCH_SLOT_CARD = { name: /Button Masher/ };

async function hostGame(page: Page, name: string): Promise<string> {
  await page.getByRole("button", { name: "Create a game" }).click();
  await page.waitForURL(/\/create$/);
  await page.getByPlaceholder("Thursday hacknight").fill(name);
  // MATCH_SLOT_CARD above reads the stub's title off the drawn match, so the
  // pool has to be pinned to it rather than left to the picker.
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

function gameIdOf(page: Page): string {
  const found = /\/t\/([^/?]+)/.exec(page.url());
  if (!found) throw new Error(`Expected a game URL, got ${page.url()}`);
  return found[1];
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
  await page.waitForURL(/\/t\/[^/]+/);
  await expect(page.getByTestId("slam-wipe")).toHaveCount(0);
}

async function createAndReadyTeam(page: Page, name: string): Promise<void> {
  await page.getByPlaceholder("Team name").fill(name);
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page.getByText(name)).toBeVisible();
  await page.getByRole("button", { name: "Ready up" }).click();
}

/**
 * One team's card in the picker. Cards are the kit's `Card`, whose root carries
 * the `sticker` class, so scoping by the team's own name reaches exactly its
 * row — the picker renders no team id anywhere.
 */
function teamCard(page: Page, name: string): Locator {
  return page.locator("div.sticker").filter({ hasText: name });
}

/** Types a code into a picker row's inline prompt and submits it. */
async function submitCodeInCard(
  page: Page,
  card: Locator,
  code: string,
): Promise<void> {
  await card
    .getByRole("group", { name: "Game code" })
    .getByRole("textbox")
    .first()
    .click();
  await page.keyboard.type(code);
  await card.getByRole("button", { name: "Confirm" }).click();
}

/** Empties a picker row's inline code field so a second code can be typed. */
async function clearCodeInCard(page: Page, card: Locator): Promise<void> {
  const cells = card
    .getByRole("group", { name: "Game code" })
    .getByRole("textbox");
  await cells.nth(CODE_LENGTH - 1).click();
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    await page.keyboard.press("Backspace");
  }
}

/**
 * Reload-and-assert, retried as a unit — the established remedy for this
 * suite's one documented flake (see the long note in round-start.spec). A
 * client that took no action learns of a roster change only from a Realtime
 * broadcast driving router.refresh(), and a push to an idle client is the
 * flakiest hop here; reloading forces the same fresh server render the app
 * does on tab-restore, so the assertion reflects server truth. The reload is
 * retried rather than awaited once because a broadcast landing mid-navigation
 * tears it out from under Playwright, and that failure is instant — only
 * another attempt helps. A change that never happens still fails the outer
 * budget.
 */
async function reloadUntil(
  page: Page,
  assertion: () => Promise<void>,
): Promise<void> {
  await expect(async () => {
    await page.reload();
    await assertion();
  }).toPass({ timeout: 20_000 });
}

test("a player joins, leaves and is kicked between rounds", async ({
  signedIn,
}) => {
  // Three browser contexts and a full lobby setup already sit near the default
  // budget, and three passive-client retry loops need room that is genuinely
  // their own rather than whatever the per-test timeout has left.
  test.setTimeout(150_000);

  const { page: host } = await signedIn("host");
  const { page: leader } = await signedIn("p1");
  // The joiner is the persona named Nora — the kick controls below address
  // them by that display name.
  const { page: joiner } = await signedIn("p3");

  const code = await hostGame(host, "Roster Cup");
  const gameId = gameIdOf(host);
  await createAndReadyTeam(host, "Alpha");

  await joinByCode(leader, code);
  await createAndReadyTeam(leader, "Bravo");

  // Start the game but no round: the schedule exists, nothing is live, so
  // every roster is open — the "between rounds" state this test is about.
  const startGame = host.getByRole("button", { name: "Start game" });
  await expect(startGame).toBeEnabled();
  await startGame.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // The joiner arrives by BARE link, so they hold no code and the picker must
  // ask for it inline rather than joining on the first tap.
  await joiner.goto(`/t/${gameId}`);
  await joiner.getByRole("tab", { name: "Join a team" }).click();

  const bravoCard = teamCard(joiner, "Bravo");
  await bravoCard.getByRole("button", { name: "Join" }).click();
  await expect(
    bravoCard.getByText("Enter the game code to join"),
  ).toBeVisible();
  await submitCodeInCard(joiner, bravoCard, code);
  await expect(joiner.getByRole("tab", { name: "My team" })).toBeVisible();

  // The leader took no action, so this is the passive-client hop. The Board
  // tab auto-selects once a game starts, so each attempt has to open the team
  // tab again after its reload.
  await reloadUntil(leader, async () => {
    await leader.getByRole("tab", { name: "My team" }).click();
    await expect(leader.getByText("Nora")).toBeVisible({ timeout: 2_000 });
  });

  // The team room is at its widest with a full roster and the leader's kick
  // controls showing (docs/UI.md).
  await expectNoHorizontalOverflow(leader, "/t/[id] (team room, leader)");
  await expectNoHorizontalOverflow(host, "/t/[id] (board tab with host dock)");

  // Leaving is behind the team room's confirm and lands them back on the
  // picker — they keep their place in the game, they just have no team.
  await joiner.getByRole("button", { name: "Leave team" }).click();
  await joiner
    .getByRole("dialog", { name: "Leave the team?" })
    .getByRole("button", { name: "Leave" })
    .click();
  await expect(joiner.getByRole("tab", { name: "Join a team" })).toBeVisible();

  // Rejoining needs the code again: leaving gave it back up.
  const bravoAgain = teamCard(joiner, "Bravo");
  await bravoAgain.getByRole("button", { name: "Join" }).click();
  await submitCodeInCard(joiner, bravoAgain, code);
  await expect(joiner.getByRole("tab", { name: "My team" })).toBeVisible();

  // The leader kicks them. Their roster entry has to be on screen first, and
  // the leader is still the passive client.
  const kick = leader.getByRole("button", {
    name: "Remove Nora from the team",
  });
  await reloadUntil(leader, async () => {
    await leader.getByRole("tab", { name: "My team" }).click();
    await expect(kick).toBeVisible({ timeout: 2_000 });
  });
  await kick.click();
  await leader
    .getByRole("dialog", { name: "Remove Nora?" })
    .getByRole("button", { name: "Remove", exact: true })
    .click();

  // The roster loses them on the leader's own screen — anchored on the team
  // still rendering, so an unrendered page cannot pass this as "gone".
  await expect(leader.getByText("Bravo")).toBeVisible();
  await expect(leader.getByText("Nora")).toHaveCount(0);

  // And the kicked player is put back on the picker.
  await reloadUntil(joiner, async () => {
    await expect(joiner.getByRole("tab", { name: "Join a team" })).toBeVisible({
      timeout: 2_000,
    });
  });
});

test("the last member leaving after the start forfeits the team without deleting its matches", async ({
  signedIn,
}) => {
  test.setTimeout(120_000);

  const { page: host } = await signedIn("host");
  const { page: solo } = await signedIn("p1");

  const code = await hostGame(host, "Forfeit Cup");
  const gameId = gameIdOf(host);
  await createAndReadyTeam(host, "Alpha");

  // Bravo has exactly one member — the branch a two-member team never reaches.
  await joinByCode(solo, code);
  await createAndReadyTeam(solo, "Bravo");

  const startGame = host.getByRole("button", { name: "Start game" });
  await expect(startGame).toBeEnabled();
  await startGame.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  // The schedule exists and holds foreign keys to Bravo before the departure.
  const bravoId = await teamIdByName(gameId, "Bravo");
  expect(await matchCountForTeam(bravoId)).toBeGreaterThan(0);

  // The start beat auto-selected the Board tab for everyone, so the sole
  // member steps back to their team room to leave it.
  await solo.getByRole("tab", { name: "My team" }).click();
  await solo.getByRole("button", { name: "Leave team" }).click();
  await solo
    .getByRole("dialog", { name: "Leave the team?" })
    .getByRole("button", { name: "Leave" })
    .click();
  await expect(solo.getByRole("tab", { name: "Join a team" })).toBeVisible();

  // The team survives with no members and reads as forfeited in the standings
  // — a derived state, never a stored flag.
  const standings = host
    .getByRole("heading", { name: "Standings" })
    .locator("xpath=./ancestor::section[1]");
  await reloadUntil(host, async () => {
    await expect(
      standings
        .locator("li")
        .filter({ hasText: "Bravo" })
        .getByText("forfeited"),
    ).toBeVisible({ timeout: 2_000 });
  });

  // The assertion this test exists for: Match.teamA/teamB are onDelete:
  // Cascade, so a team wrongly deleted here takes its scheduled matches with
  // it and raises nothing at all.
  expect(await matchCountForTeam(bravoId)).toBeGreaterThan(0);
});

test("the last member leaving before the start deletes the team", async ({
  signedIn,
}) => {
  test.setTimeout(120_000);

  const { page: host } = await signedIn("host");
  const { page: solo } = await signedIn("p1");

  // The host makes no team of their own, so they stay on the picker and can
  // actually see another team come and go.
  const code = await hostGame(host, "Empty Team Cup");

  await joinByCode(solo, code);
  await solo.getByPlaceholder("Team name").fill("Bravo");
  await solo.getByRole("button", { name: "Create team" }).click();
  await expect(solo.getByRole("tab", { name: "My team" })).toBeVisible();

  await reloadUntil(host, async () => {
    await expect(host.getByText("Bravo")).toBeVisible({ timeout: 2_000 });
  });

  await solo.getByRole("button", { name: "Leave team" }).click();
  await solo
    .getByRole("dialog", { name: "Leave the team?" })
    .getByRole("button", { name: "Leave" })
    .click();
  await expect(solo.getByRole("tab", { name: "Join a team" })).toBeVisible();

  // Pre-start the emptied team is deleted outright. The picker's empty-state
  // copy is the positive anchor: it renders only when the game has no teams
  // at all, so a page that failed to render cannot pass this as "gone".
  await reloadUntil(host, async () => {
    await expect(
      host.getByText("No teams yet. Create the first one to get started."),
    ).toBeVisible({ timeout: 2_000 });
    await expect(host.getByText("Bravo")).toHaveCount(0);
  });
});

test("a team in a live match is closed to roster changes", async ({
  signedIn,
}) => {
  test.setTimeout(150_000);

  const { page: host } = await signedIn("host");
  const { page: alpha } = await signedIn("p1");
  const { page: bravo } = await signedIn("p2");
  const { page: joiner } = await signedIn("p3");

  // The host joins no team, so starting the round leaves them on the board
  // with the dock instead of pulling them into a match.
  const code = await hostGame(host, "Lock Cup");
  const gameId = gameIdOf(host);

  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");

  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await expect(host.getByText("Bravo")).toBeVisible();
  const startGame = host.getByRole("button", { name: "Start game" });
  await expect(startGame).toBeEnabled();
  await startGame.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  // Two teams, so round 1 puts both of them in the one live match.
  await host.getByRole("button", { name: "Start round 1" }).click();
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // The joiner holds the code (they joined the game with it) and is on no
  // team, so nothing but the lock itself stands between them and a roster.
  await joinByCode(joiner, code);
  await joiner.getByRole("tab", { name: "Join a team" }).click();

  await expect(joiner.getByText(LOCK_MESSAGE).first()).toBeVisible();
  await expect(
    joiner.getByRole("button", { name: "Join" }).first(),
  ).toBeDisabled();

  await expectNoHorizontalOverflow(
    joiner,
    "/t/[id] (team picker, locked teams)",
  );

  // The disabled button is only the UI face of the rule. The rule itself is
  // server-side, so the assertion that matters is the route refusing the same
  // write — with the CORRECT code, so a 409 can only be the lock.
  const teamId = await teamIdByName(gameId, "Alpha");
  const refused = await joiner.request.post(
    `/api/tournaments/${gameId}/teams/${teamId}/members`,
    { data: { code } },
  );
  expect(refused.status()).toBe(409);
});

test("a signed-in stranger spectates by link, then joins with the code", async ({
  signedIn,
}) => {
  test.setTimeout(180_000);

  const { page: host } = await signedIn("host");
  const { page: alpha } = await signedIn("p1");
  const { page: bravo } = await signedIn("p2");
  const { page: charlie } = await signedIn("p3");
  const { page: stranger } = await signedIn("p4");

  const code = await hostGame(host, "Spectator Cup");
  const gameId = gameIdOf(host);

  // Three teams so round 1 schedules one match and one bye: the bye team is
  // the roster the stranger can still join while a match is live.
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
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // An account that has never touched this game opens the bare link. Before
  // this slice the same request returned 404.
  const response = await stranger.goto(`/t/${gameId}`);
  expect(response?.status()).toBe(200);
  await expect(
    stranger.getByRole("heading", { name: "Standings" }),
  ).toBeVisible();

  // Reading the board never hands over the write credential.
  await expect(stranger.getByTestId("game-code")).toHaveCount(0);

  // The live match is open to them too, through the board's own Spectate link.
  const spectate = stranger.getByRole("link", { name: "Spectate" });
  await expect(spectate).toBeVisible();
  await spectate.click();
  await expect(stranger).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);
  await expect(stranger.getByRole("button", MATCH_SLOT_CARD)).toBeVisible();

  // Back on the game, joining is a write, so the picker asks for the code
  // instead of acting on the tap. Two of the three teams are in the live
  // match; the third has a bye and is the one still open.
  await stranger.goto(`/t/${gameId}`);
  await stranger.getByRole("tab", { name: "Join a team" }).click();
  await expect(stranger.getByText(LOCK_MESSAGE)).toHaveCount(2);

  const joins = stranger.getByRole("button", { name: "Join" });
  await expect(joins).toHaveCount(3);
  let openJoin: Locator | null = null;
  for (let i = 0; i < 3; i += 1) {
    if (await joins.nth(i).isEnabled()) {
      openJoin = joins.nth(i);
      break;
    }
  }
  expect(openJoin).not.toBeNull();
  await openJoin!.click();

  const openCard = stranger
    .locator("div.sticker")
    .filter({ hasText: "Enter the game code to join" });
  await expect(openCard).toHaveCount(1);

  // A wrong code is refused. The shake is a motion animation with no settled
  // DOM signal to assert, so what is pinned is what a user can actually rely
  // on: the route's message, and still being on the picker.
  const wrongCode = code === "ZZZZZZ" ? "YYYYYY" : "ZZZZZZ";
  await submitCodeInCard(stranger, openCard, wrongCode);
  await expect(
    stranger.getByText("That code doesn't match this game"),
  ).toBeVisible();
  await expect(
    stranger.getByRole("tab", { name: "Join a team" }),
  ).toBeVisible();

  // The right one is accepted, so the refusal above was the code and not a
  // broken form.
  await clearCodeInCard(stranger, openCard);
  await submitCodeInCard(stranger, openCard, code);
  await expect(stranger.getByRole("tab", { name: "My team" })).toBeVisible();
});
