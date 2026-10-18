import { test, expect } from "@playwright/test";

test("501 scoring, turn switching, undo and refresh persistence", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Dart-by-dart", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("501");
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  await page.getByRole("button", { name: "Hit 20", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("441");
  await page.reload();
  await expect(page.getByTestId("score-0")).toHaveText("441");
  await page.getByRole("button", { name: "Undo dart", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("501");
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Hit 20", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("321");
  await expect(
    page.getByRole("button", { name: "Single", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("active-player")).toContainText("loser");
  await page.getByRole("button", { name: "Undo turn", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("501");
  await expect(page.getByTestId("active-player")).toContainText("tuna");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("real 501 finish, history, completion undo and local profile creation", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Dart-by-dart", exact: true }).click();
  async function hit(n: number, multiplier: "Single" | "Double" | "Triple") {
    await page.getByRole("button", { name: multiplier, exact: true }).click();
    await page.getByRole("button", { name: `Hit ${n}`, exact: true }).click();
  }
  async function skip() {
    await page.getByRole("button", { name: "End turn", exact: true }).click();
  }
  for (let visit = 0; visit < 2; visit++) {
    for (let d = 0; d < 3; d++) await hit(20, "Triple");
    await skip();
  }
  // 141 remaining: T20 T19 D12.
  await hit(20, "Triple");
  await hit(19, "Triple");
  await hit(12, "Double");
  await expect(
    page.getByRole("heading", { name: "tuna wins!" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "tuna wins!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo winning dart" }).click();
  await expect(page.getByTestId("score-0")).toHaveText("24");
  await hit(12, "Double");
  await page.getByRole("link", { name: "View match history" }).click();
  await expect(page.getByText("tuna wins", { exact: true })).toBeVisible();
  await page.goto("/players");
  await page.getByLabel("Player name").fill("Antun");
  await page.getByRole("button", { name: "Add player", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Antun", exact: true }),
  ).toBeVisible();
});

test("bust restores visit start and undo reopens the visit", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "301", exact: true }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Dart-by-dart", exact: true }).click();
  async function triple(n: number) {
    await page.getByRole("button", { name: "Triple", exact: true }).click();
    await page.getByRole("button", { name: `Hit ${n}`, exact: true }).click();
  }
  for (let d = 0; d < 3; d++) await triple(20);
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  // 121 ->61 ->1 bust, entire visit restores 121.
  await triple(20);
  await triple(20);
  await expect(page.getByTestId("score-0")).toHaveText("121");
  await expect(page.getByRole("status")).toContainText("Bust");
  await page.getByRole("button", { name: "Undo dart", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("61");
});

test("four-player 701 setup, bull controls and narrow scoreboard", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "701", exact: true }).click();
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: "Add another player" }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Dart-by-dart", exact: true }).click();
  for (let i = 0; i < 4; i++)
    await expect(page.getByTestId(`score-${i}`)).toHaveText("701");
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  await page
    .getByRole("button", { name: "OUTER BULL 25", exact: true })
    .click();
  await expect(page.getByTestId("score-0")).toHaveText("676");
  await page.getByRole("button", { name: "BULL 50", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("626");
  await page.getByRole("button", { name: "MISS 0", exact: true }).click();
  await expect(page.getByTestId("active-player")).toContainText("loser");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("single-out solo game advances legs and sets, then completes", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "301", exact: true }).click();
  await page.getByRole("button", { name: "Single out", exact: false }).click();
  await page
    .getByRole("button", { name: "Remove player 2", exact: true })
    .click();
  await page.getByLabel("LEGS TO WIN A SET").selectOption("2");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Dart-by-dart", exact: true }).click();
  for (let leg = 1; leg <= 2; leg++) {
    for (let visit = 0; visit < 1; visit++) {
      await page.getByRole("button", { name: "Triple", exact: true }).click();
      for (let i = 0; i < 3; i++)
        await page.getByRole("button", { name: "Hit 20", exact: true }).click();
    }
    await page.getByRole("button", { name: "Triple", exact: true }).click();
    for (let i = 0; i < 2; i++)
      await page.getByRole("button", { name: "Hit 20", exact: true }).click();
    await page.getByRole("button", { name: "Single", exact: true }).click();
    await page.getByRole("button", { name: "Hit 1", exact: true }).click();
    if (leg === 1) {
      await expect(page.getByTestId("score-0")).toHaveText("301");
      await page.reload();
      await expect(page.getByTestId("score-0")).toHaveText("301");
      await page
        .getByRole("button", { name: "Dart-by-dart", exact: true })
        .click();
    }
  }
  await expect(
    page.getByRole("heading", { name: "Match complete!" }),
  ).toBeVisible();
});

test("statistics groups repeated guest names into one player", async ({ page }) => {
  for (let match = 0; match < 2; match++) {
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
  }
  await page.goto("/statistics");
  await expect(page.locator("#stats-player option")).toHaveCount(2);
  await expect(page.getByRole("columnheader", { name: "Date" })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(2);
});
