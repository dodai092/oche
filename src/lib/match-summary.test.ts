import { describe, expect, it } from "vitest";
import {
  createGame,
  endTurn,
  submitVisit,
  throwDart,
  type GameState,
} from "./engine";
import { buildMatchSummary } from "./match-summary";

const start = () =>
  createGame({
    startScore: 301,
    doubleOut: true,
    legsToWin: 1,
    setsToWin: 2,
    players: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
  });
const visit = (
  g: GameState,
  score: number,
  dartsUsed = 3,
  checkoutConfirmed = false,
) => submitVisit(g, score, { dartsUsed, checkoutConfirmed });

describe("match summary", () => {
  it("returns safe empty statistics without creating an unplayed leg", () => {
    const result = buildMatchSummary(start());
    expect(result.legs).toEqual([]);
    expect(result.players[0]).toMatchObject({
      average: 0,
      highestVisit: null,
      bestLeg: null,
      first9: null,
      checkoutAttempts: 0,
      checkoutPercentage: 0,
      points: 0,
      darts: 0,
    });
  });

  it("uses typed dart counts, excludes bust scores and counts busts as three", () => {
    let game = visit(start(), 180);
    game = visit(game, 20, 1);
    game = visit(game, 180); // A busts from 121.
    game = visit(game, 0, 2);
    game = visit(game, 121, 3, true);
    const snapshot = JSON.stringify(game);
    const result = buildMatchSummary(game);
    expect(result.players[0]).toMatchObject({
      points: 301,
      darts: 9,
      highestVisit: 180,
      bestLeg: 9,
      checkoutAttempts: 1,
      checkoutPercentage: 100,
    });
    expect(result.players[0].average).toBeCloseTo(301 / 3);
    expect(result.legs[0]).toMatchObject({
      key: "1:1",
      set: 1,
      leg: 1,
      winner: 0,
      checkoutTotal: 121,
      winnerDarts: 9,
    });
    expect(result.legs[0].players[1]).toMatchObject({
      points: 20,
      darts: 3,
      average: 20,
    });
    expect(JSON.stringify(game)).toBe(snapshot);
    expect(buildMatchSummary(game)).toEqual(result);
  });

  it("keeps live partial and explicitly ended dart visits at their actual lengths", () => {
    let game = throwDart(start(), { value: 20, multiplier: 3 });
    expect(buildMatchSummary(game).players[0]).toMatchObject({
      darts: 1,
      points: 60,
      average: 180,
      bestLeg: null,
    });
    game = endTurn(game);
    game = throwDart(game, { value: 0, multiplier: 1 });
    const leg = buildMatchSummary(game).legs[0];
    expect(leg).toMatchObject({
      winner: null,
      checkoutTotal: null,
      winnerDarts: null,
    });
    expect(leg.players.map((p) => p.darts)).toEqual([1, 1]);
  });

  it("uses a full winning visit total rather than only the final dart", () => {
    let game = visit(start(), 180);
    game = visit(game, 0);
    for (const dart of [
      { value: 20, multiplier: 3 },
      { value: 11, multiplier: 1 },
      { value: 25, multiplier: 2 },
    ] as const)
      game = throwDart(game, dart);
    expect(buildMatchSummary(game).legs[0]).toMatchObject({
      checkoutTotal: 121,
      winnerDarts: 6,
    });
  });

  it("retains separate sets and best completed wins when leg numbers reset", () => {
    let game = visit(start(), 180);
    game = visit(game, 0);
    game = visit(game, 121, 3, true);
    game = visit(game, 180); // B starts set two.
    game = visit(game, 180);
    game = visit(game, 0);
    game = visit(game, 121, 3, true);
    // Saved formats can number legs within each set.
    game = { ...game, turns: game.turns.map((t) => ({ ...t, leg: 1 })) };
    const result = buildMatchSummary(game);
    expect(result.legs.map((l) => l.key)).toEqual(["1:1", "2:1"]);
    expect(result.players[0]).toMatchObject({
      bestLeg: 6,
      checkouts: 2,
      points: 602,
    });
    expect(result.players[1].bestLeg).toBeNull();
    expect(result.legs.map((l) => l.winnerDarts)).toEqual([6, 6]);
  });

  it("leaves first-nine unavailable when typed points straddle dart nine", () => {
    let game = createGame({
      ...start().config,
      players: [{ id: "a", name: "A" }],
      startScore: 501,
    });
    for (let i = 0; i < 8; i++)
      game = throwDart(game, { value: 0, multiplier: 1 });
    game = visit(endTurn(game), 100);
    expect(buildMatchSummary(game).players[0]).toMatchObject({
      first9: null,
      darts: 11,
      points: 100,
    });
    expect(game.turns.at(-1)?.darts).toEqual([]);
  });

  it("retains known first-nine and reported attempts without inventing segments", () => {
    let game = createGame({
      ...start().config,
      players: [{ id: "a", name: "A" }],
    });
    game = visit(game, 180);
    game = submitVisit(game, 121, {
      checkoutConfirmed: true,
      checkoutAttempts: 2,
    });
    expect(buildMatchSummary(game).players[0]).toMatchObject({
      first9: 150.5,
      checkoutAttempts: 2,
      checkoutPercentage: 50,
      bestLeg: 6,
    });
  });

  it("never promotes a larger bust to highest valid visit", () => {
    let game = createGame({
      ...start().config,
      players: [{ id: "a", name: "A" }],
    });
    game = visit(visit(visit(game, 100), 100), 180);
    expect(buildMatchSummary(game).players[0]).toMatchObject({
      highestVisit: 100,
      points: 200,
      darts: 9,
    });
  });

  it("resets first-nine quotas across sets even with repeated leg numbers", () => {
    let game = createGame({
      ...start().config,
      players: [{ id: "a", name: "A" }],
    });
    for (let i = 0; i < 9; i++)
      game = throwDart(game, { value: 0, multiplier: 1 });
    game = visit(visit(game, 180), 121, 3, true);
    game = visit(game, 180);
    game = { ...game, turns: game.turns.map((t) => ({ ...t, leg: 1 })) };
    expect(buildMatchSummary(game).players[0].first9).toBe(45);
  });
});
