import { describe, expect, it } from "vitest";
import { statRows } from "./game-stats";
import { createCheckoutGame, throwCheckoutDart } from "./checkout-engine";
import { createCricketGame, throwCricketDart } from "./cricket-engine";
import { createGame } from "./engine";
import type { AnyMatch } from "./store";

const players = [
  { id: "a", name: "Ann" },
  { id: "b", name: "Ben" },
];
const checkoutMatch = (): AnyMatch => ({
  id: "c1",
  startedAt: "2026-10-15T10:00:00.000Z",
  finishedAt: "2026-10-15T10:05:00.000Z",
  mode: "checkout",
  checkout: throwCheckoutDart(
    createCheckoutGame({
      startTarget: 40,
      dartsPerAttempt: 3,
      rounds: 1,
      players: [players[0]],
    }),
    { value: 20, multiplier: 2 },
  ),
});
const cricketMatch = (): AnyMatch => ({
  id: "k1",
  startedAt: "2026-10-15T11:00:00.000Z",
  mode: "cricket",
  cricket: throwCricketDart(
    createCricketGame({ style: "standard", legsToWin: 1, players }),
    { value: 20, multiplier: 3 },
  ),
});

describe("statRows", () => {
  it("gives one row per player for a 121 run, with its checkouts and best target", () => {
    const rows = statRows([checkoutMatch()]);
    expect(rows).toEqual([
      expect.objectContaining({
        game: "checkout",
        playerName: "Ann",
        darts: 1,
        checkouts: 1,
        best: 40,
      }),
    ]);
  });

  it("gives cricket rows the marks and legs of each player", () => {
    const rows = statRows([cricketMatch()]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ game: "cricket", playerName: "Ann", darts: 1, marks: 3 });
    expect(rows[1]).toMatchObject({ game: "cricket", playerName: "Ben", darts: 0, marks: 0 });
  });

  it("gives x01 rows the engine figures for each player", () => {
    const x01: AnyMatch = {
      id: "x1",
      startedAt: "2026-10-15T09:00:00.000Z",
      game: createGame({ startScore: 501, doubleOut: true, legsToWin: 1, setsToWin: 1, players }),
    };
    const rows = statRows([x01]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ game: "x01", playerName: "Ann", darts: 0 });
  });
});
