import { test, expect } from "@playwright/test";

const SHEET_URL = "https://script.example/exec";

test("a finished match is posted to the sheet with the token", async ({ page }) => {
  const posts: string[] = [];
  await page.route(SHEET_URL, async (route) => {
    posts.push(route.request().postData() ?? "");
    await route.fulfill({
      status: 200,
      headers: { "access-control-allow-origin": "*", "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/settings");
  await page.getByLabel("Web app URL").fill(SHEET_URL);
  await page.getByLabel("Token").fill("secret-token");
  await page.getByRole("button", { name: "Save sheet settings", exact: true }).click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible();

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

  await expect.poll(() => posts.length).toBeGreaterThan(0);
  const body = JSON.parse(posts[0]);
  expect(body.token).toBe("secret-token");
  expect(body.row).toMatchObject({ mode: "x01", players: ["Antun"], winner: "Antun" });
});
