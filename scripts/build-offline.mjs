import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const project = fileURLToPath(new URL("../", import.meta.url));
const out = path.join(project, "out");
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
if (base && !/^\/(?:[\w-]+\/)*[\w-]+$/.test(base))
  throw Error(
    "NEXT_PUBLIC_BASE_PATH must be an absolute path without a trailing slash",
  );
if (process.env.GITHUB_PAGES !== "true") {
  console.log(
    "Offline generation skipped: GITHUB_PAGES=true enables static export.",
  );
} else {
  async function walk(dir, prefix = "") {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map((entry) => {
        const relative = `${prefix}${entry.name}`;
        return entry.isDirectory()
          ? walk(path.join(dir, entry.name), `${relative}/`)
          : [relative];
      }),
    );
    return files.flat();
  }
  const files = (await walk(out)).filter((file) => file !== "sw.js").sort();
  if (!files.includes("index.html"))
    throw Error("Missing static export index.html");
  const hash = createHash("sha256")
    .update(base)
    .update(await readFile(fileURLToPath(import.meta.url)));
  for (const file of files)
    hash.update(file).update(await readFile(path.join(out, file)));
  const version = hash.digest("hex").slice(0, 24);
  const urls = files.map(
    (file) => `${base}/${file.split("/").map(encodeURIComponent).join("/")}`,
  );
  const aliases = Object.fromEntries(
    files
      .filter((file) => file.endsWith("/index.html") || file === "index.html")
      .flatMap((file) => {
        const route = `${base}/${file.slice(0, -"index.html".length)}`;
        return [
          [route, `${base}/${file}`],
          ...(route !== "/" ? [[route.slice(0, -1), `${base}/${file}`]] : []),
        ];
      }),
  );
  const worker = `// Generated from the complete static export. Do not edit.
const PREFIX = ${JSON.stringify(`oche-offline:${base || "/"}:`)};
const CACHE = PREFIX + ${JSON.stringify(version)};
const URLS = ${JSON.stringify(urls)};
const ALIASES = ${JSON.stringify(aliases)};
const MARKER = new URL(${JSON.stringify(`${base}/__offline_complete__`)}, self.location.origin).href;
async function complete() {
  if (!(await caches.has(CACHE))) return false;
  const cache = await caches.open(CACHE);
  if (!(await cache.match(MARKER))) return false;
  return (await Promise.all(URLS.map(url => cache.match(url)))).every(Boolean);
}
async function download() {
  const cache = await caches.open(CACHE);
  for (const url of URLS) {
    const response = await fetch(new Request(url, { cache: "reload", credentials: "same-origin" }));
    if (!response.ok || response.redirected) throw Error("Cannot cache " + url);
    await cache.put(url, response);
  }
  await cache.put(MARKER, new Response("complete"));
}
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    try {
      // A failed file rejects installation; no partial cache is advertised as ready.
      await download();
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // Activation happens naturally on first install, or after an explicit update.
    await self.clients.claim();
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
    }
  })());
});
self.addEventListener("message", event => {
  if (event.data?.type === "REPAIR_OFFLINE") {
    event.waitUntil(download().then(() => complete()).then(ready => event.ports[0]?.postMessage({ ready })).catch(() => event.ports[0]?.postMessage({ ready: false })));
  }
  if (event.data?.type === "OFFLINE_STATUS") {
    event.waitUntil(complete().then(ready => event.ports[0]?.postMessage({ ready })).catch(() => event.ports[0]?.postMessage({ ready: false })));
  }
  if (event.data?.type === "APPLY_UPDATE") event.waitUntil(self.skipWaiting());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Static RSC exports do not vary with Next's cache-busting _rsc token.
  // All other query parameters remain significant.
  if (url.pathname.endsWith(".txt")) url.searchParams.delete("_rsc");
  url.pathname = url.pathname.split("/").map(part => encodeURIComponent(decodeURIComponent(part))).join("/");
  const navigation = request.mode === "navigate";
  const key = navigation && ALIASES[url.pathname]
    ? new URL(ALIASES[url.pathname], url.origin).href : url.href;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const response = await cache.match(key);
    return response || fetch(request);
  })());
});
`;
  await writeFile(path.join(out, "sw.js"), worker);
  console.log(
    `Offline worker: ${files.length} files, scope ${base || "/"}, version ${version}`,
  );
}
