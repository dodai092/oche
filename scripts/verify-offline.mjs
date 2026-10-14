import { chromium, webkit } from "@playwright/test";
import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

async function waitUntil(check, description) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await check()) return;
    await delay(100);
  }
  throw Error(`Timed out: ${description}`);
}

// Run after the production export and offline generation. No build is started here.
const out = path.resolve(fileURLToPath(new URL("../out/", import.meta.url)));
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/oche").replace(/\/$/, "");
const originalWorker = await readFile(path.join(out, "sw.js"), "utf8");
let revision = "";
let failDownload = false;
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".txt": "text/x-component",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    if (!url.pathname.startsWith(`${base}/`)) {
      response.writeHead(404).end();
      return;
    }
    if (url.pathname === `${base}/sw.js`) {
      const worker = revision
        ? originalWorker.replace(
            /const CACHE = PREFIX \+ "([^"]+)";/,
            (_, hash) => `const CACHE = PREFIX + "${hash}-${revision}";`,
          )
        : originalWorker;
      response
        .writeHead(200, {
          "Content-Type": "text/javascript",
          "Cache-Control": "no-store",
        })
        .end(worker);
      return;
    }
    const relative = decodeURIComponent(url.pathname.slice(base.length + 1));
    let file = path.resolve(out, relative);
    if (
      !file.startsWith(`${out}${path.sep}`) &&
      file !== out.replace(/\/$/, "")
    )
      throw Error("Invalid path");
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    if (failDownload && relative.endsWith("index.txt")) {
      response.writeHead(503).end();
      return;
    }
    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const root = `http://127.0.0.1:${server.address().port}${base}/`;
const engine = process.argv.includes("webkit") ? webkit : chromium;
let browser;
try {
  browser = await engine.launch();
  const context = await browser.newContext({ serviceWorkers: "allow" });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(root, { waitUntil: "domcontentloaded" });
  // Explicit registration also lets this worker test run before parent UI integration.
  await page.evaluate(async (scope) => {
    await navigator.serviceWorker.register(`${scope}sw.js`, {
      scope,
      updateViaCache: "none",
    });
  }, new URL(root).pathname);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const readiness = () =>
    page.evaluate(
      () =>
        new Promise((resolve) => {
          const channel = new MessageChannel();
          const timer = setTimeout(() => {
            channel.port1.close();
            resolve(false);
          }, 10000);
          channel.port1.onmessage = (event) => {
            clearTimeout(timer);
            channel.port1.close();
            resolve(event.data.ready);
          };
          navigator.serviceWorker.controller.postMessage(
            { type: "OFFLINE_STATUS" },
            [channel.port2],
          );
        }),
    );
  assert.equal(await readiness(), true, "Complete cache must be ready");
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "A good day for darts." }).waitFor();
  // These routes have not been opened online. Links exercise RSC payloads.
  await page.getByRole("link", { name: "Start a match", exact: true }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Use keyboard", exact: true }).click();
  await page.getByLabel("Visit score", { exact: true }).fill("180");
  await page.getByRole("button", { name: "Submit score", exact: true }).click();
  await page.getByTestId("score-0").filter({ hasText: "321" }).waitFor();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByTestId("score-0").filter({ hasText: "321" }).waitFor();
  await page.getByRole("button", { name: /Undo/ }).first().click();
  await page.getByTestId("score-0").filter({ hasText: "501" }).waitFor();
  await page.getByRole("link", { name: "Statistics", exact: true }).click();
  await page.waitForURL(`${root}statistics/`);
  await page.locator("h1").waitFor();
  // A new page has no in-memory router cache and navigates directly while offline.
  const cold = await context.newPage();
  cold.setDefaultTimeout(15000);
  await cold.goto(`${root}players/`, { waitUntil: "domcontentloaded" });
  await cold.locator("h1").waitFor();
  // An unknown route offline shows the app's own 404 page, not a browser error.
  const missing = await cold.context().newPage();
  const missingResponse = await missing.goto(`${root}nope/`, {
    waitUntil: "domcontentloaded",
  });
  assert.equal(missingResponse?.status(), 404, "Unknown offline route is a 404");
  assert.match(await missing.content(), /404|not found/i);
  await missing.close();
  await cold.close();
  assert.equal(await readiness(), true);
  await context.setOffline(false);
  await page.goto(`${root}settings/`, { waitUntil: "domcontentloaded" });

  // An interrupted next version must not replace the complete current cache.
  revision = "failed";
  failDownload = true;
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration.update();
    const worker = registration.installing;
    if (!worker) throw Error("Expected an installing update");
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Update did not fail within 15s")),
        15000,
      );
      const changed = () => {
        if (worker.state === "redundant") {
          clearTimeout(timer);
          resolve();
        }
      };
      worker.addEventListener("statechange", changed);
      changed();
    });
  });
  await waitUntil(
    () =>
      page.evaluate(
        async () =>
          !(await navigator.serviceWorker.getRegistration()).installing,
      ),
    "failed installation settles",
  );
  assert.equal(
    await readiness(),
    true,
    "Failed update preserves current cache",
  );
  assert.equal(
    await page.evaluate(
      async () => !!(await navigator.serviceWorker.getRegistration()).waiting,
    ),
    false,
  );
  assert.equal(
    await page.evaluate(async () =>
      (await caches.keys()).some((name) => name.endsWith("-failed")),
    ),
    false,
    "Partial update cache removed",
  );

  revision = "updated";
  failDownload = false;
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration()).update();
  });
  await waitUntil(
    () =>
      page.evaluate(
        async () => !!(await navigator.serviceWorker.getRegistration()).waiting,
      ),
    "update waits",
  );
  const previousController = await page.evaluate(
    () => navigator.serviceWorker.controller.scriptURL,
  );
  const oldCacheExists = await page.evaluate(
    async () =>
      (await caches.keys()).filter((name) => name.startsWith("oche-offline:"))
        .length,
  );
  assert.equal(oldCacheExists, 2, "Installed update waits beside active cache");
  if (await page.getByTestId("offline-manager").count()) {
    assert.equal(
      await page
        .getByRole("button", { name: "Update", exact: true })
        .isDisabled(),
      true,
      "Active match blocks update",
    );
  }
  // Apply explicitly in an isolated worker test. No component was asked to reload.
  let navigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations++;
  });
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    registration.waiting.postMessage({ type: "APPLY_UPDATE" });
  });
  await waitUntil(
    () =>
      page.evaluate(
        async () =>
          !(await navigator.serviceWorker.getRegistration()).waiting &&
          (await caches.keys()).some((name) => name.endsWith("-updated")) &&
          (await caches.keys()).filter((name) =>
            name.startsWith("oche-offline:"),
          ).length === 1,
      ),
    "explicit activation completes",
  );
  assert.equal(
    await page.evaluate(() => navigator.serviceWorker.controller.scriptURL),
    previousController,
  );
  assert.equal(
    navigations,
    0,
    "Controller changes do not automatically reload",
  );
  assert.equal(await readiness(), true);
  // Exercise the real component's update path after finishing the active match.
  revision = "ui-update";
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration()).update();
  });
  await waitUntil(
    () =>
      page.evaluate(
        async () => !!(await navigator.serviceWorker.getRegistration()).waiting,
      ),
    "UI update waits",
  );
  const update = page.getByRole("button", { name: "Update", exact: true });
  assert.equal(
    await update.isDisabled(),
    true,
    "UI update remains blocked mid-match",
  );
  await page.goto(`${root}match/`, { waitUntil: "domcontentloaded" });
  async function score(value) {
    await page.getByLabel("Visit score", { exact: true }).fill(String(value));
    await page
      .getByRole("button", { name: "Submit score", exact: true })
      .click();
  }
  await score(180);
  await score(0);
  await score(180);
  await score(0);
  await score(141);
  await page.getByRole("button", { name: "Confirm double-out" }).click();
  await page.getByRole("heading", { name: "Player 1 wins!" }).waitFor();
  await page.goto(`${root}settings/`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Update", exact: true }).waitFor();
  assert.equal(
    await update.isEnabled(),
    true,
    "Completed match permits update",
  );
  const navigation = page.waitForEvent("framenavigated", {
    predicate: (frame) => frame === page.mainFrame(),
  });
  await update.click();
  await navigation;
  await page.getByRole("heading", { name: "Your darts room." }).waitFor();
  assert.equal(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("oche-v1")).state.current.game.status,
    ),
    "complete",
    "Explicit update preserves the scorebook",
  );
  await waitUntil(readiness, "UI update complete cache ready");
  // Cache eviction must revoke readiness, even with a controlling worker.
  await page.evaluate(async () => {
    for (const name of await caches.keys())
      if (name.startsWith("oche-offline:")) await caches.delete(name);
  });
  assert.equal(await readiness(), false, "No cache means not ready offline");
  await page.getByTestId("offline-manager").getByRole("status").waitFor();
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page
    .getByRole("button", { name: "Download offline files", exact: true })
    .click({ timeout: 3000 });
  await waitUntil(readiness, "Evicted offline files are repaired");
  assert.deepEqual(errors, [], "Browser exceptions");
  console.log(
    `${process.argv.includes("webkit") ? "webkit" : "chromium"}: offline reload, scoring, undo, cold HTML/RSC routes, atomic failure, waiting update, explicit activation, safe UI update, no auto reload, eviction passed`,
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
