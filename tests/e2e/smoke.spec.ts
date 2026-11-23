import { expect, test } from "@playwright/test";

test("landing page explains the path and starts in guest mode", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "hired AI engineer",
  );
  await page.getByRole("link", { name: /Start now/ }).click();
  await expect(page).toHaveURL(/\/learn\/python-basics\/variables-and-types/);
  await expect(
    page.getByRole("heading", { name: "Variables, types and f-strings" }),
  ).toBeVisible();
});

test("roadmap shows every track", async ({ page }) => {
  await page.goto("/roadmap");
  for (const track of [
    "Foundations",
    "Engineering",
    "Backend & Full-stack",
    "AI Engineering",
    "Career",
  ]) {
    await expect(
      page.getByRole("heading", { name: track, exact: true }),
    ).toBeVisible();
  }
});
