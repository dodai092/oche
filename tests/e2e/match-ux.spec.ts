import { test, expect } from "@playwright/test";
import { enterTotal } from "./helpers";

test("mobile scoring stays in view, uses one keyboard and remembers the entry mode", async ({
  page,
  isMobile,
}) => {
  if (!isMobile) test.skip();
  await page.goto("/new");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).toBeHidden();
  const score = page.getByLabel("Visit score", { exact: true });
  await expect(score).toHaveAttribute("readonly", "");
  await expect(score).toHaveAttribute("inputmode", "none");
  for (const target of [
    page.getByTestId("score-0"),
    page.getByRole("button", { name: "Submit score", exact: true }),
    page.getByRole("button", { name: "Digit 0", exact: true }),
    page.getByRole("button", { name: "Undo score", exact: true }),
  ]) {
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  }
  await expect(
    page.getByRole("button", { name: "Use keyboard", exact: true }),
  ).toBeHidden();
  await expect(page.getByText("Visit details")).toBeVisible();
  for (const digit of "100") {
    await page.getByRole("button", { name: `Digit ${digit}`, exact: true }).click();
  }
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("401");
  await enterTotal(page, "60");
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await expect(page.getByTestId("score-1")).toHaveText("441");
  await expect(page.getByTestId("active-player")).toContainText("tuna");
  await page.getByRole("button", { name: "Dart-by-dart", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Triple", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "More match details", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Recent visits"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close match details", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("rematch reuses players and settings, and undo restores a bust visibly", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "301", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove player 2", exact: true })
    .click();
  await page.getByLabel("Player 1 name").fill("Alice");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  async function submit(n: number) {
    await enterTotal(page, String(n));
    await page
      .getByRole("button", { name: "Submit score", exact: true })
      .click();
  }
  await submit(180);
  await enterTotal(page, "120");
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Bust");
  await expect(page.getByRole("status")).toContainText("121");
  await page.getByRole("button", { name: "Undo score", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("121");
  await enterTotal(page, "121");
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await page.getByRole("button", { name: "Confirm double-out" }).click();
  await page
    .getByRole("button", { name: "Rematch with these players", exact: true })
    .click();
  await expect(page.getByTestId("score-0")).toHaveText("301");
  await expect(page.getByTestId("active-player")).toContainText("Alice");
  await page.goto("/history");
  await expect(page.getByText("Alice wins", { exact: true })).toBeVisible();
});

test("landscape phone keeps scores and Submit in view, and the nav strip shows the current tab", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/new");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  const submit = await page.getByRole("button", { name: "Submit score", exact: true }).boundingBox();
  expect(submit!.y + submit!.height).toBeLessThanOrEqual(390);
  await expect(page.getByTestId("score-0")).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await expect(page.getByRole("link", { name: "Settings", exact: true }).first()).toBeInViewport();
});
