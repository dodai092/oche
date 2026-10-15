import { test, expect, type Page } from "@playwright/test";

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

type RunOptions = {
  start?: string;
  darts?: string;
  /** "10", "infinite" or a custom count such as "2". */
  rounds?: string;
  players?: string[];
};
async function startRun(page: Page, o: RunOptions = {}) {
  await page.goto("/new");
  await page.getByRole("button", { name: "121 Checkout", exact: true }).click();
  if (o.start) {
    await page
      .getByRole("group", { name: "START TARGET" })
      .getByRole("button", { name: "Custom", exact: true })
      .click();
    await page.getByLabel("Custom start target").fill(o.start);
  }
  if (o.darts)
    await page
      .getByRole("group", { name: "DARTS PER ATTEMPT" })
      .getByRole("button", { name: o.darts, exact: true })
      .click();
  const rounds = page.getByRole("group", { name: "ROUNDS" });
  if (o.rounds === "infinite")
    await rounds.getByRole("button", { name: "Infinite", exact: true }).click();
  else if (o.rounds && o.rounds !== "10") {
    await rounds.getByRole("button", { name: "Custom", exact: true }).click();
    await page.getByLabel("Custom rounds").fill(o.rounds);
  }
  const players = o.players ?? ["Ann"];
  await page.getByLabel("Player 1 name").fill(players[0]);
  if (players[1]) await page.getByLabel("Player 2 name").fill(players[1]);
  else
    await page.getByRole("button", { name: "Remove player 2", exact: true }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
}
const hit = (page: Page, n: number) =>
  page.getByRole("button", { name: `Hit ${n}`, exact: true }).click();
const dbl = async (page: Page, n: number) => {
  await page.getByRole("button", { name: "Double", exact: true }).click();
  await hit(page, n);
};
async function misses(page: Page, count: number) {
  for (let i = 0; i < count; i++)
    await page.getByRole("button", { name: "Miss", exact: true }).click();
}

test("clears a target, ends the run, undoes the last dart and rematches", async ({
  page,
}) => {
  await startRun(page, { start: "40", darts: "3", rounds: "1" });
  await expect(page.getByTestId("checkout-attempt")).toHaveText("1 of 1");
  await dbl(page, 20);
  await expect(page.getByRole("heading", { name: "Best checkout 40" })).toBeVisible();
  await page.getByRole("button", { name: "Undo last dart" }).click();
  await expect(page.getByTestId("checkout-target")).toHaveText("40");
  await expect(page.getByTestId("checkout-remaining")).toHaveText("40");
  await dbl(page, 20);
  await expect(page.getByRole("heading", { name: "Best checkout 40" })).toBeVisible();
  await page.getByRole("button", { name: /Rematch/ }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("checkout-target")).toHaveText("40");
  await expect(page.getByTestId("checkout-best")).toHaveText("None");
});

test("a bust keeps the budget burning and a late checkout leaves the safehouse alone", async ({
  page,
}) => {
  await startRun(page, { start: "40", darts: "6", rounds: "infinite" });
  await hit(page, 20);
  await hit(page, 20);
  await expect(page.getByTestId("checkout-remaining")).toHaveText("40");
  await expect(page.getByTestId("checkout-darts-left")).toHaveText("3");
  await expect(page.getByRole("status")).toContainText("Bust");
  await dbl(page, 20);
  await expect(page.getByTestId("checkout-best")).toHaveText("40");
  await expect(page.getByTestId("checkout-target")).toHaveText("41");
  await expect(page.getByTestId("checkout-safehouse")).toHaveText("40");
  await expect(page.getByTestId("checkout-attempt")).toHaveText("2");
  await expect(page.getByRole("status")).toContainText("Cleared 40 in 4 darts");
});

test("a missed attempt falls back, End run closes the run and Resume run reopens it", async ({
  page,
}) => {
  await startRun(page, { start: "40", darts: "3", rounds: "infinite" });
  await dbl(page, 20);
  await expect(page.getByTestId("checkout-target")).toHaveText("41");
  await misses(page, 3);
  // 40 was cleared in one dart, so the safehouse is 40 and a miss on 41 falls back to it.
  await expect(page.getByRole("status")).toContainText("Missed 41. Back to 40.");
  await expect(page.getByTestId("checkout-target")).toHaveText("40");
  await expect(page.getByTestId("checkout-attempt")).toHaveText("3");
  await page.getByRole("button", { name: "End run", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Best checkout 40" })).toBeVisible();
  await page.getByRole("button", { name: "Resume run" }).click();
  await expect(page.getByTestId("checkout-attempt")).toHaveText("3");
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
});

test("two players share one score and a refresh in the middle of a turn keeps it", async ({
  page,
}) => {
  await startRun(page, {
    start: "40",
    darts: "6",
    rounds: "5",
    players: ["Ann", "Ben"],
  });
  await misses(page, 3);
  await expect(page.getByTestId("active-player")).toHaveText("Ben to throw");
  await dbl(page, 20);
  await expect(page.getByTestId("checkout-target")).toHaveText("41");
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await hit(page, 1);
  await expect(page.getByTestId("checkout-remaining")).toHaveText("40");
  await expect(page.getByTestId("checkout-darts-left")).toHaveText("5");
  await page.reload();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("checkout-remaining")).toHaveText("40");
  await expect(page.getByRole("status")).toContainText("1 dart thrown, 2 left");
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Ben to throw");
  await expect(page.getByTestId("checkout-darts-left")).toHaveText("3");
});

test("End turn is disabled before the first dart and the multiplier returns to single", async ({
  page,
}) => {
  await startRun(page, { start: "40", darts: "6" });
  await expect(page.getByRole("button", { name: "End turn", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  await hit(page, 1);
  await expect(page.getByRole("button", { name: "Triple" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("landscape phone keeps the board and the keypad reachable", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await startRun(page, { start: "40", darts: "6" });
  const miss = await page
    .getByRole("button", { name: "Miss", exact: true })
    .boundingBox();
  expect(miss!.y + miss!.height).toBeLessThanOrEqual(390);
  await expect(page.getByTestId("checkout-target")).toBeInViewport();
});
