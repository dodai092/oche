import { describe, expect, it } from "vitest";
import {
  atcCurrent,
  atcStepLabel,
  atcSteps,
  atcSummary,
  createAtcGame,
  endAtcTurn,
  makeAtcOrder,
  restoreAtcGame,
  throwAtcDart,
  undoAtcDart,
  undoAtcTurn,
  type AtcConfig,
  type AtcGame,
} from "./atc-engine";
import type { Dart } from "./engine";

const S = (value: number): Dart => ({ value, multiplier: 1 });
const D = (value: number): Dart => ({ value, multiplier: 2 });
const T = (value: number): Dart => ({ value, multiplier: 3 });
const miss = S(0);
const lowHigh = makeAtcOrder("low-high", Math.random);

function config(overrides: Partial<AtcConfig> = {}, players = 2): AtcConfig {
  return {
    finish: "bullseye",
    field: "any",
    hitsPerTarget: 1,
    increase: false,
    orderMode: "low-high",
    order: lowHigh,
    legsToWin: 1,
    players: Array.from({ length: players }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
    })),
    ...overrides,
  };
}
const solo = (overrides: Partial<AtcConfig> = {}) =>
  createAtcGame(config(overrides, 1));
/** Throws the darts in visits of three, each ended with Submit. */
function throwAll(game: AtcGame, darts: Dart[]): AtcGame {
  let g = game;
  for (let i = 0; i < darts.length; i += 3) {
    for (const d of darts.slice(i, i + 3)) g = throwAtcDart(g, d);
    g = endAtcTurn(g);
  }
  return g;
}
/** Solo helper: clear numbers 1 to n inclusive with singles. */
function clearTo(game: AtcGame, n: number): AtcGame {
  return throwAll(
    game,
    Array.from({ length: n }, (_, i) => S(i + 1)),
  );
}
const target = (g: AtcGame, i = 0) => atcStepLabel(atcCurrent(g, i)!.step);

describe("order and steps", () => {
  it("builds low to high, high to low and a deterministic shuffle", () => {
    expect(makeAtcOrder("low-high", Math.random)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    expect(makeAtcOrder("high-low", Math.random)[0]).toBe(20);
    const a = makeAtcOrder("random", () => 0.5);
    const b = makeAtcOrder("random", () => 0.5);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(lowHigh);
    expect(a).not.toEqual(lowHigh);
  });
  it("adds one bull step, or two for the all finish", () => {
    expect(atcSteps(config({ finish: "single-bull" })).slice(20)).toEqual([
      { target: 25, bull: "any" },
    ]);
    expect(atcSteps(config({ finish: "bullseye" })).slice(20)).toEqual([
      { target: 25, bull: "inner" },
    ]);
    expect(atcSteps(config({ finish: "all" })).slice(20)).toEqual([
      { target: 25, bull: "outer" },
      { target: 25, bull: "inner" },
    ]);
  });
});

describe("configuration", () => {
  it("accepts 1 to 4 players", () => {
    expect(() => createAtcGame(config({}, 1))).not.toThrow();
    expect(() => createAtcGame(config({}, 4))).not.toThrow();
  });
  it("rejects bad configurations", () => {
    expect(() => createAtcGame(config({}, 0))).toThrow(RangeError);
    expect(() => createAtcGame(config({}, 5))).toThrow(RangeError);
    expect(() => createAtcGame(config({ hitsPerTarget: 4 }))).toThrow(RangeError);
    expect(() => createAtcGame(config({ hitsPerTarget: 0 }))).toThrow(RangeError);
    expect(() => createAtcGame(config({ legsToWin: 0 }))).toThrow(RangeError);
    expect(() => createAtcGame(config({ finish: "x" as never }))).toThrow(RangeError);
    expect(() => createAtcGame(config({ field: "x" as never }))).toThrow(RangeError);
    expect(() => createAtcGame(config({ order: lowHigh.slice(1) }))).toThrow(RangeError);
    expect(() =>
      createAtcGame(config({ order: [...lowHigh.slice(1), 2] })),
    ).toThrow(RangeError);
    const dup = config();
    dup.players[1].id = dup.players[0].id;
    expect(() => createAtcGame(dup)).toThrow(RangeError);
  });
});

describe("progress", () => {
  it("moves on only when the current number is hit", () => {
    let g = solo();
    expect(target(g)).toBe("1");
    g = throwAtcDart(g, S(2));
    expect(target(g)).toBe("1");
    g = throwAtcDart(g, S(1));
    expect(target(g)).toBe("2");
  });
  it("follows the chosen order", () => {
    const g = solo({ orderMode: "high-low", order: makeAtcOrder("high-low", Math.random) });
    expect(target(g)).toBe("20");
    expect(target(throwAtcDart(g, S(20)))).toBe("19");
  });
  it("lets a double or a treble count under the any field", () => {
    expect(target(throwAtcDart(solo(), D(1)))).toBe("2");
    expect(target(throwAtcDart(solo(), T(1)))).toBe("2");
  });
});

describe("target field", () => {
  it("accepts only the chosen multiplier", () => {
    const only = (field: "single" | "double" | "treble", ok: Dart, bad: Dart[]) => {
      let g = solo({ field });
      for (const d of bad) g = throwAtcDart(g, d);
      expect(target(g)).toBe("1");
      expect(target(throwAtcDart(g, ok))).toBe("2");
    };
    only("single", S(1), [D(1), T(1)]);
    only("double", D(1), [S(1), T(1)]);
    only("treble", T(1), [S(1), D(1)]);
  });
});

describe("hits per target", () => {
  it("needs the chosen number of hits and keeps them across turns", () => {
    let g = createAtcGame(config({ hitsPerTarget: 2 }));
    g = throwAtcDart(g, S(1));
    expect(atcCurrent(g, 0)!.hitsLeft).toBe(1);
    g = endAtcTurn(g);
    g = endAtcTurn(throwAtcDart(g, miss));
    expect(target(g, 0)).toBe("1");
    expect(atcCurrent(g, 0)!.hitsLeft).toBe(1);
    g = throwAtcDart(g, S(1));
    expect(target(g, 0)).toBe("2");
  });
});

describe("increase by segment", () => {
  const inc = (overrides: Partial<AtcConfig> = {}) =>
    solo({ increase: true, ...overrides });
  it("moves a double two numbers and a treble three", () => {
    expect(target(throwAtcDart(inc(), D(1)))).toBe("3");
    expect(target(throwAtcDart(inc(), T(1)))).toBe("4");
    expect(target(throwAtcDart(inc(), S(1)))).toBe("2");
  });
  it("rolls surplus hits on when more than one hit is needed", () => {
    const g = throwAtcDart(inc({ hitsPerTarget: 2 }), T(1));
    expect(target(g)).toBe("2");
    expect(atcCurrent(g, 0)!.hitsLeft).toBe(1);
    const h = throwAtcDart(inc({ hitsPerTarget: 3 }), D(1));
    expect(target(h)).toBe("1");
    expect(atcCurrent(h, 0)!.hitsLeft).toBe(1);
  });
  it("does not skip numbers when the toggle is off", () => {
    expect(target(throwAtcDart(solo(), T(1)))).toBe("2");
  });
  it("stops at the bull step and drops surplus past the last number", () => {
    const at19 = clearTo(inc(), 18);
    expect(target(at19)).toBe("19");
    const afterTreble = throwAtcDart(at19, T(19));
    expect(target(afterTreble)).toBe("Bullseye");
    expect(afterTreble.status).toBe("playing");
    const at20 = clearTo(inc(), 19);
    expect(target(throwAtcDart(at20, T(20)))).toBe("Bullseye");
  });
});

describe("finish options", () => {
  const atBull = (finish: "single-bull" | "bullseye" | "all") =>
    clearTo(solo({ finish }), 20);
  it("single bull is won by the outer or the inner bull", () => {
    expect(throwAtcDart(atBull("single-bull"), S(25)).status).toBe("complete");
    expect(throwAtcDart(atBull("single-bull"), D(25)).status).toBe("complete");
  });
  it("bullseye is won only by the inner bull", () => {
    const g = atBull("bullseye");
    expect(target(g)).toBe("Bullseye");
    expect(throwAtcDart(g, S(25)).status).toBe("playing");
    expect(throwAtcDart(g, D(25)).status).toBe("complete");
  });
  it("all needs the outer bull and then the inner bull", () => {
    let g = atBull("all");
    expect(target(g)).toBe("Outer bull");
    g = throwAtcDart(g, D(25));
    expect(target(g)).toBe("Outer bull");
    g = throwAtcDart(g, S(25));
    expect(target(g)).toBe("Bullseye");
    expect(throwAtcDart(g, S(25)).status).toBe("playing");
    expect(throwAtcDart(g, D(25)).status).toBe("complete");
  });
  it("ignores the field setting on the bull", () => {
    const g = clearTo(solo({ field: "treble", finish: "single-bull" }), 0);
    const ready = throwAll(
      g,
      Array.from({ length: 20 }, (_, i) => T(i + 1)),
    );
    expect(throwAtcDart(ready, S(25)).status).toBe("complete");
  });
});

describe("turns, legs and winning", () => {
  it("wins as soon as the last step is hit, even mid-turn", () => {
    let g = createAtcGame(config({ finish: "single-bull" }, 1));
    for (let n = 1; n <= 20; n++) {
      g = throwAtcDart(g, S(n));
      if (g.turnDarts.length === 3) g = endAtcTurn(g);
    }
    expect(g.turnDarts).toHaveLength(2);
    g = throwAtcDart(g, S(25));
    expect(g.status).toBe("complete");
    expect(g.winner).toBe(0);
  });
  it("holds the visit at three darts until it is ended, then switches", () => {
    let g = createAtcGame(config());
    g = [miss, miss, miss].reduce((x, d) => throwAtcDart(x, d), g);
    expect(g.activePlayer).toBe(0);
    expect(throwAtcDart(g, miss)).toBe(g);
    g = endAtcTurn(g);
    expect(g.activePlayer).toBe(1);
    g = endAtcTurn(throwAtcDart(g, miss));
    expect(g.activePlayer).toBe(0);
  });
  it("tracks each player on their own", () => {
    let g = createAtcGame(config());
    g = throwAll(g, [S(1), S(2), S(3)]);
    g = throwAll(g, [miss, miss, miss]);
    expect(target(g, 0)).toBe("4");
    expect(target(g, 1)).toBe("1");
  });
  it("rotates the starter and resets positions after a leg", () => {
    let g = createAtcGame(config({ finish: "single-bull", legsToWin: 2 }, 2));
    // Player 1 clears 1..20 and the bull while Player 2 only misses.
    const mine: Dart[] = [...Array.from({ length: 20 }, (_, i) => S(i + 1)), S(25)];
    for (let i = 0; i < mine.length; i += 3) {
      g = throwAll(g, mine.slice(i, i + 3));
      if (g.status === "playing" && g.leg === 1) g = throwAll(g, [miss, miss, miss]);
    }
    expect(g.leg).toBe(2);
    expect(g.players[0].legs).toBe(1);
    expect(g.activePlayer).toBe(1);
    expect(g.players.every((p) => p.step === 0)).toBe(true);
  });
  it("completes the match at the leg target and refuses further events", () => {
    let g = clearTo(solo({ finish: "single-bull" }), 20);
    g = throwAtcDart(g, S(25));
    expect(g.status).toBe("complete");
    expect(throwAtcDart(g, S(1))).toBe(g);
    expect(() =>
      restoreAtcGame(g.config, [...g.events, { type: "dart", dart: S(1) }]),
    ).toThrow(RangeError);
  });
});

describe("undo and restore", () => {
  it("undoes a dart and a turn by replay", () => {
    let g = createAtcGame(config());
    g = throwAll(g, [S(1), S(2), S(3)]);
    g = throwAtcDart(g, miss);
    expect(undoAtcDart(g).events).toHaveLength(4);
    expect(undoAtcDart(g).activePlayer).toBe(1);
    expect(undoAtcTurn(g).events).toHaveLength(4);
    const first = undoAtcTurn(undoAtcTurn(g));
    expect(first.events).toHaveLength(0);
    expect(target(first)).toBe("1");
  });
  it("undo also removes an explicit end of turn", () => {
    let g = createAtcGame(config());
    g = endAtcTurn(throwAtcDart(g, S(1)));
    expect(g.activePlayer).toBe(1);
    const back = undoAtcDart(g);
    expect(back.activePlayer).toBe(0);
    expect(back.events).toHaveLength(0);
  });
  it("undoing the winning dart restores the position", () => {
    const before = clearTo(solo({ finish: "single-bull" }), 20);
    const won = throwAtcDart(before, S(25));
    expect(won.status).toBe("complete");
    const back = undoAtcDart(won);
    expect(back.status).toBe("playing");
    expect(back.winner).toBeNull();
    expect(back.players[0].legs).toBe(0);
    expect(target(back)).toBe("Bull");
  });
  it("restoring the saved events rebuilds the same state", () => {
    let g = createAtcGame(
      config({ increase: true, hitsPerTarget: 2, field: "any" }, 3),
    );
    g = throwAll(g, [S(1), D(1), T(2)]);
    g = endAtcTurn(throwAtcDart(g, S(1)));
    expect(restoreAtcGame(g.config, g.events)).toEqual(g);
  });
  it("rejects malformed saved events", () => {
    const c = config();
    expect(() => restoreAtcGame(c, [{ type: "visit" } as never])).toThrow(RangeError);
    expect(() => restoreAtcGame(c, [{ type: "dart" } as never])).toThrow(RangeError);
    expect(() =>
      restoreAtcGame(c, [{ type: "dart", dart: T(25) }]),
    ).toThrow(RangeError);
  });
});

describe("summary", () => {
  it("reports darts, hits and hit rate, counting unthrown darts as misses", () => {
    let g = createAtcGame(config());
    g = endAtcTurn(throwAll(g, [S(1), miss]));
    const [first, second] = atcSummary(g);
    expect(first).toMatchObject({ darts: 3, hits: 1 });
    expect(first.hitRate).toBeCloseTo(1 / 3);
    expect(second).toMatchObject({ darts: 0, hits: 0, hitRate: 0 });
  });
});
