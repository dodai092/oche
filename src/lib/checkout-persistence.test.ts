import { describe, expect, it } from "vitest";
import { parseBackup } from "./backup";
import { restorePersistedData } from "./persistence";
import {
  createCheckoutGame,
  throwCheckoutDart,
  type CheckoutGame,
} from "./checkout-engine";
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
function fresh(rounds: number | "infinite" = 3): CheckoutGame {
  return createCheckoutGame({
    startTarget: 40,
    dartsPerAttempt: 6,
    rounds,
    players: players.slice(0, 1),
  });
}
const finished = () => throwCheckoutDart(fresh(1), D(20));
const saved = (checkout: CheckoutGame, id = "m1") => ({
  id,
  startedAt: "2026-10-15T10:00:00.000Z",
  finishedAt: "2026-10-15T10:20:00.000Z",
  mode: "checkout",
  checkout,
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

describe("saved matches with the checkout mode", () => {
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

  it("round-trips an in-progress and a finished match, infinite rounds included", () => {
    const partial = throwCheckoutDart(fresh("infinite"), S(1));
    const restored = restorePersistedData(
      viaStorage(
        state({ current: saved(partial, "m2"), history: [saved(finished())] }),
      ),
    );
    expect(restored.history[0]).toMatchObject({ mode: "checkout" });
    expect(
      "checkout" in restored.history[0] && restored.history[0].checkout.status,
    ).toBe("complete");
    const current = restored.current;
    expect(
      current && "checkout" in current ? current.checkout.turnDarts : [],
    ).toHaveLength(1);
    expect(
      current && "checkout" in current ? current.checkout.config.rounds : 0,
    ).toBe("infinite");
  });

  it("rejects a checkout match with a corrupted event list or config", () => {
    const broken = viaStorage(saved(finished()));
    broken.checkout.events[0] = { type: "dart", dart: { value: 99, multiplier: 1 } };
    expect(() => restorePersistedData(state({ history: [broken] }))).toThrow();
    const badStart = viaStorage(saved(finished()));
    badStart.checkout.config.startTarget = 159;
    expect(() => restorePersistedData(state({ history: [badStart] }))).toThrow();
  });

  it("rejects an unknown mode and an unfinished checkout match in history", () => {
    expect(() =>
      restorePersistedData(
        viaStorage(state({ history: [{ ...saved(finished()), mode: "golf" }] })),
      ),
    ).toThrow();
    expect(() =>
      restorePersistedData(
        viaStorage(state({ history: [saved(throwCheckoutDart(fresh(), S(1)))] })),
      ),
    ).toThrow(/Incomplete archived match/);
  });

  it("imports a checkout match from a backup file", () => {
    const raw = JSON.stringify({
      version: 1,
      ...state({ history: [saved(finished())] }),
    });
    expect(parseBackup(raw).history[0]).toMatchObject({ mode: "checkout" });
  });
});
