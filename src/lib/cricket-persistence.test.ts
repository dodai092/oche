import { describe, expect, it } from "vitest";
import { parseBackup } from "./backup";
import { restorePersistedData } from "./persistence";
import {
  createCricketGame,
  endCricketTurn,
  throwCricketDart,
  type CricketGame,
} from "./cricket-engine";
import { createGame, type Dart } from "./engine";

const S = (value: number): Dart => ({ value, multiplier: 1 });
const D = (value: number): Dart => ({ value, multiplier: 2 });
const T = (value: number): Dart => ({ value, multiplier: 3 });
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
function visit(game: CricketGame, darts: Dart[]) {
  let g = game;
  for (const d of darts.length ? darts : [S(0)]) g = throwCricketDart(g, d);
  return darts.length < 3 ? endCricketTurn(g) : g;
}
function fresh() {
  return createCricketGame({ style: "standard", legsToWin: 1, players });
}
function finished() {
  let g = fresh();
  g = visit(g, [T(20), T(19), T(18)]);
  g = visit(g, []);
  g = visit(g, [T(17), T(16), T(15)]);
  g = visit(g, []);
  return visit(g, [S(25), D(25)]);
}
const saved = (cricket: CricketGame, id = "m1") => ({
  id,
  startedAt: "2026-10-15T10:00:00.000Z",
  finishedAt: "2026-10-15T10:20:00.000Z",
  mode: "cricket",
  cricket,
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

describe("saved matches with a mode", () => {
  it("loads a save from before Cricket (no mode) as an x01 match", () => {
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
    expect(restored.current).toMatchObject({ id: "x1" });
    expect(restored.current).toHaveProperty("game");
    expect(restored.current).not.toHaveProperty("mode");
  });

  it("round-trips an in-progress and a finished Cricket match", () => {
    const partial = throwCricketDart(fresh(), T(20));
    const restored = restorePersistedData(
      viaStorage(
        state({ current: saved(partial, "m2"), history: [saved(finished())] }),
      ),
    );
    expect(restored.history[0]).toMatchObject({ mode: "cricket" });
    expect(
      "cricket" in restored.history[0] && restored.history[0].cricket.status,
    ).toBe("complete");
    expect(
      restored.current && "cricket" in restored.current
        ? restored.current.cricket.turnDarts
        : [],
    ).toHaveLength(1);
  });

  it("rejects a Cricket match with a corrupted event list", () => {
    const broken = viaStorage(saved(finished()));
    broken.cricket.events[0] = { type: "dart", dart: { value: 99, multiplier: 1 } };
    expect(() =>
      restorePersistedData(state({ history: [broken] })),
    ).toThrow();
  });

  it("rejects an unknown mode and an unfinished Cricket match in history", () => {
    expect(() =>
      restorePersistedData(
        viaStorage(state({ history: [{ ...saved(finished()), mode: "golf" }] })),
      ),
    ).toThrow();
    expect(() =>
      restorePersistedData(
        viaStorage(state({ history: [saved(throwCricketDart(fresh(), T(20)))] })),
      ),
    ).toThrow(/Incomplete archived match/);
  });

  it("imports a Cricket match from a backup file", () => {
    const raw = JSON.stringify({
      version: 1,
      ...state({ history: [saved(finished())] }),
    });
    expect(parseBackup(raw).history[0]).toMatchObject({ mode: "cricket" });
  });
});
