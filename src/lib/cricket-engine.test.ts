import { describe, expect, it } from "vitest";
import {
  CRICKET_NUMBERS,
  createCricketGame,
  cricketLegWinner,
  cricketSummary,
  endCricketTurn,
  restoreCricketGame,
  throwCricketDart,
  undoCricketDart,
  undoCricketTurn,
  type CricketConfig,
  type CricketGame,
  type CricketStyle,
} from "./cricket-engine";
import type { Dart } from "./engine";

const S = (value: number): Dart => ({ value, multiplier: 1 });
const D = (value: number): Dart => ({ value, multiplier: 2 });
const T = (value: number): Dart => ({ value, multiplier: 3 });
const miss = S(0);

function config(
  style: CricketStyle = "standard",
  players = 2,
  legsToWin = 1,
): CricketConfig {
  return {
    style,
    legsToWin,
    players: Array.from({ length: players }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
    })),
  };
}
/** One visit: throw the darts, ending the turn early when fewer than three. */
function visit(game: CricketGame, darts: Dart[]): CricketGame {
  let g = game;
  for (const d of darts.length ? darts : [miss]) g = throwCricketDart(g, d);
  return darts.length < 3 ? endCricketTurn(g) : g;
}
const idx = (value: number) => (CRICKET_NUMBERS as readonly number[]).indexOf(value);

describe("configuration", () => {
  it("accepts 2 to 4 players and a positive leg count", () => {
    expect(() => createCricketGame(config("standard", 2))).not.toThrow();
    expect(() => createCricketGame(config("cutthroat", 4, 3))).not.toThrow();
  });
  it("rejects bad configurations", () => {
    expect(() => createCricketGame(config("standard", 1))).toThrow(RangeError);
    expect(() => createCricketGame(config("standard", 5))).toThrow(RangeError);
    expect(() => createCricketGame(config("standard", 2, 0))).toThrow(RangeError);
    expect(() =>
      createCricketGame({ ...config(), style: "nope" as CricketStyle }),
    ).toThrow(RangeError);
    const dup = config();
    dup.players[1].id = dup.players[0].id;
    expect(() => createCricketGame(dup)).toThrow(RangeError);
  });
});

describe("marks", () => {
  it("counts single, double and triple marks and closes at three", () => {
    let g = createCricketGame(config());
    g = throwCricketDart(g, S(20));
    g = throwCricketDart(g, D(20));
    expect(g.players[0].marks[idx(20)]).toBe(3);
    g = throwCricketDart(g, T(19));
    expect(g.players[0].marks[idx(19)]).toBe(3);
  });
  it("counts outer bull as one mark and inner bull as two", () => {
    let g = createCricketGame(config());
    g = throwCricketDart(g, S(25));
    expect(g.players[0].marks[idx(25)]).toBe(1);
    g = throwCricketDart(g, D(25));
    expect(g.players[0].marks[idx(25)]).toBe(3);
  });
  it("treats other segments as darts used with no marks", () => {
    let g = createCricketGame(config());
    g = throwCricketDart(g, T(14));
    expect(g.players[0].marks.every((m) => m === 0)).toBe(true);
    expect(g.turnDarts).toHaveLength(1);
    expect(g.players[0].points).toBe(0);
  });
  it("rejects illegal darts", () => {
    const g = createCricketGame(config());
    expect(() => throwCricketDart(g, T(25))).toThrow(RangeError);
    expect(() => throwCricketDart(g, { value: 21, multiplier: 1 })).toThrow(RangeError);
  });
});

describe("standard scoring", () => {
  it("scores overflow marks only while an opponent has not closed the number", () => {
    let g = createCricketGame(config());
    g = visit(g, [T(20), S(20)]);
    expect(g.players[0].points).toBe(20);
    g = visit(g, [T(20)]);
    g = visit(g, [S(20)]);
    expect(g.players[0].points).toBe(20);
  });
  it("scores the bull at 25 per overflow mark", () => {
    let g = createCricketGame(config());
    g = visit(g, [S(25), D(25), D(25)]);
    expect(g.players[0].points).toBe(50);
  });
});

describe("cut-throat scoring", () => {
  it("gives overflow points to opponents who have not closed the number", () => {
    let g = createCricketGame(config("cutthroat", 3));
    g = visit(g, []);
    g = visit(g, []);
    g = visit(g, [T(20)]);
    g = visit(g, [T(20), S(20)]);
    expect(g.players[0].points).toBe(0);
    expect(g.players[1].points).toBe(20);
    expect(g.players[2].points).toBe(0);
  });
});

describe("turns", () => {
  it("switches after three darts and on an early end of turn", () => {
    let g = createCricketGame(config());
    g = throwCricketDart(throwCricketDart(throwCricketDart(g, S(20)), S(19)), S(18));
    expect(g.activePlayer).toBe(1);
    g = throwCricketDart(g, S(20));
    g = endCricketTurn(g);
    expect(g.activePlayer).toBe(0);
  });
  it("ignores an end of turn with no darts thrown", () => {
    const g = createCricketGame(config());
    expect(endCricketTurn(g)).toBe(g);
  });
});

describe("winning", () => {
  function closeAll(g: CricketGame, other: Dart[][] = []) {
    const visits = [
      [T(20), T(19), T(18)],
      [T(17), T(16), T(15)],
      [S(25), D(25)],
    ];
    visits.forEach((v, n) => {
      g = visit(g, v);
      if (n < visits.length - 1) g = visit(g, other[n] ?? []);
    });
    return g;
  }
  it("wins on closing everything with equal points", () => {
    const g = closeAll(createCricketGame(config()));
    expect(g.status).toBe("complete");
    expect(g.winner).toBe(0);
  });
  it("keeps playing when a player has closed everything but trails", () => {
    // Player 2 banks points on 20 first, then Player 1 closes everything.
    let g = createCricketGame(config());
    g = visit(g, []);
    g = visit(g, [T(20), T(20), T(20)]);
    expect(g.players[1].points).toBe(120);
    g = closeAll(g);
    expect(g.players[0].closedAllAt).not.toBeNull();
    expect(g.status).toBe("playing");
  });
  it("breaks a stalled leg by best score, then by who closed first", () => {
    const closed = (points: number, at: number) => ({ points, closedAllAt: at });
    expect(cricketLegWinner([closed(40, 9), closed(120, 12)], "standard", 0)).toBe(1);
    expect(cricketLegWinner([closed(40, 9), closed(120, 12)], "cutthroat", 0)).toBe(0);
    expect(cricketLegWinner([closed(60, 12), closed(60, 9)], "standard", 0)).toBe(1);
    expect(cricketLegWinner([closed(60, 12), { points: 0, closedAllAt: null }], "standard", 1)).toBe(null);
  });
  it("wins cut-throat with the lowest score", () => {
    const players = [
      { points: 10, closedAllAt: 5 },
      { points: 40, closedAllAt: null },
    ];
    expect(cricketLegWinner(players, "cutthroat", 0)).toBe(0);
    expect(cricketLegWinner(players, "standard", 0)).toBe(null);
  });
});

describe("legs and matches", () => {
  it("rotates the starting player and completes at the leg target", () => {
    let g = createCricketGame(config("standard", 2, 2));
    g = visit(g, [T(20), T(19), T(18)]);
    g = visit(g, []);
    g = visit(g, [T(17), T(16), T(15)]);
    g = visit(g, []);
    g = visit(g, [S(25), D(25)]);
    expect(g.status).toBe("playing");
    expect(g.leg).toBe(2);
    expect(g.players[0].legs).toBe(1);
    expect(g.activePlayer).toBe(1);
    expect(g.players.every((p) => p.marks.every((m) => m === 0))).toBe(true);
  });
  it("undoing the leg-winning dart returns to the previous leg state", () => {
    let g = createCricketGame(config("standard", 2, 2));
    g = visit(g, [T(20), T(19), T(18)]);
    g = visit(g, []);
    g = visit(g, [T(17), T(16), T(15)]);
    g = visit(g, []);
    const before = g;
    g = visit(g, [S(25), D(25)]);
    expect(g.leg).toBe(2);
    const back = undoCricketTurn(g);
    expect(back.leg).toBe(1);
    expect(back.players[0].legs).toBe(0);
    expect(back.players[0].marks).toEqual(before.players[0].marks);
  });
  it("refuses events after completion when restoring", () => {
    let g = createCricketGame(config());
    g = visit(g, [T(20), T(19), T(18)]);
    g = visit(g, []);
    g = visit(g, [T(17), T(16), T(15)]);
    g = visit(g, []);
    g = visit(g, [S(25), D(25)]);
    expect(g.status).toBe("complete");
    expect(() =>
      restoreCricketGame(g.config, [...g.events, { type: "dart", dart: S(20) }]),
    ).toThrow(RangeError);
    expect(throwCricketDart(g, S(20))).toBe(g);
  });
});

describe("undo and restore", () => {
  it("undoes a dart and a turn by replay", () => {
    let g = createCricketGame(config());
    g = visit(g, [T(20), T(19), T(18)]);
    g = throwCricketDart(g, S(20));
    expect(undoCricketDart(g).events).toHaveLength(3);
    expect(undoCricketDart(g).activePlayer).toBe(1);
    expect(undoCricketTurn(g).events).toHaveLength(3);
    const afterFirst = undoCricketTurn(undoCricketTurn(g));
    expect(afterFirst.events).toHaveLength(0);
    expect(afterFirst.players[0].marks.every((m) => m === 0)).toBe(true);
  });
  it("undo also removes an explicit end of turn", () => {
    let g = createCricketGame(config());
    g = visit(g, [S(20)]);
    expect(g.activePlayer).toBe(1);
    const back = undoCricketDart(g);
    expect(back.activePlayer).toBe(0);
    expect(back.events).toHaveLength(0);
  });
  it("restoring the saved events rebuilds the same state", () => {
    let g = createCricketGame(config("cutthroat", 3));
    g = visit(g, [T(20), S(20), S(19)]);
    g = visit(g, [D(19), S(18)]);
    expect(restoreCricketGame(g.config, g.events)).toEqual(g);
  });
  it("rejects malformed saved events", () => {
    const c = config();
    expect(() => restoreCricketGame(c, [{ type: "visit" } as never])).toThrow(RangeError);
    expect(() => restoreCricketGame(c, [{ type: "dart" } as never])).toThrow(RangeError);
    expect(() =>
      restoreCricketGame(c, [{ type: "dart", dart: T(25) }]),
    ).toThrow(RangeError);
  });
});

describe("summary", () => {
  it("reports marks, darts and marks per round per player", () => {
    let g = createCricketGame(config());
    g = visit(g, [T(20), S(19), miss]);
    const [first, second] = cricketSummary(g);
    expect(first).toMatchObject({ darts: 3, marks: 4 });
    expect(first.marksPerRound).toBeCloseTo(4);
    expect(second).toMatchObject({ darts: 0, marks: 0, marksPerRound: 0 });
  });
});
