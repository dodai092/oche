import { test, expect } from "@playwright/test";

test("Around the Clock setup hides x01 options, starts a match and survives a refresh", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await expect(page.getByText("STARTING SCORE")).toHaveCount(0);
  await expect(page.getByText("CHECKOUT RULE")).toHaveCount(0);
  await expect(page.getByLabel("Opponent", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Treble", exact: true }).click();
  await page.getByRole("button", { name: "Two", exact: true }).click();
  await page.getByRole("button", { name: "High to low", exact: true }).click();
  await page.getByLabel("Increase by segment").check();
  await page.getByLabel("Player 1 name").fill("Ann");
  await page.getByLabel("Player 2 name").fill("Ben");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page).toHaveURL(/\/match\/?$/);
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("20");
  await page.reload();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("20");
});

test("a random order is the same after a refresh", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await page.getByRole("button", { name: "Random", exact: true }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  const sequence = page.getByRole("list", { name: "Sequence" });
  const before = await sequence.innerText();
  expect(before.split("\n")).toHaveLength(21);
  await page.reload();
  await expect.poll(() => sequence.innerText()).toBe(before);
});

test("switching from DartBot to Around the Clock restores a normal second player", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByLabel("Player 2 name").fill("");
  await page.getByLabel("Opponent", { exact: true }).selectOption("bot");
  await expect(page.locator("strong", { hasText: "DartBot" })).toBeVisible();
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await expect(page.getByLabel("Player 2 name")).toHaveValue("Player 2");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Player 1 to throw");
  await expect(page.getByRole("region", { name: "DartBot controls" })).toHaveCount(0);
});

test("Around the Clock can be played solo", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await page.getByRole("button", { name: "Remove player 2", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Remove player/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Player 1 to throw");
});

import type { Page } from "@playwright/test";

async function startAtc(page: Page, legs = "1") {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await page.getByLabel("LEGS TO WIN").selectOption(legs);
  await page.getByLabel("Player 1 name").fill("Ann");
  await page.getByLabel("Player 2 name").fill("Ben");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
}
const hit = (page: Page, n: number) =>
  page.getByRole("button", { name: `Hit ${n}`, exact: true }).click();
async function hits(page: Page, numbers: number[]) {
  for (const n of numbers) await hit(page, n);
}
async function benMisses(page: Page) {
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Miss", exact: true }).click();
}
async function annWinsLeg(page: Page) {
  for (let from = 1; from <= 16; from += 3) {
    await hits(page, [from, from + 1, from + 2]);
    await benMisses(page);
  }
  await hits(page, [19, 20]);
  await page.getByRole("button", { name: "Inner bull", exact: true }).click();
}

test("plays a race with undo, a mid-turn refresh and a win", async ({ page }) => {
  await startAtc(page);
  await hits(page, [1, 2, 3]);
  await expect(page.getByTestId("active-player")).toHaveText("Ben to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("4");
  await page.getByRole("button", { name: "Undo turn", exact: true }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("1");
  await hits(page, [1, 2]);
  await page.reload();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("3");
  await expect(page.getByRole("status")).toContainText("1 dart left");
  await hit(page, 3);
  await benMisses(page);
  for (let from = 4; from <= 16; from += 3) {
    await hits(page, [from, from + 1, from + 2]);
    await benMisses(page);
  }
  await hits(page, [19, 20]);
  await page.getByRole("button", { name: "Inner bull", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ann wins!" })).toBeVisible();
  await page.getByRole("button", { name: "Undo winning dart" }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("Bullseye");
  await page.getByRole("button", { name: "Inner bull", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ann wins!" })).toBeVisible();
  await page.getByRole("button", { name: /Rematch/ }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("1");
});

test("the target field and the order settings change what counts", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await page.getByRole("button", { name: "Double", exact: true }).click();
  await page.getByRole("button", { name: "High to low", exact: true }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByTestId("atc-target-0")).toHaveText("20");
  await hit(page, 20);
  await expect(page.getByTestId("atc-target-0")).toHaveText("20");
  await page.getByRole("button", { name: "Double", exact: true }).click();
  await hit(page, 20);
  await expect(page.getByTestId("atc-target-0")).toHaveText("19");
});

test("increase by segment moves a treble three numbers on", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await page.getByLabel("Increase by segment").check();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  await hit(page, 1);
  await expect(page.getByTestId("atc-target-0")).toHaveText("4");
});

test("the multiplier returns to single after every dart", async ({ page }) => {
  await startAtc(page);
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  await hit(page, 1);
  await expect(page.getByRole("button", { name: "Triple" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("landscape phone keeps the board and the keypad reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await startAtc(page);
  const miss = await page
    .getByRole("button", { name: "Miss", exact: true })
    .boundingBox();
  expect(miss!.y + miss!.height).toBeLessThanOrEqual(390);
  await expect(page.getByTestId("atc-target-0")).toBeInViewport();
});
