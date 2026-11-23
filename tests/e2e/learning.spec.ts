import { expect, test, type Page } from "@playwright/test";

async function replaceEditorCode(page: Page, editorName: string, code: string) {
  const editor = page.getByRole("textbox", { name: editorName });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  // insertText avoids editor auto-indent mangling the snippet.
  await page.keyboard.insertText(code);
}

test("solving an exercise awards XP that survives a reload", async ({
  page,
}) => {
  await page.goto("/learn/python-basics/variables-and-types");
  const card = page.getByRole("article", { name: /Format a greeting/ });

  await card.getByRole("button", { name: "Run tests" }).click();
  await expect(card.getByText(/0\/3 tests passed/)).toBeVisible({
    timeout: 45_000,
  });

  await replaceEditorCode(
    page,
    "Code editor for Format a greeting",
    'def greet(name, score):\n    return f"Hi {name}, you scored {score:.1f}%"',
  );
  await card.getByRole("button", { name: "Run tests" }).click();
  await expect(card.getByText("All tests passed!")).toBeVisible();
  await expect(card.getByText("Why this works")).toBeVisible();
  await expect(page.getByText(/solved!/)).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("link", { name: /Level 1, Hello, World: 10 XP/ }),
  ).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("First Steps").first()).toBeVisible();
});

test("an infinite loop is stopped without freezing the page", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/learn/python-basics/control-flow");
  await replaceEditorCode(
    page,
    "Code editor for FizzBuzz, returned not printed",
    "def fizzbuzz(n):\n    while True:\n        pass",
  );
  const card = page.getByRole("article", { name: /FizzBuzz/ });
  // Warm the runtime with a quick run first so the timeout measures user code, not loading.
  await card.getByRole("button", { name: "Run tests" }).click();
  await expect(card.getByRole("alert")).toContainText("infinite loop", {
    timeout: 60_000,
  });
  await expect(card.getByRole("button", { name: "Run tests" })).toBeEnabled();
});

test("quiz gives feedback and explanation", async ({ page }) => {
  await page.goto("/learn/python-basics/variables-and-types");
  const quiz = page.getByRole("article", { name: /Truthiness check/ });
  await quiz.getByLabel("None").check();
  await quiz.getByRole("button", { name: "Check answer" }).click();
  await expect(quiz.getByText(/Not quite/)).toBeVisible();
  await expect(quiz.getByText(/non-empty string/)).toBeVisible();
});

test("hints are revealed one at a time", async ({ page }) => {
  await page.goto("/learn/data-structures/lists-dicts-sets");
  const card = page.getByRole("article", { name: /Dedupe, keep order/ });
  await card.getByRole("button", { name: /Hint 0\/2/ }).click();
  await expect(card.getByText("Hint 1:", { exact: false })).toBeAttached();
  await expect(card.getByRole("button", { name: /Hint 1\/2/ })).toBeVisible();
});

test("AI tutor asks guests to sign in or explains it's disabled", async ({
  page,
}) => {
  await page.goto("/learn/python-basics/functions");
  const card = page.getByRole("article", { name: /Fix the mutable default/ });
  await card.getByRole("button", { name: "Ask the tutor" }).click();
  await expect(
    card.getByRole("complementary", { name: "AI tutor" }),
  ).toContainText(/Sign in|isn't enabled/);
});
