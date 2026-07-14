/**
 * Admin authorization E2E: a freshly signed-up user is a plain player (their
 * email is not in OWNER_EMAILS) and must be refused by owner-only admin
 * endpoints. Uses page.request so the authenticated session cookies from the
 * signup flow are sent, proving the backend — not just the UI — enforces it.
 */
import { test, expect } from "@playwright/test";

test("non-owner is refused by the admin users endpoint", async ({ page }) => {
  const email = `e2e+${Date.now()}@test.example.com`;
  const password = "password1234";

  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  const res = await page.request.get("/api/admin/users");
  expect(res.status()).toBe(403);
});
