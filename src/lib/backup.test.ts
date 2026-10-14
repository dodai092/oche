import { expect, it } from "vitest";
import { parseBackup } from "./backup";
import { createGame } from "./engine";
const data = {
  version: 1,
  exportedAt: "2026-10-14T12:00:00Z",
  current: null,
  history: [],
  profiles: [{ id: "alice", name: "Alice" }],
  settings: { startScore: 501, doubleOut: true, showCheckouts: true },
};
it("accepts existing exported backups and upgrades optional preferences", () => {
  expect(parseBackup(JSON.stringify(data)).profiles).toEqual(data.profiles);
  expect(parseBackup(JSON.stringify(data)).settings.keyboardMode).toBe(
    "keypad",
  );
});
it("rejects invalid, oversized and unsupported backups without trusting scores", () => {
  for (const raw of [
    "broken",
    "null",
    JSON.stringify({ ...data, version: 2 }),
    " ".repeat(10_000_001),
  ])
    expect(() => parseBackup(raw)).toThrow();
  const game = createGame({
    startScore: 501,
    doubleOut: true,
    legsToWin: 1,
    setsToWin: 1,
    players: [{ id: "a", name: "Alice" }],
  });
  game.players[0].score = 42;
  const restored = parseBackup(
    JSON.stringify({
      ...data,
      current: { id: "m", startedAt: data.exportedAt, game },
    }),
  );
  expect(restored.current?.game.players[0].score).toBe(501);
});
