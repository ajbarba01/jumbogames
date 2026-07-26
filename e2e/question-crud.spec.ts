/**
 * Question-bank CRUD E2E (graded flow): the allowlisted owner drives
 * /admin/questions through create, search, difficulty filter, edit, and
 * delete; a second test proves a plain player's session is refused by the
 * underlying admin API, not just hidden by the UI.
 */
import { test, expect } from "./support/personas";

test("admin creates, reads, edits, and deletes a question", async ({
  signedIn,
}) => {
  const { page } = await signedIn("owner");
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

  // Filter (the only end-to-end proof the difficulty param reaches the
  // database). The created question carries no difficulty, so filtering to a
  // level must drop it from the list, and clearing the filter brings it back.
  // The kit's Select is a Base UI trigger, so it is a combobox, not a button.
  await page.getByRole("combobox", { name: "Filter by difficulty" }).click();
  await page.getByRole("option", { name: "hard" }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("combobox", { name: "Filter by difficulty" }).click();
  await page.getByRole("option", { name: "any difficulty" }).click();
  await expect(row).toBeVisible();

  // Update.
  await row.getByRole("button", { name: `Edit: ${prompt}` }).click();
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
  await editedRow
    .getByRole("button", { name: `Delete: ${editedPrompt}` })
    .click();
  const deleteDialog = page.getByRole("dialog");
  await expect(
    deleteDialog.getByRole("heading", { name: "Delete question?" }),
  ).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Delete question" }).click();
  await expect(deleteDialog).toBeHidden();

  await page.getByLabel("Search questions").fill(prompt);
  await expect(page.getByText(/No questions match/)).toBeVisible();
});

test("a plain player is refused by the questions API", async ({ signedIn }) => {
  const { page } = await signedIn("p1");

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
