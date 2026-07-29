/**
 * Word Lock end-to-end: a game whose pool is Word Lock alone draws a real
 * round, both players clear the ready gate, and the shared board mounts with
 * every tile the side length promises. Word Lock needs no seeded content —
 * unlike trivia's question bank, its board is generated per match — so this
 * spec has no fixture setup at all. Capture correctness (which words score,
 * how refresh and lockout behave) is exhaustively covered by the engine's own
 * unit tests; this spec's only job is proving the play surface is reachable
 * and live through the real stack.
 */
import { pickWordLockPool } from "./support/create";
import {
  createAndReadyTeam,
  joinByCode,
  readyUpThroughGate,
} from "./support/flows";
import { test, expect } from "./support/personas";
import { expectNoHorizontalOverflow } from "./support/viewport";

test("a Word Lock round mounts a live, interactive shared board", async ({
  signedIn,
}) => {
  // Three browser contexts, a lobby, a round start and the slot's own
  // countdown put this well past the default per-test budget, exactly as in
  // trivia.spec.ts.
  test.setTimeout(120_000);

  const { page: host } = await signedIn("admin");
  const { page: alpha } = await signedIn("p1");
  const { page: bravo } = await signedIn("p2");

  // The host is on no team, so it stays on the board rather than being pulled
  // into a match of its own.
  await host.getByRole("button", { name: "Create a game" }).click();
  await host.waitForURL(/\/create$/);
  await host.getByPlaceholder("Thursday hacknight").fill("Word Lock Cup");
  await pickWordLockPool(host);
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

  await host.getByRole("button", { name: "Start round 1" }).click();
  // Only the settled (unmounted) state of the round-transition wipe is
  // asserted: it is a fast transient that can finish before a `toBeVisible()`
  // poll ever catches it.
  await expect(host.getByTestId("slam-wipe")).toHaveCount(0);

  // Auto-pull carries both rostered players into their match.
  await expect(alpha).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);
  await expect(bravo).toHaveURL(/\/t\/[^/]+\/m\/[^/]+$/);

  await readyUpThroughGate([alpha, bravo]);

  // The board is one SVG whose tile rects each own a letter; the letter's
  // <text> paints in a separate pass on top of the tiles (see Grid.tsx), so
  // counting rects rather than text nodes cannot be thrown off by a captured
  // tile's chain or refresh bar sharing the same layer. A tile's own fill rect
  // is always the first child painted into its group — the refresh bar (when
  // present) and the tile's outline paint after it into the same group, and
  // every other group on the board (a word's chain, the in-progress trace)
  // opens with a polyline or text node, never a rect — so this selector counts
  // exactly the tiles and nothing painted on top of them, independent of team
  // colour, ownership state, or styling.
  const tiles = alpha.locator("svg g > rect:first-child");
  // A 1v1 match (two rostered players total) yields the tuning's floor side
  // of 10 — clamp(round(sqrt(25 * 2)), 10, 24) — so 100 tiles.
  const side = 10;
  await expect(tiles).toHaveCount(side * side, { timeout: 30_000 });

  // Every tile carries its own letter glyph, painted after the tiles and
  // every chain (see Grid.tsx's pass ordering), so this count is independent
  // of how many words have been captured.
  await expect(alpha.locator("svg text")).toHaveCount(side * side);

  // The share bar is the one widget that says who holds more ground; it sits
  // directly above the board and is visible for every viewer, spectator or
  // player, from the moment the board mounts.
  await expect(alpha.getByTestId("wordlock-share-bar")).toBeVisible();

  // The match surface is played phone in hand.
  await expectNoHorizontalOverflow(alpha, "/t/[id]/m/[matchId] (wordlock)");
});
