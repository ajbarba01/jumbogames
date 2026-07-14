/**
 * Smoke test: the app builds, serves, and renders the logged-out home with a
 * login link. Auth flow coverage lives in auth.spec.ts.
 */
import { test, expect } from "@playwright/test";

test("logged-out home renders a login link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
});
