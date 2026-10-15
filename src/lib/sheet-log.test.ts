import { describe, expect, it } from "vitest";
import { createSheetLog, matchRow, SHEET_LOG_KEYS } from "./sheet-log";
import type { AnyMatch } from "./store";

function memory() {
  const data = new Map<string, string>();
  return {
    read: (key: string) => data.get(key) ?? null,
    write: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

const match = (id: string, winner = 0) =>
  ({
    id,
    mode: "x01",
    startedAt: "2026-10-15T10:00:00.000Z",
    finishedAt: "2026-10-15T10:20:00.000Z",
    game: {
      players: [{ name: "Ana" }, { name: "Ben" }],
      winner,
    },
  }) as unknown as AnyMatch;

function setup(replies: Array<string | Error> = []) {
  const store = memory();
  const posted: Array<{ url: string; body: string }> = [];
  const log = createSheetLog({
    ...store,
    post: async (url, body) => {
      posted.push({ url, body });
      const next = replies.shift() ?? JSON.stringify({ ok: true });
      if (next instanceof Error) throw next;
      return next;
    },
    now: () => "2026-10-15T12:00:00.000Z",
  });
  return { log, store, posted };
}

describe("matchRow", () => {
  it("names the players and the winner of a finished x01 match", () => {
    const row = matchRow(match("m1", 1));
    expect(row).toMatchObject({
      id: "m1",
      mode: "x01",
      players: ["Ana", "Ben"],
      winner: "Ben",
      finishedAt: "2026-10-15T10:20:00.000Z",
    });
  });
});

describe("sheet log queue", () => {
  it("queues a match once and keeps the order", () => {
    const { log } = setup();
    expect(log.enqueue(match("m1"))).toBe(true);
    expect(log.enqueue(match("m1"))).toBe(false);
    expect(log.enqueue(match("m2"))).toBe(true);
    expect(log.status().pending).toBe(2);
  });

  it("sends queued rows with the token and clears them on success", async () => {
    const { log, posted } = setup();
    log.setConfig({ url: " https://script.example/exec ", token: "secret" });
    log.enqueue(match("m1"));
    log.enqueue(match("m2"));
    await log.flush();
    expect(posted.map((p) => p.url)).toEqual([
      "https://script.example/exec",
      "https://script.example/exec",
    ]);
    expect(JSON.parse(posted[0].body)).toMatchObject({ token: "secret", row: { id: "m1" } });
    expect(log.status()).toEqual({
      pending: 0,
      lastSentAt: "2026-10-15T12:00:00.000Z",
      lastError: null,
    });
  });

  it("keeps the row and records the error when the sheet refuses it", async () => {
    const { log } = setup([JSON.stringify({ ok: false, error: "Wrong token." })]);
    log.setConfig({ url: "https://script.example/exec", token: "bad" });
    log.enqueue(match("m1"));
    await log.flush();
    expect(log.status()).toMatchObject({ pending: 1, lastError: "Wrong token." });
  });

  it("keeps the row when the network fails", async () => {
    const { log } = setup([new Error("offline")]);
    log.setConfig({ url: "https://script.example/exec", token: "t" });
    log.enqueue(match("m1"));
    await log.flush();
    expect(log.status()).toMatchObject({
      pending: 1,
      lastError: "Could not reach the sheet. Matches stay queued.",
    });
  });

  it("does nothing until a URL is configured", async () => {
    const { log, posted } = setup();
    log.enqueue(match("m1"));
    await log.flush();
    expect(posted).toHaveLength(0);
    expect(log.status().pending).toBe(1);
  });

  it("does not queue a match the sheet already has", async () => {
    const { log, store } = setup();
    log.setConfig({ url: "https://script.example/exec", token: "t" });
    log.enqueue(match("m1"));
    await log.flush();
    expect(JSON.parse(store.data.get(SHEET_LOG_KEYS.sent) ?? "[]")).toEqual(["m1"]);
    expect(log.enqueue(match("m1"))).toBe(false);
  });
});
