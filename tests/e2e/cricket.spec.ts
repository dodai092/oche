import { test, expect } from "@playwright/test";

test("Cricket setup hides x01 options, starts a match and survives a refresh", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Cricket", exact: true }).click();
  await expect(page.getByText("STARTING SCORE")).toHaveCount(0);
  await expect(page.getByText("CHECKOUT RULE")).toHaveCount(0);
  await expect(page.getByLabel("Opponent", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Cut-throat/ }).click();
  await page.getByLabel("Player 1 name").fill("Ann");
  await page.getByLabel("Player 2 name").fill("Ben");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page).toHaveURL(/\/match\/?$/);
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await page.reload();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
});

test("switching from DartBot to Cricket restores a normal second player", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByLabel("Player 2 name").fill("");
  await page.getByLabel("Opponent", { exact: true }).selectOption("bot");
  await expect(page.locator("strong", { hasText: "DartBot" })).toBeVisible();
  await page.getByRole("button", { name: "Cricket", exact: true }).click();
  await expect(page.getByLabel("Player 2 name")).toHaveValue("Player 2");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Player 1 to throw");
  await expect(page.getByRole("region", { name: "DartBot controls" })).toHaveCount(0);
});

test("Cricket needs two players", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Cricket", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Remove player/ }),
  ).toHaveCount(0);
});

import type { Page } from "@playwright/test";

async function startCricket(page: Page, legs = "1") {
  await page.goto("/new");
  await page.getByRole("button", { name: "Cricket", exact: true }).click();
  await page.getByLabel("LEGS TO WIN").selectOption(legs);
  await page.getByLabel("Player 1 name").fill("Ann");
  await page.getByLabel("Player 2 name").fill("Ben");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
}
const hit = (page: Page, n: number) =>
  page.getByRole("button", { name: `Hit ${n}`, exact: true }).click();
const triple = (page: Page) =>
  page.getByRole("button", { name: "Triple", exact: true }).click();
async function tripleAt(page: Page, numbers: number[]) {
  for (const n of numbers) {
    await triple(page);
    await hit(page, n);
  }
}
async function benMisses(page: Page) {
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Miss", exact: true }).click();
}
async function annWinsLeg(page: Page) {
  await tripleAt(page, [20, 19, 18]);
  await benMisses(page);
  await tripleAt(page, [17, 16, 15]);
  await benMisses(page);
  await page.getByRole("button", { name: "Outer bull", exact: true }).click();
  await page.getByRole("button", { name: "Inner bull", exact: true }).click();
}

test("plays a Cricket leg with marks, undo, a mid-turn refresh and a win", async ({
  page,
}) => {
  await startCricket(page);
  await tripleAt(page, [20, 19, 18]);
  await expect(page.getByTestId("active-player")).toHaveText("Ben to throw");
  await expect(
    page.getByTestId("marks-0-20").getByRole("img", { name: "3 marks" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo turn", exact: true }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(
    page.getByTestId("marks-0-20").getByRole("img", { name: "0 marks" }),
  ).toBeVisible();
  await tripleAt(page, [20, 19, 18]);
  await benMisses(page);
  await tripleAt(page, [17]);
  await page.reload();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByRole("status")).toContainText("2 darts left");
  await tripleAt(page, [16, 15]);
  await expect(page.getByTestId("active-player")).toHaveText("Ben to throw");
  await benMisses(page);
  await page.getByRole("button", { name: "Outer bull", exact: true }).click();
  await page.getByRole("button", { name: "Inner bull", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ann wins!" })).toBeVisible();
  await page.getByRole("button", { name: "Undo winning dart" }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await page.getByRole("button", { name: "Inner bull", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ann wins!" })).toBeVisible();
  await page.getByRole("button", { name: /Rematch/ }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("cricket-points-0")).toHaveText("0");
});

test("Cricket points follow Standard rules and undo restores them", async ({
  page,
}) => {
  await startCricket(page);
  await tripleAt(page, [20]);
  await page.getByRole("button", { name: "Hit 20", exact: true }).click();
  await expect(page.getByTestId("cricket-points-0")).toHaveText("20");
  await page.getByRole("button", { name: "Undo dart", exact: true }).click();
  await expect(page.getByTestId("cricket-points-0")).toHaveText("0");
});

test("the multiplier returns to single after every dart", async ({ page }) => {
  await startCricket(page);
  await triple(page);
  await hit(page, 20);
  await expect(page.getByRole("button", { name: "Triple" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("landscape phone keeps the board and the keypad reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await startCricket(page);
  const miss = await page
    .getByRole("button", { name: "Miss", exact: true })
    .boundingBox();
  expect(miss!.y + miss!.height).toBeLessThanOrEqual(390);
  await expect(page.getByTestId("marks-0-20")).toBeInViewport();
  await expect(page.getByTestId("marks-0-25")).toBeInViewport();
});

test("history lists Cricket and x01 together, statistics stay x01 only, backup round-trips", async ({
  page,
}) => {
  await startCricket(page);
  await annWinsLeg(page);
  await expect(page.getByRole("heading", { name: "Ann wins!" })).toBeVisible();
  // One solo single-out 301 match for the x01 side.
  await page.goto("/new");
  await page.getByRole("button", { name: "301", exact: true }).click();
  await page.getByRole("button", { name: "Single out", exact: false }).click();
  await page.getByRole("button", { name: "Remove player 2", exact: true }).click();
  await page.getByLabel("Player 1 name").fill("Antun");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Dart-by-dart", exact: true }).click();
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Hit 20", exact: true }).click();
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: "Hit 20", exact: true }).click();
  await page.getByRole("button", { name: "Single", exact: true }).click();
  await page.getByRole("button", { name: "Hit 1", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Match complete!" })).toBeVisible();

  await page.goto("/history");
  await expect(page.locator(".history-record")).toHaveCount(2);
  await expect(page.getByText("CRICKET / STANDARD")).toBeVisible();
  await expect(page.getByText("Ann wins")).toBeVisible();

  await page.goto("/statistics");
  await expect(page.getByText(/Cricket is not tracked yet/)).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);

  await page.goto("/");
  await expect(page.getByText("LAST MATCH")).toBeVisible();

  await page.goto("/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export/ }).first().click();
  const file = await (await download).path();
  await page.getByLabel("Import Oche backup").setInputFiles(file!);
  await expect(page.getByText(/2 completed matches/)).toBeVisible();
});
