import { test, expect } from "@playwright/test";
import { enterTotal } from "./helpers";

test("backup import previews, validates and restores the complete scorebook", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await enterTotal(page, "60");
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  const backup = await page.evaluate(() => ({
    version: 1,
    ...JSON.parse(localStorage.getItem("oche-v1")!).state,
  }));
  await page.goto("/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data as JSON" }).click();
  expect((await download).suggestedFilename()).toMatch(/^oche-backup-/);
  await expect(page.getByText(/Last export requested:/)).not.toContainText(
    "Never",
  );
  const input = page.getByLabel("Import Oche backup");
  await input.setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{}"),
  });
  await expect(
    page.getByText("This file is not an Oche backup. Choose a file exported from Settings."),
  ).toBeVisible();
  await input.setInputFiles({
    name: "oche.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("region", { name: "Backup preview" }),
  ).toContainText("1 active match");
  await page
    .getByRole("button", { name: "Replace local data with this backup" })
    .click();
  await expect(
    page.getByText("Backup restored. Your scorebook is ready."),
  ).toBeVisible();
  await page.goto("/match");
  await expect(page.getByTestId("score-0")).toHaveText("441");
  await page.reload();
  await expect(page.getByTestId("score-0")).toHaveText("441");
});

test("only one tab can save and a secondary tab can acquire after it closes", async ({
  page,
  context,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  const second = await context.newPage();
  await second.goto("/match");
  await expect(second.getByRole("main").getByRole("alert")).toContainText(
    "read-only",
  );
  await expect(
    second.getByRole("button", { name: "Digit 6", exact: true }),
  ).toBeDisabled();
  await enterTotal(page, "60");
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await expect(second.getByTestId("score-0")).toHaveText("441");
  await page.close();
  await second
    .getByRole("button", { name: "Enable scoring in this tab" })
    .click();
  await expect(
    second.getByRole("button", { name: "Digit 1", exact: true }),
  ).toBeEnabled();
  await enterTotal(second, "100");
  await second
    .getByRole("button", { name: "Submit score", exact: true })
    .click();
  await expect(second.getByTestId("score-1")).toHaveText("401");
  await second.reload();
  await expect(second.getByTestId("score-1")).toHaveText("401");
});

test("short portrait and landscape keep controls reachable and dialog focus returns", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  for (const size of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 390, height: 740 },
  ]) {
    await page.setViewportSize(size);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const submit = page.getByRole("button", {
      name: "Submit score",
      exact: true,
    });
    await submit.scrollIntoViewIfNeeded();
    expect((await submit.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const undo = page.getByRole("button", { name: "Undo score", exact: true });
    await undo.scrollIntoViewIfNeeded();
    expect((await undo.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "More match details" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "More match details" }),
  ).toBeFocused();
  await page.addStyleTag({ content: "body { font-size: 200% !important; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("wake lock and speech are opt-in and clean up on leaving play", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { requests: 0, releases: 0, spoken: [] as string[] };
    Object.assign(window, { matchDayTest: state });
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          state.requests++;
          const lock = Object.assign(new EventTarget(), {
            released: false,
            release: async () => {
              lock.released = true;
              state.releases++;
              lock.dispatchEvent(new Event("release"));
            },
          });
          return lock;
        },
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel: () => {},
        speak: (u: SpeechSynthesisUtterance) => state.spoken.push(u.text),
      },
    });
  });
  await page.goto("/new");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "More match details" }).click();
  await page.getByLabel("Keep screen awake", { exact: false }).check();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { matchDayTest: { requests: number } })
            .matchDayTest.requests,
      ),
    )
    .toBe(1);
  await page.getByLabel("Spoken scores", { exact: false }).check();
  await page.getByRole("button", { name: "Close match details" }).click();
  await enterTotal(page, "60");
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (
          window as unknown as { matchDayTest: { spoken: string[] } }
        ).matchDayTest.spoken.join(" "),
      ),
    )
    .toContain("tuna scores 60. loser to throw.");
  await page.getByRole("link", { name: "Back to overview" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { matchDayTest: { releases: number } })
            .matchDayTest.releases,
      ),
    )
    .toBeGreaterThan(0);
});
