/**
 * Question-bank CRUD E2E (graded flow): the allowlisted owner signs in (or
 * signs up on first run) and drives /admin/questions through create, search,
 * edit, and delete; a second test proves a plain player's session is refused
 * by the underlying admin API, not just hidden by the UI.
 */
import { test, expect, type Page } from "@playwright/test";

const OWNER_EMAIL = "owner@test.example.com";
const OWNER_PASSWORD = "password1234";

// Sign in as the allowlisted owner; first run signs the account up (signup
// confirmation is off in the test project, so it lands signed in directly).
async function signInAsOwner(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(OWNER_EMAIL);
  await page.getByPlaceholder("Password").fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();

  const signedIn = page.getByText(`Signed in as ${OWNER_EMAIL}`);
  const loginError = page.getByText("Invalid email or password.");
  await expect(signedIn.or(loginError)).toBeVisible();

  if (await loginError.isVisible().catch(() => false)) {
    await page.goto("/signup");
    await page.getByPlaceholder("Email").fill(OWNER_EMAIL);
    await page
      .getByPlaceholder("Password (8+ characters)")
      .fill(OWNER_PASSWORD);
    await page.getByPlaceholder("Confirm password").fill(OWNER_PASSWORD);
    await page.getByRole("button", { name: "Sign up" }).click();
  }

  await expect(signedIn).toBeVisible();
}

test("admin creates, reads, edits, and deletes a question", async ({
  page,
}) => {
  await signInAsOwner(page);
  await page.goto("/admin/questions");
  await expect(
    page.getByRole("heading", { name: "Question bank" }),
  ).toBeVisible();

  const prompt = `E2E: capital of Fableland ${Date.now()}`;

  // Create.
  await page.getByRole("button", { name: "New question" }).click();
  const createDialog = page.getByRole("dialog");
  await expect(
    createDialog.getByRole("heading", { name: "New question" }),
  ).toBeVisible();
  await createDialog.getByLabel("Prompt").fill(prompt);
  await createDialog.getByLabel("Correct answer").fill("Fable City");
  await createDialog.getByLabel("Wrong answer 1").fill("Dream Town");
  await createDialog.getByLabel("Wrong answer 2").fill("Myth Harbor");
  await createDialog.getByLabel("Wrong answer 3").fill("Story Village");
  await createDialog.getByLabel("Category").fill("Geography");
  await createDialog.getByRole("button", { name: "Save question" }).click();
  await expect(createDialog).toBeHidden();

  // Read (search).
  await page.getByLabel("Search questions").fill(prompt);
  const row = page.locator("li", { hasText: prompt });
  await expect(row).toBeVisible();

  // Update.
  await row.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog");
  await expect(
    editDialog.getByRole("heading", { name: "Edit question" }),
  ).toBeVisible();
  const editedPrompt = `${prompt} (edited)`;
  await editDialog.getByLabel("Prompt").fill(editedPrompt);
  await editDialog.getByRole("button", { name: "Save question" }).click();
  await expect(editDialog).toBeHidden();

  const editedRow = page.locator("li", { hasText: editedPrompt });
  await expect(editedRow).toBeVisible();

  // Delete.
  await editedRow.getByRole("button", { name: "Delete" }).click();
  const deleteDialog = page.getByRole("dialog");
  await expect(
    deleteDialog.getByRole("heading", { name: "Delete question?" }),
  ).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Delete question" }).click();
  await expect(deleteDialog).toBeHidden();

  await page.getByLabel("Search questions").fill(prompt);
  await expect(page.getByText("No questions match.")).toBeVisible();
});

test("a plain player is refused by the questions API", async ({ page }) => {
  const email = `e2e+${Date.now()}@test.example.com`;
  const password = "password1234";

  await page.goto("/signup");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (8+ characters)").fill(password);
  await page.getByPlaceholder("Confirm password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();

  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  const list = await page.request.get("/api/admin/questions");
  expect(list.status()).toBe(403);

  const create = await page.request.post("/api/admin/questions", {
    data: {
      prompt: "x",
      correctAnswer: "y",
      incorrectAnswers: ["a", "b", "c"],
    },
  });
  expect(create.status()).toBe(403);
});
