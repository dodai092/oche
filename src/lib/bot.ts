import { checkoutSuggestions, type Dart, type GameState } from "./engine";

/** Levels 1-20; the named tiers stay valid so older saves replay unchanged. */
export type BotDifficulty = "easy" | "medium" | "hard" | number;

export const BOT_LEVELS = 20;
export const DEFAULT_BOT_LEVEL = 10;

export function isBotDifficulty(value: unknown): value is BotDifficulty {
  return (
    value === "easy" ||
    value === "medium" ||
    value === "hard" ||
    (Number.isInteger(value) &&
      (value as number) >= 1 &&
      (value as number) <= BOT_LEVELS)
  );
}

/** Clockwise board order, starting at twelve o'clock. Dimensions are in mm. */
const sectors = [
  20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5,
];
const tierSpread = { easy: 40, medium: 26, hard: 15 };
/** Aim error (mm) per level 1-20, calibrated so the 501 three-dart average is
 * about 13 + 4 * level (level 20 about 98), measured over seeded simulations. */
const levelSpread = [
  41.3, 32.7, 28.3, 25.5, 23.2, 20.6, 18.5, 17.4, 15.6, 14.3, 13.4, 12.1, 11.3,
  10.9, 9.8, 9.2, 8.7, 8.2, 7, 6.2,
];
/** Measured 501 double-out checkout percentage per level, for display. */
const levelCheckout = [
  4, 5, 7, 8, 11, 13, 14, 17, 19, 20, 22, 23, 26, 30, 31, 31, 33, 39, 38, 47,
];

function botSpread(difficulty: BotDifficulty) {
  return typeof difficulty === "number"
    ? levelSpread[difficulty - 1]
    : tierSpread[difficulty];
}

/** Expected statistics shown beside the level slider. */
export function botLevelStats(level: number) {
  const average = 13 + 4 * level;
  const checkout = levelCheckout[level - 1];
  return {
    average: level === BOT_LEVELS ? "90+" : `${average - 5}-${average + 5}`,
    checkout: `${Math.max(0, checkout - 8)}-${checkout + 8}%`,
  };
}

export function botLabel(difficulty: BotDifficulty) {
  return typeof difficulty === "number" ? `Level ${difficulty}` : difficulty;
}

export function botTarget(game: GameState): Dart {
  const score = game.players[game.activePlayer].score;
  const route = checkoutSuggestions(
    score,
    3 - game.turnDarts.length,
    game.config.doubleOut,
  );
  if (route.length) return route[0];
  // Set up a finish when none fits in this visit, without intentionally busting.
  if (score <= 61)
    return {
      value: Math.min(20, Math.max(0, score - (game.config.doubleOut ? 2 : 1))),
      multiplier: 1,
    };
  return { value: 20, multiplier: 3 };
}

/** Sample a landing point around the intended segment, never a fabricated total.
 * Gaussian aim error can cross rings, neighboring sectors, or the board edge.
 */
export function chooseBotDart(
  game: GameState,
  difficulty: BotDifficulty,
  rng = Math.random,
): Dart {
  const target = botTarget(game);
  const radius =
    target.value === 25
      ? target.multiplier === 2
        ? 0
        : 11
      : target.multiplier === 3
        ? 103
        : target.multiplier === 2
          ? 166
          : 130;
  const angle = (sectors.indexOf(target.value) * Math.PI) / 10;
  const error =
    botSpread(difficulty) *
    Math.sqrt(-2 * Math.log(1 - rng()));
  const direction = rng() * Math.PI * 2;
  const x = radius * Math.sin(angle) + error * Math.cos(direction);
  const y = radius * Math.cos(angle) + error * Math.sin(direction);
  const distance = Math.hypot(x, y);
  if (distance > 170) return { value: 0, multiplier: 1 };
  if (distance <= 6.35) return { value: 25, multiplier: 2 };
  if (distance <= 15.9) return { value: 25, multiplier: 1 };
  const sector = (Math.round(Math.atan2(x, y) / (Math.PI / 10)) + 20) % 20;
  return {
    value: sectors[sector],
    multiplier: distance >= 162 ? 2 : distance >= 99 && distance <= 107 ? 3 : 1,
  };
}

export type BotConfig = { playerId: string; difficulty: BotDifficulty };
type BotMatch = {
  id: string;
  game: GameState & { config: GameState["config"] & { bot?: BotConfig } };
};
/** Structural store contract, also compatible before the parent's fields land. */
export type BotTurnState = {
  current: BotMatch | null;
  hydrated: boolean;
  readOnly?: boolean;
  dart: (dart: Dart) => void;
};

/** One cancellable dart. Re-read the store so undo or navigation cannot race it. */
export function scheduleBotDart(
  getState: () => BotTurnState,
  expected: BotMatch,
  isPaused: () => boolean,
): () => void {
  const eventCount = expected.game.events.length;
  const timer = setTimeout(() => {
    const state = getState();
    const current = state.current;
    const bot = current?.game.config.bot;
    if (
      isPaused() ||
      !state.hydrated ||
      state.readOnly ||
      (typeof document !== "undefined" &&
        document.visibilityState !== "visible") ||
      !current ||
      !bot ||
      current.id !== expected.id ||
      current.game !== expected.game ||
      current.game.events.length !== eventCount ||
      current.game.status !== "playing" ||
      current.game.players[current.game.activePlayer].id !== bot.playerId ||
      !isBotDifficulty(bot.difficulty)
    )
      return;
    state.dart(chooseBotDart(current.game, bot.difficulty));
  }, 650);
  return () => clearTimeout(timer);
}
