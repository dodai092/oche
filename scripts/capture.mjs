import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("docs/screenshots", { recursive: true });
const browser = await chromium.launch();
for (const [name, width, height] of [
  ["desktop", 1440, 1040],
  ["mobile", 390, 844],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "A good day for darts." }).waitFor();
  await page.screenshot({
    path: `docs/screenshots/${name}-dashboard.png`,
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:3000/new", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Score 140", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `docs/screenshots/${name}-total-entry.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Dart-by-dart", exact: true }).click();
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  await page.getByRole("button", { name: "Hit 20", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `docs/screenshots/${name}-match.png`,
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:3000/new");
  await page.getByRole("button", { name: "301", exact: true }).click();
  await page.getByRole("button", { name: /Single out/ }).click();
  await page.getByRole("button", { name: "Remove player 2" }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Replace & start match" }).click();
  await page.getByRole("button", { name: "Visit total", exact: true }).click();
  await page.getByRole("button", { name: "Score 180", exact: true }).click();
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await page.getByRole("button", { name: "Use keyboard", exact: true }).click();
  await page.getByLabel("Visit score", { exact: true }).fill("121");
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await page.getByRole("heading", { name: "Player 1 wins!" }).waitFor();
  await page.screenshot({
    path: `docs/screenshots/${name}-summary.png`,
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:3000/settings");
  await page.getByLabel("Import Oche backup").waitFor();
  await page.screenshot({
    path: `docs/screenshots/${name}-settings.png`,
    fullPage: true,
  });
  await context.close();
}
await browser.close();
console.log("Saved desktop and mobile previews in docs/screenshots/");
