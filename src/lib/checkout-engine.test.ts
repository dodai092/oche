import { describe, expect, it } from "vitest";
import {
  checkoutSummary,
  createCheckoutGame,
  endCheckoutRun,
  endCheckoutTurn,
  isCheckable,
  nextTarget,
  restoreCheckoutGame,
  throwCheckoutDart,
  undoCheckoutDart,
  undoCheckoutTurn,
  type CheckoutConfig,
  type CheckoutGame,
} from "./checkout-engine";
import type { Dart } from "./engine";

const S = (value: number): Dart => ({ value, multiplier: 1 });
const D = (value: number): Dart => ({ value, multiplier: 2 });
const T = (value: number): Dart => ({ value, multiplier: 3 });
const miss = S(0);

/** Default: start 40 (a single double 20), 3 darts per attempt, 10 rounds. */
function config(overrides: Partial<CheckoutConfig> = {}, players = 1): CheckoutConfig {
  return {
    startTarget: 40,
    dartsPerAttempt: 3,
    rounds: 10,
    players: Array.from({ length: players }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
    })),
    ...overrides,
  };
}
const game = (overrides: Partial<CheckoutConfig> = {}, players = 1) =>
  createCheckoutGame(config(overrides, players));
function throwAll(g: CheckoutGame, darts: Dart[]): CheckoutGame {
  return darts.reduce((acc, d) => throwCheckoutDart(acc, d), g);
}

describe("checkable targets", () => {
  it("knows exactly which totals from 2 to 170 cannot be checked out", () => {
    const impossible = Array.from({ length: 169 }, (_, i) => i + 2).filter(
      (n) => !isCheckable(n),
    );
    expect(impossible).toEqual([159, 162, 163, 165, 166, 168, 169]);
    expect(isCheckable(1)).toBe(false);
    expect(isCheckable(171)).toBe(false);
    expect(isCheckable(40.5)).toBe(false);
  });
  it("raises the target by one and never skips", () => {
    expect(nextTarget(121)).toBe(122);
    expect(nextTarget(158)).toBe(159);
  });
});

describe("configuration", () => {
  it("accepts a normal setup", () => {
    expect(() => createCheckoutGame(config({ startTarget: 121 }, 4))).not.toThrow();
    expect(() => createCheckoutGame(config({ rounds: "infinite" }))).not.toThrow();
    expect(() => createCheckoutGame(config({ dartsPerAttempt: 15, rounds: 99 }))).not.toThrow();
  });
  it("rejects bad configurations", () => {
    expect(() => createCheckoutGame(config({ startTarget: 159 }))).toThrow(RangeError);
    expect(() => createCheckoutGame(config({ startTarget: 171 }))).toThrow(RangeError);
    expect(() => createCheckoutGame(config({ startTarget: 1 }))).toThrow(RangeError);
    expect(() => createCheckoutGame(config({ dartsPerAttempt: 4 }))).toThrow(RangeError);
    expect(() => createCheckoutGame(config({ rounds: 0 }))).toThrow(RangeError);
    expect(() => createCheckoutGame(config({ rounds: 100 }))).toThrow(RangeError);
    expect(() => createCheckoutGame(config({ rounds: 2.5 }))).toThrow(RangeError);
    expect(() => createCheckoutGame(config({ rounds: "forever" as never }))).toThrow(RangeError);
    expect(() => createCheckoutGame(config({}, 0))).toThrow(RangeError);
    expect(() => createCheckoutGame(config({}, 5))).toThrow(RangeError);
    const dup = config({}, 2);
    dup.players[1].id = dup.players[0].id;
    expect(() => createCheckoutGame(dup)).toThrow(RangeError);
  });
});

describe("clearing a target", () => {
  it("ends the attempt on the checkout dart and raises the target", () => {
    const g = throwCheckoutDart(game(), D(20));
    expect(g.attempts).toEqual([
      { number: 1, target: 40, darts: 1, outcome: "cleared", by: 0 },
    ]);
    expect(g.best).toBe(40);
    expect(g.target).toBe(41);
    expect(g.remaining).toBe(41);
    expect(g.attempt).toBe(2);
    expect(g.dartsUsed).toBe(0);
    expect(g.status).toBe("playing");
    expect(g.notice).toBe("Cleared 40 in 1 dart.");
  });
  it("counts the bullseye as a double", () => {
    const g = throwCheckoutDart(game({ startTarget: 50 }), D(25));
    expect(g.best).toBe(50);
  });
  it("clears over several darts and turns", () => {
    const g = throwAll(game({ dartsPerAttempt: 6, startTarget: 100 }), [
      T(20), // 40 left
      miss,
      miss,
      S(20), // 20 left
      D(10),
    ]);
    expect(g.attempts[0]).toMatchObject({ target: 100, darts: 5, outcome: "cleared" });
  });
});

describe("double out and bust", () => {
  it("is a bust to finish on a single, and the remaining score goes back", () => {
    const g = throwAll(game({ dartsPerAttempt: 6 }), [S(20), S(20)]);
    expect(g.remaining).toBe(40);
    expect(g.turns[0]).toMatchObject({ bust: true, unthrown: 1, complete: true });
    // The bust burned the unthrown dart: 3 of 6 used, attempt still open.
    expect(g.dartsUsed).toBe(3);
    expect(g.attempt).toBe(1);
    expect(g.turnDarts).toEqual([]);
    const cleared = throwCheckoutDart(g, D(20));
    expect(cleared.attempts[0]).toMatchObject({ darts: 4, outcome: "cleared" });
  });
  it("is a bust to land on 1 or go below zero", () => {
    const on1 = throwAll(game({ dartsPerAttempt: 6 }), [S(19), S(20)]);
    expect(on1.remaining).toBe(40);
    expect(on1.turns[0].bust).toBe(true);
    const below = throwCheckoutDart(game({ dartsPerAttempt: 6 }), T(20));
    expect(below.remaining).toBe(40);
    expect(below.turns[0].bust).toBe(true);
  });
  it("restores the score from the start of the turn, not the attempt", () => {
    const g = throwAll(game({ dartsPerAttempt: 9, startTarget: 100 }), [
      miss,
      miss,
      miss, // turn 1, still 100
      T(20), // 40 left
      S(20), // 20 left
      S(20), // zero on a single: bust, back to 100 (turn start)
    ]);
    expect(g.remaining).toBe(100);
  });
  it("fails the attempt when a bust burns the last darts", () => {
    const g = throwAll(game({ dartsPerAttempt: 3 }), [S(20), S(20)]);
    expect(g.attempts[0]).toMatchObject({ outcome: "missed", darts: 3, by: null });
    expect(g.attempt).toBe(2);
  });
});

describe("missing a target and the safehouse", () => {
  it("falls back to the start target when nothing was banked", () => {
    const g = throwAll(game(), [miss, miss, miss]);
    expect(g.attempts[0].outcome).toBe("missed");
    expect(g.target).toBe(40);
    expect(g.notice).toBe("Missed 40. Back to 40.");
  });
  it("moves the safehouse up for a checkout in three darts or fewer", () => {
    let g = throwCheckoutDart(game(), D(20)); // 40 in 1 dart
    g = throwAll(g, [S(1), D(20)]); // 41 in 2 darts
    expect(g.best).toBe(41);
    expect(g.safehouse).toBe(41);
    expect(g.target).toBe(42);
    g = throwAll(g, [miss, miss, miss]);
    expect(g.target).toBe(41);
  });
  it("does not move the safehouse for a checkout that took more than three darts", () => {
    let g = game({ dartsPerAttempt: 6 });
    g = throwCheckoutDart(g, D(20)); // 40 in 1 dart, safehouse 40
    g = throwAll(g, [miss, miss, miss, S(1), D(20)]); // 41 in 5 darts
    expect(g.best).toBe(41);
    expect(g.safehouse).toBe(40);
    expect(g.target).toBe(42);
    g = throwAll(g, [miss, miss, miss, miss, miss, miss]);
    expect(g.attempts.at(-1)).toMatchObject({ target: 42, outcome: "missed" });
    expect(g.target).toBe(40);
  });
  it("cannot clear 159 in three darts, but can in six", () => {
    const at158 = throwAll(game({ startTarget: 158 }), [T(20), T(20), D(19)]);
    expect(at158.target).toBe(159);
    const failed = throwAll(at158, [T(20), T(20), D(19)]);
    expect(failed.attempts.at(-1)).toMatchObject({ target: 159, outcome: "missed" });
    expect(failed.target).toBe(158);

    const six = throwAll(game({ startTarget: 158, dartsPerAttempt: 6 }), [T(20), T(20), D(19)]);
    const cleared = throwAll(six, [T(20), T(20), S(19), D(10)]);
    expect(cleared.attempts.at(-1)).toMatchObject({ target: 159, darts: 4, outcome: "cleared" });
    expect(cleared.target).toBe(160);
  });
});

describe("turns", () => {
  it("burns unthrown darts on an early end of turn", () => {
    const g = endCheckoutTurn(throwAll(game({ dartsPerAttempt: 6 }, 2), [miss]));
    expect(g.dartsUsed).toBe(3);
    expect(g.activePlayer).toBe(1);
    expect(g.turns[0]).toMatchObject({ unthrown: 2, complete: true });
    expect(g.attempt).toBe(1);
  });
  it("ends the attempt when the early end uses up the budget", () => {
    const g = endCheckoutTurn(throwAll(game(), [miss]));
    expect(g.attempts[0]).toMatchObject({ outcome: "missed", darts: 3 });
  });
  it("ignores an end of turn before the first dart of a turn", () => {
    const g = game();
    expect(endCheckoutTurn(g)).toBe(g);
  });
  it("alternates players on one shared score and one shared budget", () => {
    let g = game({ startTarget: 100, dartsPerAttempt: 6 }, 2);
    g = throwAll(g, [T(20), miss, miss]);
    expect(g.activePlayer).toBe(1);
    expect(g.remaining).toBe(40);
    g = throwAll(g, [D(20)]);
    expect(g.attempts[0]).toMatchObject({ by: 1, darts: 4, outcome: "cleared" });
  });
  it("starts the next attempt with the player after the last thrower", () => {
    let g = game({ dartsPerAttempt: 6 }, 2);
    g = throwAll(g, [miss, miss, miss, D(20)]); // player 2 clears
    expect(g.attempt).toBe(2);
    expect(g.activePlayer).toBe(0);
    let h = game({ dartsPerAttempt: 3 }, 2);
    h = throwAll(h, [miss, miss, miss]); // player 1 uses the budget, miss
    expect(h.activePlayer).toBe(1);
  });
});

describe("the run", () => {
  it("ends after the chosen number of rounds", () => {
    let g = game({ rounds: 2 });
    g = throwCheckoutDart(g, D(20));
    expect(g.status).toBe("playing");
    g = throwAll(g, [S(1), D(20)]);
    expect(g.status).toBe("complete");
    expect(g.attempts).toHaveLength(2);
    expect(throwCheckoutDart(g, S(1))).toBe(g);
    expect(() =>
      restoreCheckoutGame(g.config, [...g.events, { type: "dart", dart: S(1) }]),
    ).toThrow(RangeError);
  });
  it("does not end by itself with infinite rounds", () => {
    let g = game({ rounds: "infinite" });
    for (let i = 0; i < 12; i++) g = throwAll(g, [miss, miss, miss]);
    expect(g.status).toBe("playing");
    expect(g.attempt).toBe(13);
  });
  it("ends at once when 170 is cleared", () => {
    const g = throwAll(game({ startTarget: 170, rounds: "infinite" }), [T(20), T(20), D(25)]);
    expect(g.status).toBe("complete");
    expect(g.best).toBe(170);
  });
  it("can be ended by the players, leaving a partial attempt uncounted", () => {
    let g = throwAll(game({ dartsPerAttempt: 6 }), [miss, miss, miss, S(20)]);
    g = endCheckoutRun(g);
    expect(g.status).toBe("complete");
    expect(g.attempts).toEqual([]);
    expect(checkoutSummary(g).darts).toBe(4);
    expect(endCheckoutRun(g)).toBe(g);
    expect(() =>
      restoreCheckoutGame(g.config, [...g.events, { type: "dart", dart: S(1) }]),
    ).toThrow(RangeError);
  });
  it("can be ended before any dart is thrown", () => {
    const g = endCheckoutRun(game());
    expect(g.status).toBe("complete");
    expect(g.best).toBe(0);
  });
});

describe("undo and restore", () => {
  it("undoes the checkout dart and reopens the attempt", () => {
    const won = throwCheckoutDart(game(), D(20));
    const back = undoCheckoutDart(won);
    expect(back.attempts).toEqual([]);
    expect(back.target).toBe(40);
    expect(back.remaining).toBe(40);
    expect(back.best).toBe(0);
    expect(back.events).toHaveLength(0);
  });
  it("undoes a bust by replay", () => {
    const g = throwAll(game({ dartsPerAttempt: 6 }), [S(20), S(20)]);
    const back = undoCheckoutDart(g);
    expect(back.remaining).toBe(20);
    expect(back.turnDarts).toHaveLength(1);
    expect(undoCheckoutTurn(g).events).toHaveLength(0);
  });
  it("undoes a dart together with the end of turn after it", () => {
    const g = endCheckoutTurn(throwAll(game({ dartsPerAttempt: 6 }, 2), [miss]));
    const back = undoCheckoutDart(g);
    expect(back.events).toHaveLength(0);
    expect(back.activePlayer).toBe(0);
  });
  it("undoes the last dart of the final round and resumes the run", () => {
    const done = throwCheckoutDart(game({ rounds: 1 }), D(20));
    expect(done.status).toBe("complete");
    const back = undoCheckoutDart(done);
    expect(back.status).toBe("playing");
    expect(back.attempts).toEqual([]);
  });
  it("undoes an end of run first, whichever undo is used", () => {
    const ended = endCheckoutRun(throwAll(game({ dartsPerAttempt: 6 }), [miss]));
    expect(undoCheckoutDart(ended).status).toBe("playing");
    expect(undoCheckoutDart(ended).events).toHaveLength(1);
    expect(undoCheckoutTurn(ended).events).toHaveLength(1);
    const empty = endCheckoutRun(game());
    expect(undoCheckoutDart(empty).events).toHaveLength(0);
    expect(undoCheckoutDart(empty).status).toBe("playing");
  });
  it("undoes a whole turn, current or last completed", () => {
    let g = throwAll(game({ dartsPerAttempt: 9, startTarget: 100 }, 2), [
      T(20),
      miss,
      miss, // player 1 turn done
      S(20),
    ]);
    expect(undoCheckoutTurn(g).events).toHaveLength(3);
    g = undoCheckoutTurn(undoCheckoutTurn(g));
    expect(g.events).toHaveLength(0);
    expect(g.remaining).toBe(100);
  });
  it("restoring the saved events rebuilds the same state", () => {
    let g = game({ dartsPerAttempt: 6, rounds: "infinite" }, 3);
    g = throwAll(g, [S(20), S(20), D(20), S(1), D(20), miss]);
    g = endCheckoutTurn(g);
    g = endCheckoutRun(g);
    expect(restoreCheckoutGame(g.config, g.events)).toEqual(g);
  });
  it("rejects malformed saved events", () => {
    const c = config();
    expect(() => restoreCheckoutGame(c, [{ type: "visit" } as never])).toThrow(RangeError);
    expect(() => restoreCheckoutGame(c, [{ type: "dart" } as never])).toThrow(RangeError);
    expect(() =>
      restoreCheckoutGame(c, [{ type: "dart", dart: T(25) }]),
    ).toThrow(RangeError);
  });
});

describe("summary", () => {
  it("reports the best target, attempts, darts and each player's checkouts", () => {
    let g = game({ dartsPerAttempt: 6 }, 2);
    g = throwAll(g, [miss, miss, miss, D(20)]); // player 2 clears 40 with 4 darts
    g = throwAll(g, [S(1), D(20)]); // player 1 clears 41 with 2 darts
    const s = checkoutSummary(g);
    expect(s).toMatchObject({
      best: 41,
      attemptsPlayed: 2,
      attemptsCleared: 2,
      darts: 6,
    });
    expect(s.players).toEqual([
      { id: "p1", name: "Player 1", darts: 5, checkouts: 1 },
      { id: "p2", name: "Player 2", darts: 1, checkouts: 1 },
    ]);
    expect(s.attempts.map((a) => a.target)).toEqual([40, 41]);
  });
});
