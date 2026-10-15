import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSafeStorage,
  restorePersistedData,
  validateSavedEnvelope,
} from "./persistence";
import { createGame, throwDart } from "./engine";
import type { SavedMatch } from "./store";
function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
}
const defaults = {
  current: null,
  history: [],
  profiles: [],
  settings: { startScore: 501, doubleOut: true, showCheckouts: true },
};
describe("storage failure recovery", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("latches failed writes before invoking the error handler", () => {
    let calls = 0;
    const backend = memory();
    backend.setItem = () => {
      calls++;
      throw Error("quota");
    };
    const storage = createSafeStorage(
      () => backend,
      () => storage.setItem("save", "retry"),
    );
    storage.setItem("save", "first");
    expect(calls).toBe(1);
    expect(storage.blocked()).toBe(true);
  });
  it("preserves raw data after hydration failure and suppresses writes until explicit recovery", () => {
    const backend = memory();
    backend.setItem("save", "broken JSON");
    const storage = createSafeStorage(
      () => backend,
      () => {},
    );
    expect(storage.getItem("save")).toBe("broken JSON");
    storage.block();
    storage.setItem("save", "defaults");
    expect(backend.getItem("save")).toBe("broken JSON");
    expect(storage.raw()).toBe("broken JSON");
    storage.recover();
    storage.setItem("save", "new");
    expect(backend.getItem("save")).toBe("new");
  });
  it("blocks writes after failed reads", () => {
    const backend = memory();
    backend.getItem = () => {
      throw Error("denied");
    };
    const storage = createSafeStorage(
      () => backend,
      () => {},
    );
    expect(() => storage.getItem("save")).toThrow("denied");
    expect(storage.blocked()).toBe(true);
  });
});
describe("persisted data validation", () => {
  it("rejects valid JSON with invalid fields", () => {
    expect(() =>
      restorePersistedData({ ...defaults, history: null }),
    ).toThrow();
    expect(() =>
      restorePersistedData({
        ...defaults,
        settings: { ...defaults.settings, startScore: 42 },
      }),
    ).toThrow();
  });
  it("rejects malformed game events", () => {
    const game = createGame({
      startScore: 501,
      doubleOut: true,
      legsToWin: 1,
      setsToWin: 1,
      players: [{ id: "a", name: "Alice" }],
    });
    expect(() =>
      restorePersistedData({
        ...defaults,
        current: {
          id: "m",
          startedAt: "2026-10-14T12:00:00Z",
          game: {
            ...game,
            events: [{ type: "dart", dart: { value: 25, multiplier: 3 } }],
          },
        },
      }),
    ).toThrow();
  });
  it("rebuilds saved scores from legal events rather than trusting stale totals", () => {
    let game = createGame({
      startScore: 501,
      doubleOut: true,
      legsToWin: 1,
      setsToWin: 1,
      players: [{ id: "a", name: "Alice" }],
    });
    game = throwDart(game, { value: 20, multiplier: 3 });
    game.players[0].score = 1;
    const saved = restorePersistedData({
      ...defaults,
      current: { id: "m", startedAt: "2026-10-14T12:00:00Z", game },
    });
    expect((saved.current as SavedMatch).game.players[0].score).toBe(441);
  });
});

it("distinguishes a missing save from malformed existing envelopes", () => {
  for (const raw of [
    '{"version":1}',
    "null",
    "[]",
    '{"state":{}}',
    "broken JSON",
  ])
    expect(() => validateSavedEnvelope(raw)).toThrow();
  expect(() => validateSavedEnvelope('{"version":1,"state":{}}')).not.toThrow();
});
it("retains the original raw save when an explicit reset write fails", () => {
  const backend = memory();
  backend.setItem("save", "original");
  const storage = createSafeStorage(
    () => backend,
    () => {},
  );
  storage.getItem("save");
  storage.block();
  backend.setItem = () => {
    throw Error("quota");
  };
  storage.recover();
  storage.setItem("save", "replacement");
  expect(storage.raw()).toBe("original");
  expect(storage.blocked()).toBe(true);
});

it("adds input preferences to older saves without discarding matches", () => {
  const saved = restorePersistedData(defaults);
  expect(saved.settings.entryMode).toBe("total");
  expect(saved.settings.keyboardMode).toBe("keypad");
  const next = restorePersistedData({
    ...defaults,
    settings: {
      ...defaults.settings,
      entryMode: "darts",
      keyboardMode: "keyboard",
    },
  });
  expect(next.settings.entryMode).toBe("darts");
  expect(next.settings.keyboardMode).toBe("keyboard");
  expect(() =>
    restorePersistedData({
      ...defaults,
      settings: { ...defaults.settings, entryMode: "invalid" },
    }),
  ).toThrow();
});
