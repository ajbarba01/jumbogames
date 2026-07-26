/**
 * Floor-width sweep E2E: every non-game route renders at 375px without the
 * page scrolling sideways (docs/UI.md, fluid law). Players join by phone at a
 * hacknight, so the join path in particular has to hold. The game surfaces
 * (lobby, board with the host dock, team picker and team room, match) are
 * guarded inside the specs that already build a game in the right phase, since
 * the setup is theirs — lobby.spec, round-start.spec and team-room.spec; the
 * dev-only `/showcase` cannot be guarded here at all (see the note at the foot
 * of this file).
 */
import { test, expect, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./support/viewport";

const PASSWORD = "password1234";
const OWNER_EMAIL = "owner@test.example.com";

async function signUp(page: Page, email: string): Promise<void> {
  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Display name").fill("Ada Lovelace");
  await page.getByPlaceholder("Password (8+ characters)").fill(PASSWORD);
  await page.getByPlaceholder("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
}

// Mirrors question-crud.spec: the allowlisted owner signs in, or signs up on
// the first run against a fresh test project.
async function signInAsOwner(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(OWNER_EMAIL);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();

  const signedIn = page.getByText(`Signed in as ${OWNER_EMAIL}`);
  const loginError = page.getByText("Invalid email or password.");
  await expect(signedIn.or(loginError)).toBeVisible();

  if (await loginError.isVisible().catch(() => false)) {
    await page.goto("/signup");
    await page.getByPlaceholder("Email").fill(OWNER_EMAIL);
    await page.getByPlaceholder("Display name").fill("Owner");
    await page.getByPlaceholder("Password (8+ characters)").fill(PASSWORD);
    await page.getByPlaceholder("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign up" }).click();
  }

  await expect(signedIn).toBeVisible();
}

test("auth surfaces fit the floor width", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "/login");

  await page.goto("/signup");
  await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "/signup");
});

test("home fits the floor width, with a code entered and an error showing", async ({
  page,
}) => {
  // A long address is the worst case for the identity card: it has no break
  // opportunity and once pushed the card past the viewport on its own.
  const email = `e2e-floor-home+${Date.now()}@test.example.com`;
  await signUp(page, email);
  await expectNoHorizontalOverflow(page, "/ (home, empty code)");

  // The filled and rejected states are what a player actually sees while
  // joining — the code row is the widest thing on the page in both.
  await page
    .getByRole("group", { name: "Game code" })
    .getByRole("textbox")
    .first()
    .click();
  await page.keyboard.type("ZZZZZZ");
  await expectNoHorizontalOverflow(page, "/ (home, code filled)");

  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByText("No tournament with that code")).toBeVisible();
  await expectNoHorizontalOverflow(page, "/ (home, rejected code)");
});

test("host and admin surfaces fit the floor width", async ({ page }) => {
  await signInAsOwner(page);
  await expectNoHorizontalOverflow(page, "/ (home, owner)");

  await page.goto("/create");
  await expect(page.getByPlaceholder("Thursday hacknight")).toBeVisible();
  await expectNoHorizontalOverflow(page, "/create");

  await page.goto("/admin/permissions");
  await expect(
    page.getByRole("heading", { name: "Permissions" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "/admin/permissions");

  await page.goto("/admin/questions");
  await expect(
    page.getByRole("heading", { name: "Question bank" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "/admin/questions");
});

// `/showcase` is deliberately absent from this sweep: the route calls
// notFound() under NODE_ENV=production, and this suite runs against a
// production build, so it cannot be reached here. Its specimen rows were made
// to scroll inside their own section (rather than move the page) and verified
// at the floor against a dev server by hand.
