/**
 * Smoke test: the app builds, serves, and renders its landing page.
 * Real auth + CRUD flow specs land with their features (see docs/ROADMAP.md).
 */
import { test, expect } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/./);
});
