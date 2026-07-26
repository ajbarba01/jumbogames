/**
 * Open-hosting E2E: a plain player — never promoted to admin — creates a game,
 * lands in its lobby with a shareable code, and holds host powers over it.
 * This is the M7 behaviour that did not exist before Slice 2: creation used to
 * require the admin role. Also covers the admin rescue path: an admin who did
 * not create the game still sees and can use host controls on it, matching
 * what the API already allows via isGameHost.
 */
import { pickStubPool } from "./support/create";
import { test, expect } from "./support/personas";
import { expectNoHorizontalOverflow } from "./support/viewport";

test("a player creates a game and lands in its lobby with a code", async ({
  signedIn,
}) => {
  // The host persona holds the plain player role, which is the whole point
  // here — hosting followed the creator, not a promotion.
  const { page } = await signedIn("host");

  await page.getByRole("button", { name: "Create a game" }).click();
  await page.waitForURL(/\/create$/);

  // The pool picker offers every registered, environment-eligible kind; under
  // JUMBO_TEST_MINIGAME_POOL that is all of them, so nothing arrives selected
  // and the spec picks its own. The stub's registry title is "Button Masher"
  // (see src/lib/minigames/stub/server.ts), not "Stub" — the helper matches
  // against that.
  await pickStubPool(page);
  await expectNoHorizontalOverflow(page, "/create");

  await page.getByPlaceholder("Thursday hacknight").fill("Player's Game");
  await page.getByRole("button", { name: "Create game" }).click();

  await page.waitForURL(/\/t\/[^/]+$/);
  // The destination subtree is inert until the wipe detaches; wait it out
  // before reading, exactly as lobby.spec does.
  await expect(page.getByTestId("slam-wipe")).toHaveCount(0);

  const code = (await page.getByTestId("game-code").textContent())?.trim();
  expect(code).toMatch(/^[A-Z0-9]{4,8}$/);
  await expectNoHorizontalOverflow(page, "/t/[id] (lobby, creator)");

  // Host powers followed the creator, not a role: the creator can act on the
  // game a plain player has no standing over.
  await page.getByPlaceholder("Team name").fill("Solo");
  await page.getByRole("button", { name: "Create team" }).click();
  await expect(page.getByText("Solo")).toBeVisible();
});

test("the create form rejects a game with no name", async ({ signedIn }) => {
  const { page } = await signedIn("host");

  await page.goto("/create");
  // Deliberately no pickStubPool here: submitting the untouched form is the
  // point, and with nothing auto-selected it now fails on both fields.
  await page.getByRole("button", { name: "Create game" }).click();
  await expect(page.getByText("Required")).toBeVisible();
  await expect(page.getByText("Pick at least one minigame.")).toBeVisible();
  await expect(page).toHaveURL(/\/create$/);
});

test("a non-creator admin sees and can use host controls, as a rescue path", async ({
  signedIn,
}) => {
  const { page: creator } = await signedIn("host");
  const { page: admin } = await signedIn("admin");

  // The creator is a plain player — this is the M7 open-hosting path, not the
  // admin one — and creates a team so there is a host control to act on.
  await creator.getByRole("button", { name: "Create a game" }).click();
  await creator.waitForURL(/\/create$/);
  await creator.getByPlaceholder("Thursday hacknight").fill("Rescue Cup");
  await pickStubPool(creator);
  await creator.getByRole("button", { name: "Create game" }).click();
  await creator.waitForURL(/\/t\/[^/]+$/);
  await expect(creator.getByTestId("slam-wipe")).toHaveCount(0);

  const tournamentUrl = creator.url();

  await creator.getByPlaceholder("Team name").fill("Solo");
  await creator.getByRole("button", { name: "Create team" }).click();
  await expect(creator.getByText("Solo")).toBeVisible();

  // The admin never joins by code or a team — they open the game by link,
  // which is exactly the scenario isGameHost's rescue path exists for: staff
  // stepping in on a game they did not create.
  await admin.goto(tournamentUrl);

  // Host controls now live in the floating dock rather than a headed card, so
  // the dock's own lobby control is what proves the rescue path is open to
  // them; the per-team Remove below is the one they actually exercise.
  await expect(
    admin.getByRole("button", { name: "Start anyway" }),
  ).toBeVisible();
  const removeButton = admin.getByRole("button", { name: "Remove" });
  await expect(removeButton).toBeVisible();
  await removeButton.click();
  await admin
    .getByRole("dialog", { name: "Remove team?" })
    .getByRole("button", { name: "Remove team" })
    .click();
  await expect(admin.getByText("Solo")).toHaveCount(0);

  // The removal is a real server mutation, not just a client-side toggle: the
  // creator's own view loses the team too once it refetches.
  await creator.reload();
  await expect(creator.getByText("Solo")).toHaveCount(0);
});
