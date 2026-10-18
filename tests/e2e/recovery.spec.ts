import { test, expect } from "@playwright/test";

test("malformed save is preserved, can be downloaded and explicitly reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("oche-v1", '{"version":1,"state":{"history":null}}');
      sessionStorage.setItem("seeded", "yes");
    }
  });
  await page.goto("/overview/");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "original save is preserved",
  );
  await expect(
    page.getByRole("heading", { name: "A good day for darts." }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("oche-v1"))).toBe(
    '{"version":1,"state":{"history":null}}',
  );
  await page.goto("/settings");
  await expect(
    page.getByRole("button", { name: "Download original save" }),
  ).toBeEnabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download original save" }).click();
  await download;
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Reset storage with current data" })
    .click();
  await expect(
    page.getByText("Storage unavailable", { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your darts room." }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("quota failure keeps scoring alive without recursive errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page.goto("/new");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "storage is full or unavailable",
  );
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Dart-by-dart", exact: true }).click();
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  await page.getByRole("button", { name: "Hit 20", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("441");
  expect(errors).toEqual([]);
});

test("saved profiles cannot occupy two positions and settings persist", async ({
  page,
}) => {
  await page.goto("/players");
  await page.getByLabel("Player name").fill("Alice");
  await page.getByRole("button", { name: "Add player", exact: true }).click();
  await page.goto("/new");
  await page.getByLabel("Player 1 name").fill("Alice");
  await page.getByLabel("Player 2 name").fill("ALICE");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Choose a different player",
  );
  await page.getByLabel("Player 2 name").fill("Bob");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByTestId("score-0")).toHaveText("501");
  await page.goto("/settings");
  await page.getByLabel("Starting score", { exact: true }).selectOption("701");
  await page.getByLabel("Checkout suggestions").uncheck();
  await page.reload();
  await expect(page.getByLabel("Checkout suggestions")).not.toBeChecked();
  await page.goto("/new");
  await expect(
    page.getByRole("button", { name: "701", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("all seven screens render without page exceptions or horizontal overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of [
    "/",
    "/new",
    "/match",
    "/players",
    "/statistics",
    "/history",
    "/settings",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1,h2").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

for (const broken of ['{"version":1}', "broken JSON"]) {
  test(`preserves malformed envelope ${broken}`, async ({ page }) => {
    await page.addInitScript((raw) => {
      if (!sessionStorage.getItem("seeded")) {
        localStorage.setItem("oche-v1", raw);
        sessionStorage.setItem("seeded", "yes");
      }
    }, broken);
    await page.goto("/overview/");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "original save is preserved",
    );
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem("oche-v1"))).toBe(
      broken,
    );
  });
}
