import { test, expect } from "@playwright/test";

test("121 Checkout setup hides other options, rejects a bad start and starts a run that survives a refresh", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "121 Checkout", exact: true }).click();
  await expect(page.getByText("STARTING SCORE")).toHaveCount(0);
  await expect(page.getByText("CHECKOUT RULE")).toHaveCount(0);
  await expect(page.getByLabel("Opponent", { exact: true })).toHaveCount(0);
  await page
    .getByRole("group", { name: "START TARGET" })
    .getByRole("button", { name: "Custom", exact: true })
    .click();
  await page.getByLabel("Custom start target").fill("159");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Start target must be" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/new\/?$/);
  await page.getByLabel("Custom start target").fill("40");
  await page
    .getByRole("group", { name: "DARTS PER ATTEMPT" })
    .getByRole("button", { name: "6", exact: true })
    .click();
  await page
    .getByRole("group", { name: "ROUNDS" })
    .getByRole("button", { name: "Infinite", exact: true })
    .click();
  await page.getByLabel("Player 1 name").fill("Ann");
  await page.getByLabel("Player 2 name").fill("Ben");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page).toHaveURL(/\/match\/?$/);
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("checkout-target")).toHaveText("40");
  await expect(page.getByTestId("checkout-remaining")).toHaveText("40");
  await expect(page.getByTestId("checkout-darts-left")).toHaveText("6");
  await expect(page.getByTestId("checkout-attempt")).toHaveText("1");
  await page.reload();
  await expect(page.getByTestId("checkout-target")).toHaveText("40");
  await expect(page.getByTestId("checkout-darts-left")).toHaveText("6");
});

test("custom rounds are validated and shown as an attempt count", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "121 Checkout", exact: true }).click();
  const rounds = page.getByRole("group", { name: "ROUNDS" });
  await rounds.getByRole("button", { name: "Custom", exact: true }).click();
  // The field is capped at two characters, so 0 is the invalid value a person can type.
  await page.getByLabel("Custom rounds").fill("0");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Rounds must be a whole number" }),
  ).toBeVisible();
  await page.getByLabel("Custom rounds").fill("7");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByTestId("checkout-target")).toHaveText("121");
  await expect(page.getByTestId("checkout-darts-left")).toHaveText("9");
  await expect(page.getByTestId("checkout-attempt")).toHaveText("1 of 7");
});

test("switching from DartBot to 121 Checkout restores a normal second player", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByLabel("Player 2 name").fill("");
  await page.getByLabel("Opponent", { exact: true }).selectOption("bot");
  await expect(page.locator("strong", { hasText: "DartBot" })).toBeVisible();
  await page.getByRole("button", { name: "121 Checkout", exact: true }).click();
  await expect(page.getByLabel("Player 2 name")).toHaveValue("Player 2");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Player 1 to throw");
  await expect(page.getByRole("region", { name: "DartBot controls" })).toHaveCount(0);
});

test("121 Checkout can be played solo", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "121 Checkout", exact: true }).click();
  await page.getByRole("button", { name: "Remove player 2", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Remove player/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Player 1 to throw");
});
