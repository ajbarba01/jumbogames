/**
 * Trivia end-to-end: a game whose pool is trivia alone draws a real trivia
 * round, deals a card to each rostered player, and scores an answer
 * server-side. This is the play surface's only end-to-end coverage — its
 * slice shipped on a hand check alone.
 */
import { test, expect, type Page } from "@playwright/test";
import { pickTriviaPool } from "./support/create";
import {
  dealtTriviaCard,
  profileIdByEmail,
  promoteToAdmin,
  seedTriviaQuestions,
} from "./support/db";
import { createAndReadyTeam, joinByCode, signUp } from "./support/flows";
import { expectNoHorizontalOverflow } from "./support/viewport";

function matchLocationFromUrl(page: Page): {
  tournamentId: string;
  matchId: string;
} {
  const url = new URL(page.url());
  const found = /\/t\/([^/]+)\/m\/([^/]+)$/.exec(url.pathname);
  if (!found) throw new Error(`Expected a match URL, got ${page.url()}`);
  return { tournamentId: found[1], matchId: found[2] };
}

test("a trivia round deals a card and scores an answer", async ({
  browser,
}) => {
  // Three signups, a lobby, a round start and the slot's own countdown put
  // this well past the default per-test budget.
  test.setTimeout(120_000);

  // The bank is what makes the round startable at all: checkContentReady
  // refuses a draw containing trivia while it is empty, and CI's database
  // carries no questions of its own.
  await seedTriviaQuestions();

  const stamp = Date.now();
  const hostEmail = `e2e-trivia-host+${stamp}@test.example.com`;
  const alphaEmail = `e2e-trivia-p1+${stamp}@test.example.com`;
  const bravoEmail = `e2e-trivia-p2+${stamp}@test.example.com`;

  const hostContext = await browser.newContext();
  const alphaContext = await browser.newContext();
  const bravoContext = await browser.newContext();
  const host = await hostContext.newPage();
  const alpha = await alphaContext.newPage();
  const bravo = await bravoContext.newPage();

  await signUp(host, hostEmail, "Ada");
  await promoteToAdmin(hostEmail);
  await host.reload();

  // The host is on no team, so it stays on the board rather than being pulled
  // into a match of its own.
  await host.getByRole("button", { name: "Create a game" }).click();
  await host.waitForURL(/\/create$/);
  await host.getByPlaceholder("Thursday hacknight").fill("Trivia Cup");
  await pickTriviaPool(host);
  await host.getByRole("button", { name: "Create game" }).click();
  await host.waitForURL(/\/t\/[^/]+$/);
  // The destination subtree is inert while covered, so let the panel detach
  // before reading the code out of it.
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);
  const code = (await host.getByTestId("game-code").textContent())?.trim();
  expect(code).toBeTruthy();

  await signUp(alpha, alphaEmail, "Grace");
  await joinByCode(alpha, code as string);
  await createAndReadyTeam(alpha, "Alpha");

  await signUp(bravo, bravoEmail, "Ivy");
  await joinByCode(bravo, code as string);
  await createAndReadyTeam(bravo, "Bravo");

  await expect(host.getByText("Bravo")).toBeVisible();
  const startGame = host.getByRole("button", { name: "Start game" });
  await expect(startGame).toBeEnabled();
  await startGame.click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();

  // A 409 here would mean the bank is empty — the seeding above is what
  // prevents it, so a failure at this step is a fixture failure.
  await host.getByRole("button", { name: "Start round 1" }).click();
  // Only the settled (unmounted) state of the round-transition wipe is
  // asserted: it is a fast transient that can finish before a `toBeVisible()`
  // poll ever catches it.
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // Auto-pull carries both rostered players into their match.
  await expect(alpha).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);
  await expect(bravo).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);

  // Skip the ready gate the way round-start.spec does — it is driven by a
  // zoom-completion callback, awkward to pilot from independent contexts, and
  // no part of what this proves. The host's force-start valve is for exactly
  // this.
  for (const player of [alpha, bravo]) {
    const { tournamentId, matchId } = matchLocationFromUrl(player);
    const origin = new URL(player.url()).origin;
    const res = await hostContext.request.post(
      `${origin}/api/tournaments/${tournamentId}/matches/${matchId}/slots/0/force-start`,
    );
    expect(res.ok()).toBe(true);
  }

  // Playing forces the zoom open (see presentation.ts), so the play surface
  // mounts with no click: the score line is the first thing it renders once a
  // card has been dealt, and its middle dot is the surface's own separator.
  await expect(alpha.getByText("You · 0 pts")).toBeVisible({ timeout: 30_000 });

  // Which card the deal hands a player is seeded per match and drawn from a
  // bank shared with every other spec's leftover rows, so it cannot be
  // predicted — it is read back as server truth instead. Asserting that exact
  // prompt on screen is what proves the dealt card reached the surface.
  const { matchId } = matchLocationFromUrl(alpha);
  const card = await dealtTriviaCard(
    matchId,
    await profileIdByEmail(alphaEmail),
  );
  await expect(alpha.getByText(card.prompt)).toBeVisible();

  // A choice is a kit Button whose label is the answer text. Answering
  // correctly is worth SCORE_CORRECT (+3), applied by the server: the surface
  // reads its own score straight out of the pushed payload
  // (`payload.scores[viewerId]`), never from a local guess, so a moved score
  // proves the whole answer round-trip rather than an optimistic update.
  await alpha
    .getByRole("button", { name: card.correctAnswer, exact: true })
    .click();
  await expect(alpha.getByText("You · 3 pts")).toBeVisible({ timeout: 15_000 });

  // The match surface is played phone in hand.
  await expectNoHorizontalOverflow(alpha, "/t/[id]/m/[matchId] (trivia)");

  await hostContext.close();
  await alphaContext.close();
  await bravoContext.close();
});
