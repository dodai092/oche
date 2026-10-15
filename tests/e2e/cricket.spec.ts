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
