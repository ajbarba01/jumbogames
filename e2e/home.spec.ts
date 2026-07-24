/**
 * Home surface E2E: a signed-in user edits their display name in place on the
 * identity card (self-only PATCH /api/profile), and the new name persists across
 * a reload. Runs against the dedicated test Supabase project.
 */
import { test, expect } from "@playwright/test";

const PASSWORD = "password1234";

test("edit display name in place from home", async ({ page }) => {
  const email = `e2e-home+${Date.now()}@test.example.com`;

  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Display name").fill("Ada");
  await page.getByPlaceholder("Password (8+ characters)").fill(PASSWORD);
  await page.getByPlaceholder("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  // Read state shows the signup name.
  await expect(page.getByText("Ada")).toBeVisible();

  // Enter edit, change the name, save.
  await page.getByRole("button", { name: "Edit display name" }).click();
  const field = page.getByRole("textbox", { name: "Display name" });

  // The open editor must fit the identity row at any width — it once carried
  // min-width:auto and pushed the role tag outside the card's right edge.
  const rowOverflow = () =>
    field.evaluate((el) => {
      const row = el.closest("form")!.parentElement!;
      return row.scrollWidth - row.clientWidth;
    });
  expect(await rowOverflow()).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 375, height: 800 });
  expect(await rowOverflow()).toBeLessThanOrEqual(0);
  await page.setViewportSize({ width: 1280, height: 720 });

  await field.fill("Grace Hopper");
  await page.getByRole("button", { name: "Save" }).click();

  // Read state returns with the new name, and it survives a reload (persisted).
  await expect(page.getByText("Grace Hopper")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Grace Hopper")).toBeVisible();
});

test("home shows event copy and shakes off a bad code without navigating", async ({
  page,
}) => {
  const email = `e2e-home-copy+${Date.now()}@test.example.com`;

  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Display name").fill("Ada");
  await page.getByPlaceholder("Password (8+ characters)").fill(PASSWORD);
  await page.getByPlaceholder("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  // Event copy is present, shown to everyone (this user is a plain player).
  await expect(
    page.getByRole("heading", { name: "Join an event" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create an event" }),
  ).toBeVisible();

  // A bad code reports inline and does not leave home.
  await page
    .getByRole("group", { name: "Game code" })
    .getByRole("textbox")
    .first()
    .click();
  await page.keyboard.type("ZZZZZZ");
  await page.getByRole("button", { name: "Join" }).click();
  await expect(page.getByText("No tournament with that code")).toBeVisible();
  await expect(page).toHaveURL("/");
});
