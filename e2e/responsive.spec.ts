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
import { test, expect } from "./support/personas";
import { expectNoHorizontalOverflow } from "./support/viewport";

test("auth surfaces fit the floor width", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "/login");

  await page.goto("/signup");
  await expect(page.getByRole("button", { name: "Sign up" })).toBeVisible();
  await expectNoHorizontalOverflow(page, "/signup");
});

test("home fits the floor width, with a code entered and an error showing", async ({
  signedIn,
}) => {
  // The identity card renders the signed-in address, which has no break
  // opportunity and once pushed the card past the viewport on its own.
  const { page } = await signedIn("p2");
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

  // Exact: home also carries a "Rejoin <game>" button whenever the account is
  // already in a live game, and personas usually are.
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByText("No tournament with that code")).toBeVisible();
  await expectNoHorizontalOverflow(page, "/ (home, rejected code)");
});

test("host and admin surfaces fit the floor width", async ({ signedIn }) => {
  const { page } = await signedIn("owner");
  await expectNoHorizontalOverflow(page, "/ (home, owner)");

  // The owner's three peer links must hold one line once the card reaches its
  // max width, where there is room for them — "Manage permissions" overshot by
  // ~8px and stranded "Question bank" on a line of its own. Below that the row
  // still wraps by design, so this is asserted at a desktop width, not at the
  // floor. Overflow can't see it either way (the row is inside the card), so
  // the check is that they share a baseline.
  await page.setViewportSize({ width: 1280, height: 900 });
  const linkRow = [
    page.getByRole("button", { name: "Log out" }),
    page.getByRole("link", { name: "Manage users" }),
    page.getByRole("link", { name: "Question bank" }),
  ];
  const tops: number[] = [];
  for (const link of linkRow) {
    await expect(link).toBeVisible();
    const box = await link.boundingBox();
    expect(
      box,
      "every home account link must have a layout box",
    ).not.toBeNull();
    tops.push(box!.y);
  }
  expect(
    Math.max(...tops) - Math.min(...tops),
    "home's account links wrap at the card's full width — they must sit on one line there",
  ).toBeLessThan(8);

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
