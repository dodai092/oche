import { test, expect } from "@playwright/test";

test("statistics periods filter by month and show a win and loss record for one player", async ({
  page,
}) => {
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

  await page.goto("/statistics");
  await page.locator("#stats-player").selectOption({ label: "Antun" });
  await expect(page.getByRole("img", { name: "1 win, 0 losses" })).toBeVisible();

  await page.getByRole("group", { name: "Period" }).getByRole("button", { name: "Month" }).click();
  await expect(page.getByRole("button", { name: "Next period" })).toBeDisabled();
  await page.getByRole("button", { name: "Previous period" }).click();
  await expect(page.getByText("Nothing in this period.")).toBeVisible();
  await expect(page.getByRole("img", { name: /\d+ wins?, \d+ loss/ })).toHaveCount(0);

  await page.getByRole("group", { name: "Period" }).getByRole("button", { name: "All time" }).click();
  await expect(page.getByRole("img", { name: "1 win, 0 losses" })).toBeVisible();
});
