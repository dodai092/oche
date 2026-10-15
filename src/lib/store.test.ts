import { beforeEach, expect, it, vi } from "vitest";
import type { SavedMatch } from "./store";
beforeEach(() => {
  vi.resetModules();
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
it("rematches completed games with the same players and format while preserving history", async () => {
  const { useGameStore } = await import("./store");
  const store = useGameStore;
  store.getState().start({
    startScore: 301,
    doubleOut: false,
    legsToWin: 1,
    setsToWin: 1,
    players: [{ id: "alice", name: "Alice" }],
  });
  store.getState().visit(180);
  store.getState().visit(121);
  const finished = store.getState().current! as SavedMatch;
  expect(finished.game.status).toBe("complete");
  store.getState().updateSettings({ entryMode: "darts" });
  store.getState().rematch();
  const next = store.getState().current! as SavedMatch;
  expect(next.id).not.toBe(finished.id);
  expect(next.game.config).toEqual(finished.game.config);
  expect(next.game.players[0]).toMatchObject({
    id: "alice",
    score: 301,
    legs: 0,
    sets: 0,
  });
  expect(next.game.events).toEqual([]);
  expect(store.getState().history).toEqual([finished]);
  expect(store.getState().settings.entryMode).toBe("darts");
});
it("does not replace an unfinished match with rematch", async () => {
  const { useGameStore } = await import("./store");
  useGameStore.getState().start({
    startScore: 501,
    doubleOut: true,
    legsToWin: 1,
    setsToWin: 1,
    players: [{ id: "alice", name: "Alice" }],
  });
  const current = useGameStore.getState().current;
  useGameStore.getState().rematch();
  expect(useGameStore.getState().current).toBe(current);
});
it("persists both entry preferences across hydration", async () => {
  const { useGameStore } = await import("./store");
  useGameStore
    .getState()
    .updateSettings({ entryMode: "darts", keyboardMode: "keyboard" });
  const saved = localStorage.getItem("oche-v1")!;
  useGameStore
    .getState()
    .updateSettings({ entryMode: "total", keyboardMode: "keypad" });
  localStorage.setItem("oche-v1", saved);
  await useGameStore.persist.rehydrate();
  expect(useGameStore.getState().settings).toMatchObject({
    entryMode: "darts",
    keyboardMode: "keyboard",
  });
});

it("blocks mutations and persistence from read-only tabs", async () => {
  const { useGameStore } = await import("./store");
  useGameStore.setState({ readOnly: true });
  const saved = localStorage.getItem("oche-v1");
  useGameStore.getState().addPlayer("Blocked");
  useGameStore.getState().updateSettings({ startScore: 701 });
  expect(useGameStore.getState().profiles).toEqual([]);
  expect(useGameStore.getState().settings.startScore).toBe(501);
  expect(localStorage.getItem("oche-v1")).toBe(saved);
});
it("validates restores before replacing data and keeps existing state when writes fail", async () => {
  const { useGameStore, safeStorage } = await import("./store");
  useGameStore.getState().addPlayer("Alice");
  const before = useGameStore.getState().profiles;
  expect(() => useGameStore.getState().restoreBackup({})).toThrow();
  expect(useGameStore.getState().profiles).toBe(before);
  const valid = JSON.parse(localStorage.getItem("oche-v1")!).state;
  valid.profiles = [{ id: "b", name: "Bob" }];
  localStorage.setItem = () => {
    throw Error("quota");
  };
  vi.stubGlobal("window", { dispatchEvent: () => {} });
  expect(() => useGameStore.getState().restoreBackup(valid)).toThrow();
  expect(useGameStore.getState().profiles).toBe(before);
  expect(safeStorage.blocked()).toBe(true);
});
