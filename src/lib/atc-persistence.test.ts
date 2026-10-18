import { describe, expect, it } from "vitest";
import { parseBackup } from "./backup";
import { restorePersistedData } from "./persistence";
import {
  createAtcGame,
  endAtcTurn,
  makeAtcOrder,
  throwAtcDart,
  type AtcGame,
} from "./atc-engine";
import { createGame, type Dart } from "./engine";

const S = (value: number): Dart => ({ value, multiplier: 1 });
const D = (value: number): Dart => ({ value, multiplier: 2 });
const players = [
  { id: "a", name: "Ann" },
  { id: "b", name: "Ben" },
];
const settings = {
  startScore: 501,
  doubleOut: true,
  showCheckouts: true,
  entryMode: "total",
  keyboardMode: "keypad",
  keepAwake: false,
};
const order = makeAtcOrder("random", () => 0.3);
function fresh(): AtcGame {
  return createAtcGame({
    finish: "single-bull",
    field: "any",
    hitsPerTarget: 1,
    increase: false,
    orderMode: "random",
    order,
    legsToWin: 1,
    players: players.slice(0, 1),
  });
}
function finished(): AtcGame {
  let g = fresh();
  for (const n of order) {
    g = throwAtcDart(g, S(n));
    if (g.turnDarts.length === 3) g = endAtcTurn(g);
  }
  return throwAtcDart(g, D(25));
}
const saved = (atc: AtcGame, id = "m1") => ({
  id,
  startedAt: "2026-10-15T10:00:00.000Z",
  finishedAt: "2026-10-15T10:20:00.000Z",
  mode: "atc",
  atc,
});
const state = (overrides: object) => ({
  current: null,
  history: [],
  profiles: [],
  settings,
  lastBackupAt: null,
  ...overrides,
});
const viaStorage = (value: unknown) => JSON.parse(JSON.stringify(value));

describe("saved matches with the atc mode", () => {
  it("still loads a save from before any mode as an x01 match", () => {
    const game = createGame({
      startScore: 501,
      doubleOut: true,
      legsToWin: 1,
      setsToWin: 1,
      players,
    });
    const restored = restorePersistedData(
      viaStorage(
        state({
          current: { id: "x1", startedAt: "2026-10-15T09:00:00.000Z", game },
        }),
      ),
    );
    expect(restored.current).toHaveProperty("game");
    expect(restored.current).not.toHaveProperty("mode");
  });

  it("round-trips an in-progress and a finished match with the same random order", () => {
    const partial = throwAtcDart(fresh(), S(order[0]));
    const restored = restorePersistedData(
      viaStorage(
        state({ current: saved(partial, "m2"), history: [saved(finished())] }),
      ),
    );
    expect(restored.history[0]).toMatchObject({ mode: "atc" });
    expect(
      "atc" in restored.history[0] && restored.history[0].atc.status,
    ).toBe("complete");
    const current = restored.current;
    expect(current && "atc" in current ? current.atc.turnDarts : []).toHaveLength(1);
    expect(current && "atc" in current ? current.atc.config.order : []).toEqual(order);
  });

  it("rejects an ATC match with a corrupted event list or order", () => {
    const broken = viaStorage(saved(finished()));
    broken.atc.events[0] = { type: "dart", dart: { value: 99, multiplier: 1 } };
    expect(() => restorePersistedData(state({ history: [broken] }))).toThrow();
    const badOrder = viaStorage(saved(finished()));
    badOrder.atc.config.order = [1, 1, 3];
    expect(() => restorePersistedData(state({ history: [badOrder] }))).toThrow();
  });

  it("rejects an unknown mode and an unfinished ATC match in history", () => {
    expect(() =>
      restorePersistedData(
        viaStorage(state({ history: [{ ...saved(finished()), mode: "golf" }] })),
      ),
    ).toThrow();
    expect(() =>
      restorePersistedData(
        viaStorage(state({ history: [saved(throwAtcDart(fresh(), S(order[0])))] })),
      ),
    ).toThrow(/Incomplete archived match/);
  });

  it("imports an ATC match from a backup file", () => {
    const raw = JSON.stringify({
      version: 1,
      ...state({ history: [saved(finished())] }),
    });
    expect(parseBackup(raw).history[0]).toMatchObject({ mode: "atc" });
  });
});
