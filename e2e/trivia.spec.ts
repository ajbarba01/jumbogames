/**
 * Trivia end-to-end: a game whose pool is trivia alone draws a real trivia
 * round, deals a card to each rostered player, and scores an answer
 * server-side. This is the play surface's only end-to-end coverage — its
 * slice shipped on a hand check alone.
 */
import { pickTriviaPool } from "./support/create";
import { correctAnswerForPrompt, seedTriviaQuestions } from "./support/db";
import {
  createAndReadyTeam,
  joinByCode,
  readyUpThroughGate,
} from "./support/flows";
import { test, expect } from "./support/personas";
import { expectNoHorizontalOverflow } from "./support/viewport";

test("a trivia round deals a card and scores an answer", async ({
  signedIn,
}) => {
  // Three browser contexts, a lobby, a round start and the slot's own
  // countdown put this well past the default per-test budget.
  test.setTimeout(120_000);

  // The bank is what makes the round startable at all: checkContentReady
  // refuses a draw containing trivia while it is empty, and CI's database
  // carries no questions of its own.
  await seedTriviaQuestions();

  const { page: host } = await signedIn("admin");
  const { page: alpha } = await signedIn("p1");
  const { page: bravo } = await signedIn("p2");

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

  await joinByCode(alpha, code as string);
  await createAndReadyTeam(alpha, "Alpha");

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

  await readyUpThroughGate([alpha, bravo]);

  // Playing forces the zoom open (see presentation.ts), so the play surface
  // mounts with no click: the score line is the first thing it renders once a
  // card has been dealt, and its middle dot is the surface's own separator.
  await expect(alpha.getByText("You · 0 pts")).toBeVisible({ timeout: 30_000 });

  // Which card the deal hands a player is seeded per match and drawn from a
  // bank shared with every other spec's leftover rows, so it cannot be
  // predicted. The prompt on screen is what the deal produced, and the bank is
  // the same server truth it drew from — so the card is identified from the
  // surface and its answer looked up, rather than read out of the slot payload,
  // which the Durable Object does not archive until the slot is done.
  const promptOnScreen = alpha.getByTestId("trivia-prompt");
  await expect(promptOnScreen).toBeVisible();
  const prompt = (await promptOnScreen.textContent())?.trim();
  expect(prompt).toBeTruthy();
  const correctAnswer = await correctAnswerForPrompt(prompt as string);

  // A choice is a kit Button whose label is the answer text. Answering
  // correctly is worth SCORE_CORRECT (+3), applied by the server: the surface
  // reads its own score straight out of the pushed payload
  // (`payload.scores[viewerId]`), never from a local guess, so a moved score
  // proves the whole answer round-trip rather than an optimistic update.
  await alpha.getByRole("button", { name: correctAnswer, exact: true }).click();
  await expect(alpha.getByText("You · 3 pts")).toBeVisible({ timeout: 15_000 });

  // The match surface is played phone in hand.
  await expectNoHorizontalOverflow(alpha, "/t/[id]/m/[matchId] (trivia)");
});
