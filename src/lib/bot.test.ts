import { describe, expect, it, vi } from "vitest";
import {
  chooseBotDart,
  botTarget,
  scheduleBotDart,
  type BotDifficulty,
  type BotTurnState,
} from "./bot";
import {
  createGame,
  throwDart,
  submitVisit,
  playerStats,
  type GameState,
} from "./engine";

function game(doubleOut = true) {
  return createGame({
    startScore: 301,
    doubleOut,
    legsToWin: 1,
    setsToWin: 1,
    players: [{ id: "bot", name: "Bot" }],
  });
}
function leave(score: number, doubleOut = true) {
  let g = game(doubleOut);
  while (g.players[0].score - score > 180) g = submitVisit(g, 180);
  return submitVisit(g, g.players[0].score - score);
}
function seeded(seed: number) {
  return () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const levels: BotDifficulty[] = ["easy", "medium", "hard"];

describe("bot darts", () => {
  it("uses checkout routes, remaining darts, and the active player's score", () => {
    expect(botTarget(leave(170))).toEqual({ value: 20, multiplier: 3 });
    expect(botTarget(leave(50))).toEqual({ value: 25, multiplier: 2 });
    expect(botTarget(leave(60, false))).toEqual({ value: 20, multiplier: 3 });
    const g = throwDart(throwDart(leave(101), { value: 0, multiplier: 1 }), {
      value: 0,
      multiplier: 1,
    });
    expect(botTarget(g).value * botTarget(g).multiplier).toBeLessThan(101);
    const multiplayer = createGame({
      ...game().config,
      players: [
        { id: "a", name: "A" },
        { id: "b", name: "B" },
      ],
    });
    let active = submitVisit(multiplayer, 180);
    active = submitVisit(active, 0);
    active = submitVisit(active, 81); // A has D20 left; B still has 301.
    expect(botTarget(active)).toEqual({ value: 20, multiplier: 3 });
  });

  it("finishes on doubles and bull, and permits single-out finishes", () => {
    for (const difficulty of levels) {
      for (const score of [2, 40, 50, 100, 170]) {
        let g = leave(score);
        for (let i = 0; i < 3 && g.status === "playing"; i++)
          g = throwDart(
            g,
            chooseBotDart(g, difficulty, () => 0),
          );
        expect(g.status).toBe("complete");
        expect(g.turns.at(-1)?.darts.at(-1)?.multiplier).toBe(2);
      }
      const single = leave(1, false);
      expect(
        throwDart(
          single,
          chooseBotDart(single, difficulty, () => 0),
        ).status,
      ).toBe("complete");
      const outerBull = leave(25, false);
      expect(chooseBotDart(outerBull, difficulty, () => 0)).toEqual({
        value: 25,
        multiplier: 1,
      });
    }
  });

  it("is reproducible, does not mutate the game, and produces only legal segments with varied errors", () => {
    const g = game();
    const before = structuredClone(g);
    const random = seeded(42),
      again = seeded(42);
    const hits = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const dart = chooseBotDart(g, "easy", random);
      expect(dart).toEqual(chooseBotDart(g, "easy", again));
      expect(() => throwDart(g, dart)).not.toThrow();
      hits.add(`${dart.value}:${dart.multiplier}`);
    }
    for (const segment of ["0:1", "20:1", "20:2", "20:3", "1:1", "5:1"])
      expect(hits.has(segment)).toBe(true);
    expect(g).toEqual(before);
  });

  it("lets genuine aiming errors bust and leaves restoration to the engine", () => {
    const g = leave(2),
      random = seeded(7);
    let bust: GameState | undefined;
    for (let i = 0; i < 200; i++) {
      const next = throwDart(g, chooseBotDart(g, "easy", random));
      if (next.notice === "Bust") {
        bust = next;
        break;
      }
    }
    expect(bust?.players[0].score).toBe(2);
    expect(bust?.turns.at(-1)?.bust).toBe(true);
  });

  it("has measurably ordered seeded averages in completed matches, using actual darts", () => {
    const averages = levels.map((difficulty) => {
      let points = 0,
        darts = 0;
      for (let seed = 1; seed <= 40; seed++) {
        let g = game();
        const random = seeded(seed);
        for (let i = 0; i < 1000 && g.status === "playing"; i++)
          g = throwDart(g, chooseBotDart(g, difficulty, random));
        expect(g.status).toBe("complete");
        expect(g.events.every((event) => event.type === "dart")).toBe(true);
        const stats = playerStats(g, 0);
        points += stats.points;
        darts += stats.darts;
      }
      return (points / darts) * 3;
    });
    expect(averages[1]).toBeGreaterThan(averages[0] + 5);
    expect(averages[2]).toBeGreaterThan(averages[1] + 5);
  });
});

describe("bot turn timer", () => {
  function fixture() {
    const g = game();
    const state: BotTurnState = {
      current: {
        id: "match",
        game: {
          ...g,
          config: { ...g.config, bot: { playerId: "bot", difficulty: "hard" } },
        },
      },
      hydrated: true,
      readOnly: false,
      dart: (dart) => {
        state.current = {
          ...state.current!,
          game: throwDart(state.current!.game, dart),
        };
      },
    };
    return state;
  }

  it("throws just one actual dart after 650ms and cancels on cleanup", () => {
    vi.useFakeTimers();
    try {
      const state = fixture();
      const cancel = scheduleBotDart(
        () => state,
        state.current!,
        () => false,
      );
      vi.advanceTimersByTime(649);
      expect(state.current?.game.events).toHaveLength(0);
      vi.advanceTimersByTime(1);
      expect(state.current?.game.events).toHaveLength(1);
      vi.advanceTimersByTime(2000);
      expect(state.current?.game.events).toHaveLength(1);
      cancel();
      const stop = scheduleBotDart(
        () => state,
        state.current!,
        () => false,
      );
      stop();
      vi.advanceTimersByTime(650);
      expect(state.current?.game.events).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("blocks stale matches, same-length undo/replacements, read-only storage, pause and inactive bots", () => {
    vi.useFakeTimers();
    try {
      for (const change of [
        (s: BotTurnState) => {
          s.current = { ...s.current!, id: "other" };
        },
        (s: BotTurnState) => {
          s.current = { ...s.current!, game: structuredClone(s.current!.game) };
        },
        (s: BotTurnState) => {
          s.readOnly = true;
        },
        (s: BotTurnState) => {
          s.hydrated = false;
        },
        (s: BotTurnState) => {
          s.current!.game.events.push({
            type: "dart",
            dart: { value: 0, multiplier: 1 },
          });
        },
        (s: BotTurnState) => {
          s.current = null;
        },
        (s: BotTurnState) => {
          s.current!.game.config.bot!.playerId = "human";
        },
      ]) {
        const state = fixture();
        scheduleBotDart(
          () => state,
          state.current!,
          () => false,
        );
        change(state);
        vi.advanceTimersByTime(650);
        expect(state.current?.game.turns.length ?? 0).toBe(0);
      }
      const state = fixture();
      let paused = false;
      scheduleBotDart(
        () => state,
        state.current!,
        () => paused,
      );
      paused = true;
      vi.advanceTimersByTime(650);
      expect(state.current?.game.events).toHaveLength(0);
      paused = false;
      scheduleBotDart(
        () => state,
        state.current!,
        () => paused,
      );
      vi.advanceTimersByTime(650);
      expect(state.current?.game.events).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
