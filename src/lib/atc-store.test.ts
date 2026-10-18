import { beforeEach, expect, it, vi } from "vitest";
import { makeAtcOrder, type AtcConfig } from "./atc-engine";
import type { Dart } from "./engine";

beforeEach(() => {
  vi.resetModules();
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
const S = (value: number): Dart => ({ value, multiplier: 1 });
const config: AtcConfig = {
  finish: "single-bull",
  field: "any",
  hitsPerTarget: 1,
  increase: false,
  orderMode: "random",
  order: makeAtcOrder("random", () => 0.7),
  legsToWin: 1,
  players: [{ id: "alice", name: "Alice" }],
};

it("never treats an ATC match as x01 or Cricket", async () => {
  const { useGameStore, isX01, isAtc, isCricket, matchLabel } = await import("./store");
  useGameStore.getState().startAtc(config);
  const current = useGameStore.getState().current;
  expect(isAtc(current)).toBe(true);
  expect(isX01(current)).toBe(false);
  expect(isCricket(current)).toBe(false);
  expect(matchLabel(current!)).toBe("Around the Clock");
});

it("routes darts, undo and turn end to the ATC engine only", async () => {
  const { useGameStore, isAtc } = await import("./store");
  const store = useGameStore.getState();
  store.startAtc(config);
  // x01 and Cricket actions leave an ATC match alone.
  store.dart(S(20));
  store.cricketDart(S(20));
  store.visit(60);
  let current = useGameStore.getState().current;
  expect(isAtc(current) && current.atc.events).toHaveLength(0);
  store.atcDart(S(config.order[0]));
  current = useGameStore.getState().current;
  expect(isAtc(current) && current.atc.turnDarts).toHaveLength(1);
  store.atcFinishTurn();
  store.atcUndo();
  current = useGameStore.getState().current;
  expect(isAtc(current) && current.atc.events).toHaveLength(0);
});

it("archives a finished match and rematches with the same order and settings", async () => {
  const { useGameStore, isAtc } = await import("./store");
  const store = useGameStore.getState();
  store.startAtc(config);
  config.order.forEach((num, i) => {
    store.atcDart(S(num));
    if (i % 3 === 2) store.atcFinishTurn();
  });
  store.atcFinishTurn();
  store.atcDart({ value: 25, multiplier: 1 });
  expect(useGameStore.getState().history).toHaveLength(1);
  const finished = useGameStore.getState().current!;
  store.rematch();
  const next = useGameStore.getState().current!;
  expect(next.id).not.toBe(finished.id);
  expect(isAtc(next) && next.atc.config).toEqual(isAtc(finished) && finished.atc.config);
  expect(isAtc(next) && next.atc.events).toEqual([]);
  expect(useGameStore.getState().history).toHaveLength(1);
});
