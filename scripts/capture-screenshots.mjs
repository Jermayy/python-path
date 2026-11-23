/**
 * Regenerates the README screenshots in docs/screenshots.
 * Usage: npm run build && npm run screenshots
 * Runs against a local production server in guest mode with seeded, realistic progress.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { chromium, devices } from "@playwright/test";

const PORT = 3300;
const BASE = process.env.SCREENSHOT_BASE_URL ?? `http://localhost:${PORT}`;
const OUT = "docs/screenshots";

// Completed exercises: [id, attempts, hintsUsed]. Leaves ps-two-sum unsolved so we can solve it live.
const COMPLETED = [
  ["basics-greeting", 1, 0],
  ["basics-truthiness", 1, 0],
  ["basics-fizzbuzz", 2, 0],
  ["basics-match", 1, 0],
  ["basics-mutable-default", 3, 1],
  ["basics-kwargs", 1, 0],
  ["ds-dedupe", 1, 0],
  ["ds-empty-braces", 1, 0],
  ["ds-group-by", 2, 1],
  ["ds-top-k", 1, 0],
  ["ps-palindrome", 1, 0],
  ["ps-brackets", 2, 0],
  ["ps-longest-unique", 4, 2],
  ["idiom-dataclass-cart", 1, 0],
  ["idiom-parse-config", 2, 0],
];

function seed() {
  const now = new Date();
  const day = (offset) => {
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - offset,
    );
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const exercises = {};
  COMPLETED.forEach(([id, attempts, hintsUsed], i) => {
    const at = new Date(
      now.getTime() - (COMPLETED.length - i) * 3_600_000 * 7,
    ).toISOString();
    exercises[id] = {
      exerciseId: id,
      status: "completed",
      attempts,
      hintsUsed,
      completedAt: at,
      updatedAt: at,
      code: null,
    };
  });
  return { exercises, activityDays: [6, 5, 4, 3, 2, 1].map(day) };
}

async function serverUp() {
  try {
    return (await fetch(`${BASE}/api/health`)).ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await serverUp()) return null;
  const proc = spawn("npx", ["next", "start", "--port", String(PORT)], {
    stdio: "ignore",
  });
  for (let i = 0; i < 60 && !(await serverUp()); i++) await sleep(500);
  if (!(await serverUp()))
    throw new Error("server did not start — run `npm run build` first");
  return proc;
}

async function newPage(browser, contextOptions) {
  const context = await browser.newContext({
    colorScheme: "dark",
    ...contextOptions,
  });
  const state = JSON.stringify(seed());
  await context.addInitScript((s) => {
    try {
      localStorage.setItem("pp:v1:progress:guest", s);
    } catch {}
  }, state);
  return context.newPage();
}

async function shot(page, name, { fullPage = false } = {}) {
  await page.waitForLoadState("networkidle");
  await sleep(600); // let progress animations settle
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  console.log(`  ✓ ${name}.png`);
}

const server = await ensureServer();
const browser = await chromium.launch();
try {
  const desktop = {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.25,
  };
  const page = await newPage(browser, desktop);

  await page.goto(`${BASE}/`);
  await shot(page, "landing");

  await page.goto(`${BASE}/roadmap`);
  await shot(page, "roadmap");

  await page.goto(`${BASE}/dashboard`);
  await shot(page, "dashboard");

  await page.goto(`${BASE}/hiring-bar`);
  await page
    .getByRole("heading", { name: /Competencies/ })
    .scrollIntoViewIfNeeded();
  await shot(page, "hiring-bar");

  // Solve "Two Sum" for real in the in-browser Python runtime.
  await page.goto(`${BASE}/learn/problem-solving/hashing-and-pointers`);
  const card = page.getByRole("article", { name: /Two Sum/ });
  const editor = page.getByRole("textbox", { name: "Code editor for Two Sum" });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText(
    [
      "def two_sum(nums, target):",
      "    index_of = {}",
      "    for j, n in enumerate(nums):",
      "        if target - n in index_of:",
      "            return [index_of[target - n], j]",
      "        index_of[n] = j",
      "    return []",
    ].join("\n"),
  );
  await card.getByRole("button", { name: "Run tests" }).click();
  await card.getByText("All tests passed!").waitFor({ timeout: 60_000 });
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -80));
  await shot(page, "lesson-solved");

  // Mobile lesson view.
  const mobile = await newPage(browser, {
    ...devices["iPhone 15"],
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  await mobile.goto(`${BASE}/learn/python-basics/variables-and-types`);
  await shot(mobile, "mobile-lesson");
  await mobile.goto(`${BASE}/roadmap`);
  await shot(mobile, "mobile-roadmap");
} finally {
  await browser.close();
  server?.kill();
}
