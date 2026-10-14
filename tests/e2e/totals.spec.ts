import { test, expect } from "@playwright/test";
test("type a visit, submit with Enter, undo and refresh", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", {name:"Use keyboard",exact:true}).click();
  await page.getByLabel("Visit score", { exact: true }).fill("100");
  await page.getByLabel("Visit score", { exact: true }).press("Enter");
  await expect(page.getByTestId("score-0")).toHaveText("401");
  await expect(page.getByTestId("active-player")).toContainText("Player 2");
  await page.reload();
  await expect(page.getByTestId("score-0")).toHaveText("401");
  await page.getByRole("button", { name: "Undo score", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("501");
  await page.getByRole("button", {name:"Use keypad",exact:true}).click();
  await page.getByRole("button", { name: "Digit 1", exact: true }).click();
  await page.getByRole("button", { name: "Digit 8", exact: true }).click();
  await page.getByRole("button", { name: "Digit 0", exact: true }).click();
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("321");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("reject impossible totals and confirm a typed double-out finish", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "301", exact: true }).click();
  await page.getByRole("button", { name: "Remove player 2" }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", {name:"Use keyboard",exact:true}).click();
  async function submit(value: string) {
    await page.getByLabel("Visit score", { exact: true }).fill(value);
    await page
      .getByRole("button", { name: "Submit score", exact: true })
      .click();
  }
  await submit("179");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "not possible",
  );
  await expect(page.getByTestId("score-0")).toHaveText("301");
  await submit("180");
  await expect(page.getByTestId("score-0")).toHaveText("121");
  await submit("120");
  await expect(page.getByRole("status")).toContainText("Bust");
  await expect(page.getByTestId("score-0")).toHaveText("121");
  await submit("121");
  await expect(
    page.getByRole("heading", { name: "Confirm your finish" }),
  ).toBeVisible();
  await expect(page.getByTestId("score-0")).toHaveText("121");
  await page
    .getByRole("button", { name: "Confirm double-out", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Player 1 wins!" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Player 1 wins!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo winning score" }).click();
  await expect(page.getByTestId("score-0")).toHaveText("121");
});
