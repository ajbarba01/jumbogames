/**
 * Auth E2E (graded flow): sign up with a unique email lands authenticated;
 * logout returns to the login link; login with the same credentials
 * re-authenticates. Also covers redirect-away-from-auth-pages when already
 * signed in. Runs against the dedicated test Supabase project.
 */
import { test, expect } from "@playwright/test";

test("signup, logout, and login", async ({ page }) => {
  const email = `e2e+${Date.now()}@test.example.com`;
  const password = "password1234";

  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
});

test("visiting /login while authenticated redirects home", async ({ page }) => {
  const email = `e2e+${Date.now()}@test.example.com`;
  const password = "password1234";

  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  await page.goto("/login");
  await expect(page).toHaveURL("/");
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
});
