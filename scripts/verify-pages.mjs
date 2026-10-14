import { chromium, webkit } from "@playwright/test";
import { strict as assert } from "node:assert";
const root = new URL(process.argv[2] ?? "http://127.0.0.1:4175/oche/");
const engine = process.argv[3] === "webkit" ? webkit : chromium;
const browser = await engine.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const errors = [];
  const failed = [];

  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (new URL(r.url()).origin === root.origin && r.status() >= 400)
      failed.push(`${r.status()} ${r.url()}`);
  });
  // Next prefetch traffic may remain active; assert rendered UI and real interactions instead.
  await page.goto(root.href, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "A good day for darts." }).waitFor();
  assert.equal(await page.getByAltText("Dodai").count(), 0);
  await page.getByRole("link", { name: "Start a match", exact: true }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button",{name:"Use keyboard",exact:true}).click();
  async function score(value) {
    await page.getByLabel("Visit score", { exact: true }).fill(String(value));
    await page
      .getByRole("button", { name: "Submit score", exact: true })
      .click();
  }
  await score(180);
  await page.getByTestId("score-0").filter({ hasText: "321" }).waitFor();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("score-0").filter({ hasText: "321" }).waitFor();
  await score(0);
  await score(180);
  await score(0);
  await score(141);
  await page.getByRole("button", { name: "Confirm double-out" }).click();
  await page.getByRole("heading", { name: "Player 1 wins!" }).waitFor();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Player 1 wins!" }).waitFor();
  await page.getByRole("button", { name: "Undo winning score" }).click();
  await page.getByTestId("score-0").filter({ hasText: "141" }).waitFor();
  for (const path of [
    "new/",
    "match/",
    "players/",
    "statistics/",
    "history/",
    "settings/",
  ]) {
    const response = await page.goto(new URL(path, root).href, {
      waitUntil: "domcontentloaded",
    });
    assert.equal(response.status(), 200, path);
    await page.locator("h1,h2").first().waitFor();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow: ${path}`,
    );
  }
  assert.deepEqual(errors, [], "Browser exceptions");
  assert.deepEqual(failed, [], "Failed app requests");
  await page.getByTestId("offline-manager").getByRole("status").filter({hasText:"Ready offline"}).waitFor({timeout:60000});
  console.log(
    `${process.argv[3] ?? "chromium"}: ${root.href} passed scoring, completion, undo, refresh, all routes and asset checks`,
  );
} finally {
  await browser.close();
}
