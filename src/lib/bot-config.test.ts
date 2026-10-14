import { expect, it } from "vitest";
import { createGame } from "./engine";
const config = {
  startScore: 501 as const,
  doubleOut: true,
  legsToWin: 1,
  setsToWin: 1,
  players: [
    { id: "a", name: "Alice" },
    { id: "bot", name: "DartBot" },
  ],
};
it("rejects unknown bot participants and difficulty", () => {
  expect(() =>
    createGame({ ...config, bot: { playerId: "missing", difficulty: "easy" } }),
  ).toThrow();
  expect(() =>
    createGame({
      ...config,
      bot: { playerId: "bot", difficulty: "impossible" as "easy" },
    }),
  ).toThrow();
});
it("preserves bot configuration without sharing mutable objects", () => {
  const bot = { playerId: "bot", difficulty: "easy" as const };
  const game = createGame({ ...config, bot });
  bot.playerId = "a";
  expect(game.config.bot?.playerId).toBe("bot");
});
