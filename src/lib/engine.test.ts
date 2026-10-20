import { describe, expect, it } from "vitest";
import {
  createGame,
  submitVisit,
  restoreGame,
  throwDart,
  endTurn,
  undoDart,
  undoTurn,
  checkoutSuggestions,
  dartLabel,
  playerStats,
  type Dart,
  type GameState,
  type MatchConfig,
} from "./engine";
const config = (overrides: Partial<MatchConfig> = {}): MatchConfig => ({
  startScore: 301,
  doubleOut: true,
  legsToWin: 1,
  setsToWin: 1,
  players: [{ id: "a", name: "A" }],
  ...overrides,
});
const d = (value: number, multiplier: 1 | 2 | 3 = 1): Dart => ({
  value,
  multiplier,
});
const hit = (g: GameState, ...darts: Dart[]) => darts.reduce(throwDart, g);
const leave = (score: number, overrides: Partial<MatchConfig> = {}) => {
  let g = createGame(config(overrides));
  let remaining = 301 - score;
  while (remaining > 0) {
    const n = Math.min(20, remaining);
    g = throwDart(g, d(n));
    remaining -= n;
  }
  return endTurn(g);
};
describe("x01 engine", () => {
  it.each([301, 501, 701] as const)(
    "starts %i with up to four players",
    (startScore) => {
      const g = createGame(
        config({
          startScore,
          players: ["a", "b", "c", "d"].map((id) => ({ id, name: id })),
        }),
      );
      expect(g.players.map((p) => p.score)).toEqual([
        startScore,
        startScore,
        startScore,
        startScore,
      ]);
      expect(g.activePlayer).toBe(0);
    },
  );
  it("validates configuration and dart board values", () => {
    expect(() => createGame(config({ players: [] }))).toThrow();
    expect(() => createGame(config({ legsToWin: 0 }))).toThrow();
    const g = createGame(config());
    for (const dart of [d(0, 2), d(25, 3), d(21), d(-1), d(1.5)])
      expect(() => throwDart(g, dart)).toThrow();
    expect(hit(g, d(0), d(25), d(25, 2)).players[0].score).toBe(226);
  });
  it("scores immediately, caps visits at three and never mutates inputs", () => {
    const g = createGame(
      config({
        players: [
          { id: "a", name: "A" },
          { id: "b", name: "B" },
        ],
      }),
    );
    const next = throwDart(g, d(20, 3));
    expect(g.players[0].score).toBe(301);
    expect(next.players[0].score).toBe(241);
    const done = hit(next, d(20, 3), d(20, 3));
    expect(done.activePlayer).toBe(1);
    expect(done.turnDarts).toEqual([]);
    expect(done.turns[0]).toMatchObject({
      startScore: 301,
      endScore: 121,
      complete: true,
      bust: false,
    });
    expect(throwDart(done, d(1)).players[1].score).toBe(300);
  });
  it("ends early without inventing darts and treats empty end-turn as a no-op", () => {
    const g = createGame(config());
    expect(endTurn(g)).toEqual(g);
    const done = endTurn(throwDart(g, d(20)));
    expect(done.turns[0].darts).toHaveLength(1);
    expect(playerStats(done, 0)).toMatchObject({
      darts: 1,
      points: 20,
      average: 60,
    });
  });
  it.each([
    [40, d(20), d(20)],
    [40, d(19), d(20)],
    [40, d(20), d(25, 2)],
  ] as const)(
    "restores the full visit on invalid finish or overshoot from %i",
    (score, a, b) => {
      const g = hit(leave(score), a, b);
      expect(g.players[0].score).toBe(40);
      expect(g.turns.at(-1)).toMatchObject({ bust: true, endScore: 40 });
    },
  );
  it("allows single-out one and bull double-out, and locks completed matches", () => {
    const single = throwDart(leave(1, { doubleOut: false }), d(1));
    expect(single.status).toBe("complete");
    const bull = throwDart(leave(50), d(25, 2));
    expect(bull).toMatchObject({ status: "complete", winner: 0 });
    expect(throwDart(bull, d(20))).toEqual(bull);
    expect(endTurn(bull)).toEqual(bull);
  });
  it("rotates starters globally across legs and sets, resets legs on set win", () => {
    let g = createGame(
      config({
        doubleOut: false,
        legsToWin: 1,
        setsToWin: 2,
        players: [
          { id: "a", name: "A" },
          { id: "b", name: "B" },
        ],
      }),
    );
    // A scores 180, B passes with a miss, A finishes 121.
    g = hit(g, d(20, 3), d(20, 3), d(20, 3));
    g = endTurn(throwDart(g, d(0)));
    g = hit(g, d(20, 3), d(20, 3), d(1));
    expect(g).toMatchObject({
      leg: 2,
      set: 2,
      activePlayer: 1,
      status: "playing",
    });
    expect(g.players.map((p) => [p.score, p.legs, p.sets])).toEqual([
      [301, 0, 1],
      [301, 0, 0],
    ]);
    g = hit(g, d(20, 3), d(20, 3), d(20, 3));
    g = endTurn(throwDart(g, d(0)));
    g = hit(g, d(20, 3), d(20, 3), d(1));
    expect(g).toMatchObject({ leg: 3, set: 3, activePlayer: 0 });
    g = hit(g, d(20, 3), d(20, 3), d(20, 3));
    g = endTurn(throwDart(g, d(0)));
    g = hit(g, d(20, 3), d(20, 3), d(1));
    expect(g).toMatchObject({ status: "complete", winner: 0 });
  });
  it("undo replays darts, early-end boundaries, busts and winning darts", () => {
    const start = leave(40);
    const won = throwDart(start, d(20, 2));
    expect(undoDart(won)).toEqual(start);
    expect(undoTurn(won)).toEqual(start);
    const partial = throwDart(start, d(10));
    expect(undoDart(endTurn(partial))).toEqual(start);
    expect(undoTurn(partial)).toEqual(start);
    expect(undoDart(hit(start, d(20), d(20)))).toEqual(throwDart(start, d(20)));
    expect(undoDart(createGame(config()))).toEqual(createGame(config()));
  });
  it("counts 180s, live points and first nine separately per leg", () => {
    let g = createGame(config({ startScore: 701 }));
    g = hit(g, ...Array.from({ length: 9 }, () => d(20, 3)));
    g = throwDart(g, d(20));
    expect(playerStats(g, 0)).toMatchObject({
      oneEighties: 3,
      darts: 10,
      points: 560,
      average: 168,
      first9: 180,
    });
  });
  it("counts a first-dart bust as three darts and detects missed finish opportunities", () => {
    const before = leave(40);
    const bust = throwDart(before, d(20, 3));
    const a = playerStats(before, 0),
      b = playerStats(bust, 0);
    expect(b.darts - a.darts).toBe(3);
    expect(b.points).toBe(a.points);
    const won = hit(before, d(0), d(20, 2));
    const stats = playerStats(won, 0);
    expect(stats.checkoutAttempts).toBe(2);
    expect(stats.checkoutPercentage).toBe(50);
    expect(stats.checkouts).toBe(1);
  });
  it("returns shortest valid high-scoring checkout routes and labels", () => {
    expect(checkoutSuggestions(170, 3, true)).toEqual([
      d(20, 3),
      d(20, 3),
      d(25, 2),
    ]);
    expect(checkoutSuggestions(100, 3, true)).toEqual([d(20, 3), d(20, 2)]);
    expect(checkoutSuggestions(60, 3, false)).toEqual([d(20, 3)]);
    for (const score of [169, 168, 166, 165, 163, 162, 159])
      expect(checkoutSuggestions(score, 3, true)).toEqual([]);
    expect(checkoutSuggestions(1, 3, true)).toEqual([]);
    expect(checkoutSuggestions(40, 0, true)).toEqual([]);
    expect([
      dartLabel(d(0)),
      dartLabel(d(20, 3)),
      dartLabel(d(20, 2)),
      dartLabel(d(25)),
      dartLabel(d(25, 2)),
    ]).toEqual(["Miss", "T20", "D20", "Outer bull", "Bullseye"]);
  });
  it("rotates four players in order and skips nobody on a bust", () => {
    let g = createGame(
      config({ players: ["a", "b", "c", "d"].map((id) => ({ id, name: id })) }),
    );
    for (const next of [1, 2, 3, 0]) {
      g = hit(g, d(20, 3), d(20, 3), d(20, 3));
      expect(g.activePlayer).toBe(next);
    }
    // A has 121: 60 + 60 leaves one and busts on dart two.
    g = hit(g, d(20, 3), d(20, 3));
    expect(g.activePlayer).toBe(1);
    expect(g.players[0].score).toBe(121);
    expect(g.turns.at(-1)?.darts).toHaveLength(2);
    expect(playerStats(g, 0)).toMatchObject({
      darts: 6,
      points: 180,
      average: 90,
      first9: 90,
    });
  });
  it("keeps a live visit in history and undoes the whole latest three-dart visit", () => {
    const base = createGame(config());
    const one = throwDart(base, d(20, 3));
    expect(one.turns[0]).toMatchObject({ complete: false, endScore: 241 });
    const full = hit(one, d(20, 3), d(20, 3));
    expect(undoTurn(full)).toEqual(base);
    expect(undoDart(full)).toEqual(hit(base, d(20, 3), d(20, 3)));
    expect(undoTurn(endTurn(one))).toEqual(base);
  });
  it("resets first-nine quota per leg and retains match stats after advancing", () => {
    let g = createGame(config({ legsToWin: 2 }));
    g = hit(g, d(20, 3), d(20, 3), d(20, 3), d(20, 3), d(11), d(25, 2));
    expect(g).toMatchObject({ leg: 2, status: "playing" });
    expect(g.players[0]).toMatchObject({ score: 301, legs: 1 });
    g = throwDart(g, d(20, 3));
    expect(playerStats(g, 0)).toMatchObject({
      darts: 7,
      points: 361,
      oneEighties: 1,
      checkouts: 1,
    });
    expect(playerStats(g, 0).first9).toBeCloseTo((361 / 7) * 3);
    const extended = hit(g, d(20, 3), d(20, 3), d(20, 3));
    expect(playerStats(extended, 0).first9).toBeCloseTo((541 / 10) * 3);
    expect(undoDart(g).leg).toBe(2);
    const reopened = undoDart(undoDart(g));
    expect(reopened).toMatchObject({
      leg: 1,
      status: "playing",
      turnDarts: [d(20, 3), d(11)],
    });
    expect(reopened.players[0]).toMatchObject({ score: 50, legs: 0 });
  });
  it("rejects malformed config, counts miss labels and isolates input references", () => {
    for (const overrides of [
      {
        players: Array.from({ length: 5 }, (_, i) => ({
          id: String(i),
          name: "X",
        })),
      },
      {
        players: [
          { id: "a", name: "A" },
          { id: "a", name: "B" },
        ],
      },
      { legsToWin: 1.5 },
      { setsToWin: 0 },
    ])
      expect(() => createGame(config(overrides))).toThrow();
    const c = config();
    const g = createGame(c);
    c.players[0].name = "Changed";
    const dart = d(20);
    const next = throwDart(g, dart);
    dart.value = 1;
    expect(next.config.players[0].name).toBe("A");
    expect(next.events).toEqual([{ type: "dart", dart: d(20) }]);
    expect(playerStats(createGame(config()), 0)).toEqual({
      average: 0,
      first9: 0,
      oneEighties: 0,
      checkoutAttempts: 0,
      checkoutPercentage: 0,
      darts: 0,
      points: 0,
      checkouts: 0,
    });
  });
  it("suggests legal finishes across the entire checkout range", () => {
    for (const doubleOut of [true, false])
      for (let score = 1; score <= 180; score++) {
        const route = checkoutSuggestions(score, 3, doubleOut);
        if (!route.length) continue;
        expect(route.length).toBeLessThanOrEqual(3);
        expect(
          route.reduce((sum, dart) => sum + dart.value * dart.multiplier, 0),
        ).toBe(score);
        if (doubleOut) expect(route.at(-1)?.multiplier).toBe(2);
        for (let limit = 1; limit < route.length; limit++)
          expect(checkoutSuggestions(score, limit, doubleOut)).toEqual([]);
        let remaining = score;
        for (const dart of route.slice(0, -1)) {
          remaining -= dart.value * dart.multiplier;
          expect(remaining).toBeGreaterThan(doubleOut ? 1 : 0);
        }
      }
    expect(checkoutSuggestions(50, 1, true)).toEqual([d(25, 2)]);
    expect(checkoutSuggestions(2, 1, true)).toEqual([d(1, 2)]);
    expect(checkoutSuggestions(171, 3, true)).toEqual([]);
  });
});

describe("typed visit totals", () => {
  it("records a whole visit without inventing segments and rotates players", () => {
    const base = createGame(
      config({
        startScore: 501,
        players: [
          { id: "a", name: "A" },
          { id: "b", name: "B" },
        ],
      }),
    );
    const game = submitVisit(base, 180);
    expect(game.players[0].score).toBe(321);
    expect(game.activePlayer).toBe(1);
    expect(game.turns[0]).toMatchObject({
      darts: [],
      visitScore: 180,
      dartsUsed: 3,
      complete: true,
    });
    expect(playerStats(game, 0)).toMatchObject({
      darts: 3,
      points: 180,
      average: 180,
      oneEighties: 1,
      first9: 180,
    });
    expect(undoDart(game)).toEqual(base);
    expect(undoTurn(game)).toEqual(base);
    expect(base.events).toEqual([]);
    expect(restoreGame(game.config, game.events)).toEqual(game);
  });
  it("rejects impossible totals, invalid counts and mixed partial visits", () => {
    const base = createGame(config());
    for (const score of [-1, 181, 179, 178, 1.5, NaN])
      expect(() => submitVisit(base, score)).toThrow();
    expect(() => submitVisit(base, 100, { dartsUsed: 1 })).toThrow();
    expect(() => submitVisit(base, 20, { dartsUsed: 0 })).toThrow();
    expect(() => submitVisit(base, 20, { checkoutAttempts: 4 })).toThrow();
    expect(() => submitVisit(throwDart(base, d(20)), 60)).toThrow(
      "Finish or undo",
    );
  });
  it("handles zero visits and busts without losing undo history", () => {
    const base = submitVisit(createGame(config()), 180);
    const zero = submitVisit(base, 0);
    expect(playerStats(zero, 0).darts).toBe(6);
    for (const score of [120, 141]) {
      const bust = submitVisit(base, score);
      expect(bust.players[0].score).toBe(121);
      expect(bust.notice).toBe("Bust");
      expect(undoDart(bust)).toEqual(base);
    }
  });
  it("requires double-out confirmation and a feasible finish within darts used", () => {
    const base = submitVisit(createGame(config()), 180);
    expect(submitVisit(base, 121).notice).toBe("Bust");
    expect(() =>
      submitVisit(base, 121, { dartsUsed: 2, checkoutConfirmed: true }),
    ).toThrow();
    const won = submitVisit(base, 121, {
      dartsUsed: 3,
      checkoutConfirmed: true,
      checkoutAttempts: 2,
    });
    expect(won.status).toBe("complete");
    expect(playerStats(won, 0)).toMatchObject({
      darts: 6,
      points: 301,
      checkoutAttempts: 2,
      checkouts: 1,
      checkoutPercentage: 50,
    });
    expect(undoDart(won)).toEqual(base);
    expect(submitVisit(won, 20)).toEqual(won);
  });
  it("handles bull finishes, single out and leg transitions", () => {
    const base = leave(50);
    const won = submitVisit(base, 50, {
      dartsUsed: 1,
      checkoutConfirmed: true,
    });
    expect(won.status).toBe("complete");
    const single = submitVisit(
      createGame(config({ doubleOut: false, legsToWin: 2 })),
      180,
    );
    const next = submitVisit(single, 121);
    expect(next.leg).toBe(2);
    expect(next.players[0].score).toBe(301);
    expect(undoTurn(next)).toEqual(single);
  });
  it("restores mixed totals and dart events, including undoing an explicit early end", () => {
    const total = submitVisit(createGame(config({ startScore: 501 })), 100);
    const partial = throwDart(total, d(20));
    expect(undoTurn(endTurn(partial))).toEqual(total);
    expect(restoreGame(partial.config, partial.events)).toEqual(partial);
    expect(() =>
      restoreGame(total.config, [
        {
          type: "visit",
          score: 179,
          dartsUsed: 3,
          checkoutConfirmed: false,
          checkoutAttempts: 0,
        },
      ]),
    ).toThrow();
  });
});

it("marks first-nine unavailable when a total straddles dart nine", () => {
  let game = createGame(config({ startScore: 501 }));
  for (let i = 0; i < 8; i++) game = throwDart(game, d(0));
  game = endTurn(game);
  game = submitVisit(game, 100);
  expect(playerStats(game, 0).first9).toBeNull();
  expect(playerStats(game, 0).average).toBeCloseTo(300 / 11);
});
it("rejects every trailing event after a completed match during restore", () => {
  const won = submitVisit(leave(40), 40, {
    dartsUsed: 1,
    checkoutConfirmed: true,
  });
  expect(() =>
    restoreGame(won.config, [...won.events, { type: "visit" } as never]),
  ).toThrow();
  expect(() =>
    restoreGame(won.config, [...won.events, { type: "end-turn" }]),
  ).toThrow();
});
