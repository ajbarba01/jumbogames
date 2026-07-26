/**
 * Admin authorization E2E: a plain player (their email is not in OWNER_EMAILS)
 * must be refused by owner-only admin endpoints. Uses page.request so the
 * persona's authenticated session cookies are sent, proving the backend — not
 * just the UI — enforces it.
 */
import { test, expect } from "./support/personas";

test("non-owner is refused by the admin users endpoint", async ({
  signedIn,
}) => {
  const { page } = await signedIn("p1");

  const res = await page.request.get("/api/admin/users");
  expect(res.status()).toBe(403);
});
