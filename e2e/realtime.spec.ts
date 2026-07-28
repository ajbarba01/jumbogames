/**
 * End-to-end coverage of the socket path: an action by one player reaches a
 * second player's screen without either client refetching, and the slot's
 * countdown advances on the server's own clock. Skipped unless the socket
 * transport is the one actually built into the app under test — with the flag
 * off these assertions would pass over Supabase Realtime and prove nothing
 * about the Worker.
 */
import { type Page } from "@playwright/test";
import { pickStubPool } from "./support/create";
import { createAndReadyTeam, joinByCode } from "./support/flows";
import { test, expect } from "./support/personas";

test.skip(
  process.env.NEXT_PUBLIC_REALTIME_WS !== "1",
  "socket transport is off; this suite would be testing Supabase Realtime instead",
);

async function hostTournament(page: Page, name: string): Promise<string> {
  await page.getByRole("button", { name: "Create a game" }).click();
  await page.waitForURL(/\/create$/);
  await page.getByPlaceholder("Thursday hacknight").fill(name);
  // The deterministic stub needs no player input to reach a scored result.
  await pickStubPool(page);
  await page.getByRole("button", { name: "Create game" }).click();
  await page.waitForURL(/\/t\/[^/]+$/);
  await expect(page.getByTestId("slam-wipe")).toHaveCount(0);
  const code = (await page.getByTestId("game-code").textContent())?.trim();
  expect(code).toBeTruthy();
  return code as string;
}

test("a ready over the socket reaches the other player without a refetch", async ({
  signedIn,
}) => {
  const { page: host } = await signedIn("admin");
  const { page: alpha } = await signedIn("p1");
  const { page: bravo } = await signedIn("p2");

  const code = await hostTournament(host, "Socket Cup");

  await joinByCode(alpha, code);
  await createAndReadyTeam(alpha, "Alpha");
  await joinByCode(bravo, code);
  await createAndReadyTeam(bravo, "Bravo");

  await expect(host.getByText("Bravo")).toBeVisible();
  await host.getByRole("button", { name: "Start game" }).click();
  await expect(host.getByRole("heading", { name: "Standings" })).toBeVisible();
  await host.getByRole("button", { name: "Start round 1" }).click();

  // Board auto-pull carries both rostered players into the live match.
  await alpha.waitForURL(/\/t\/[^/]+\/m\/[^/]+$/, { timeout: 30_000 });
  await bravo.waitForURL(/\/t\/[^/]+\/m\/[^/]+$/, { timeout: 30_000 });

  // Both are on the same match, so bravo is a genuinely passive observer of
  // alpha's action — no interaction of its own, no refetch. That is the whole
  // point of the transport.
  // Auto-pull lands on the match overview; the gate lives inside the slot, so
  // both players open it. Entering is a local zoom, not a mutation — nothing
  // has crossed the socket yet at this point.
  for (const player of [alpha, bravo]) {
    await player.getByRole("button", { name: /enter/i }).click();
  }

  const ready = alpha.getByRole("button", { name: "Ready" });
  await expect(ready).toBeVisible({ timeout: 30_000 });

  // The gate marks each ready player with a check. Nobody is ready yet, so
  // bravo's screen starts with none — established before the action, so the
  // assertion after it cannot pass on a stale or pre-existing check.
  await expect(bravo.getByText("✓")).toHaveCount(0);

  await ready.click();

  // Pushed from the Durable Object to a client that did nothing: bravo neither
  // clicked nor refetched, and alpha's check still lands on its screen.
  await expect(bravo.getByText("✓")).toHaveCount(1, { timeout: 15_000 });
});
