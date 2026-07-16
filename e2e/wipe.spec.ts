/**
 * Slam-wipe transition E2E: a wipe-covered navigation that crosses into the
 * tournament surface must actually play the covering panel, then fully clear
 * it afterward — proving the committed + min-floor interlock resolves rather
 * than trapping the user under a stuck panel. Exercises two independent
 * adopters that both cross into the game surface (host-form's useWipeNav on
 * create, then rejoin-button's on return), asserting the panel's testid
 * across each lifecycle (appears, then detaches) and that the destination is
 * left genuinely interactive, not just painted.
 */
import { test, expect } from "@playwright/test";
import { promoteToAdmin } from "./support/db";

test("a wipe-covered nav into the tournament surface plays, clears, and leaves the destination interactive", async ({
  page,
}) => {
  const email = `e2e-wipe+${Date.now()}@test.example.com`;
  const password = "password1234";

  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill(password);
  await page.getByPlaceholder("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  // Hosting requires admin — a precondition the UI cannot set for itself.
  await promoteToAdmin(email);
  await page.reload();

  await page.getByRole("button", { name: "Create tournament" }).click();
  await page.waitForURL(/\/host$/);
  await page.getByPlaceholder("Tournament name").fill("Wipe E2E Cup");

  // 1. Submitting the host form fires a real useWipeNav() adopter, crossing
  // into the tournament surface. The panel stays attached from navStart
  // through wipeOutDone — a floor of WIPE_DUR.in + minCovered + out (~1.02s)
  // — so the window is guaranteed to exist and needs no manual delay.
  await page.getByRole("button", { name: "Create and host" }).click();
  await expect(page.getByTestId("slam-wipe")).toBeVisible();

  // 2. The navigation lands on the new tournament's lobby.
  await expect(page).toHaveURL(/\/t\/[^/]+$/);

  // 3. The panel clears once the destination has settled — the "never traps
  // the user" claim. The provider unmounts SlamWipe entirely when idle, so
  // assert full detachment, not just non-visibility.
  await expect(page.getByTestId("slam-wipe")).toHaveCount(0);

  // 4. The destination is genuinely interactive, not just painted: the
  // lobby's own controls render and accept input immediately (nothing left
  // inert under a supposedly-cleared panel).
  await expect(page.getByTestId("game-code")).toBeVisible();
  await page.getByPlaceholder("Team name").fill("Wipe Squad");
  await expect(page.getByPlaceholder("Team name")).toHaveValue("Wipe Squad");

  // 5. A second, independent adopter (rejoin-button) drives another wipe
  // navigation back into the same surface, re-exercising the provider's
  // timer/ref hygiene across repeated navigations (the machine ignores
  // navStart unless it is idle).
  await page.goto("/");
  const rejoin = page.getByRole("button", { name: "Rejoin" });
  await expect(rejoin).toBeVisible();
  await rejoin.click();
  await expect(page.getByTestId("slam-wipe")).toBeVisible();
  await expect(page).toHaveURL(/\/t\/[^/]+$/);
  await expect(page.getByTestId("slam-wipe")).toHaveCount(0);
  await expect(page.getByTestId("game-code")).toBeVisible();
});
