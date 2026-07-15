/**
 * Smoke test: the app builds, serves, and sends a logged-out visitor into the
 * login flow. Auth flow coverage lives in auth.spec.ts.
 */
import { test, expect } from "@playwright/test";

test("logged-out home sends the visitor to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});
