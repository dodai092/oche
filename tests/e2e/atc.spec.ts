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
