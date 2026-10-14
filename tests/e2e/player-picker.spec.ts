import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/players");
  await page.getByLabel("Player name").fill("Alice");
  await page.getByRole("button", { name: "Add player", exact: true }).click();
  await page.goto("/new");
});

test("selects a saved profile and starts a match with its identity", async ({
  page,
}) => {
  const picker = page.getByRole("combobox", {
    name: "Player 1 profile",
    exact: true,
  });
  await picker.selectOption({ label: "Alice" });
  const profileId = await picker.inputValue();
  expect(profileId).not.toBe("");
  await expect(page.getByLabel("Player 1 name", { exact: true })).toHaveValue(
    "Alice",
  );
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page).toHaveURL(/\/match\/?$/);
  await expect(
    page.getByRole("main").getByText("Alice", { exact: true }).first(),
  ).toBeVisible();
  const player = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("oche-v1")!).state.current.game
        .players[0],
  );
  expect(player).toMatchObject({ id: profileId, name: "Alice" });
});

test("rejects duplicate profile selections and allows editing a guest name", async ({
  page,
}) => {
  await page
    .getByLabel("Player 1 profile", { exact: true })
    .selectOption({ label: "Alice" });
  await page
    .getByLabel("Player 2 profile", { exact: true })
    .selectOption({ label: "Alice" });
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choose a different player",
  );
  await expect(page).toHaveURL(/\/new\/?$/);
  await page
    .getByLabel("Player 2 profile", { exact: true })
    .selectOption({ label: "Guest player" });
  await page.getByLabel("Player 2 name", { exact: true }).fill("Bob");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page).toHaveURL(/\/match\/?$/);
  await expect(
    page.getByRole("main").getByText("Bob", { exact: true }).first(),
  ).toBeVisible();
});
