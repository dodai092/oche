import { checkoutSuggestions, validateDart, type Dart } from "./engine";

export type CheckoutRounds = number | "infinite";
export type CheckoutConfig = {
  /** The first target, 2 to 170, checkable with three darts and a double. */
  startTarget: number;
  /** Darts for one attempt: 3, 6, 9, 12 or 15. */
  dartsPerAttempt: number;
  /** A whole number of attempts from 1 to 99, or "infinite". */
  rounds: CheckoutRounds;
  players: { id: string; name: string }[];
};
export type CheckoutEvent =
  | { type: "dart"; dart: Dart }
  | { type: "end-turn" }
  | { type: "end-run" };
export type CheckoutAttempt = {
  number: number;
  target: number;
  /** Darts of the budget used, counting darts burned by a bust or an early end of turn. */
  darts: number;
  outcome: "cleared" | "missed";
  /** Index of the player who threw the checkout dart. */
  by: number | null;
};
export type CheckoutTurn = {
  playerIndex: number;
  attempt: number;
  darts: Dart[];
  /** Darts of the turn not thrown (bust or early end). They still burn budget. */
  unthrown: number;
  bust: boolean;
  complete: boolean;
};
export type CheckoutGame = {
  config: CheckoutConfig;
  players: { id: string; name: string }[];
  /** Target of the current attempt. */
  target: number;
  remaining: number;
  /** Remaining at the start of the current turn, restored by a bust. */
  turnStart: number;
  /** Fall-back target after a missed attempt. */
  safehouse: number;
  /** Highest target cleared so far, 0 when none. */
  best: number;
  /** 1-based number of the current attempt. */
  attempt: number;
  dartsUsed: number;
  activePlayer: number;
  turnDarts: Dart[];
  turns: CheckoutTurn[];
  /** Finished attempts only, in order. */
  attempts: CheckoutAttempt[];
  status: "playing" | "complete";
  notice: string | null;
  events: CheckoutEvent[];
};

export const CHECKOUT_DARTS = [3, 6, 9, 12, 15];
export const MAX_TARGET = 170;

/** True when the score can be checked out with three darts ending on a double. */
export function isCheckable(score: number): boolean {
  return (
    Number.isInteger(score) &&
    score >= 2 &&
    score <= MAX_TARGET &&
    checkoutSuggestions(score, 3, true).length > 0
  );
}

/** The target rule lives here: a success raises the target by 1, never skipping. */
export function nextTarget(cleared: number): number {
  return cleared + 1;
}

export function createCheckoutGame(config: CheckoutConfig): CheckoutGame {
  if (
    !isCheckable(config.startTarget) ||
    !CHECKOUT_DARTS.includes(config.dartsPerAttempt) ||
    !(
      config.rounds === "infinite" ||
      (Number.isInteger(config.rounds) &&
        (config.rounds as number) >= 1 &&
        (config.rounds as number) <= 99)
    ) ||
    !Array.isArray(config.players) ||
    config.players.length < 1 ||
    config.players.length > 4 ||
    config.players.some(
      (p) =>
        typeof p.id !== "string" ||
        !p.id ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        p.name.length > 40,
    ) ||
    new Set(config.players.map((p) => p.id)).size !== config.players.length
  )
    throw new RangeError("Invalid 121 Checkout configuration");
  const copy: CheckoutConfig = {
    ...config,
    players: config.players.map((p) => ({ ...p })),
  };
  return {
    config: copy,
    players: copy.players.map((p) => ({ ...p })),
    target: copy.startTarget,
    remaining: copy.startTarget,
    turnStart: copy.startTarget,
    safehouse: copy.startTarget,
    best: 0,
    attempt: 1,
    dartsUsed: 0,
    activePlayer: 0,
    turnDarts: [],
    turns: [],
    attempts: [],
    status: "playing",
    notice: null,
    events: [],
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Closes the attempt, applies the target and safehouse rules and opens the next one. */
function endAttempt(
  game: CheckoutGame,
  outcome: "cleared" | "missed",
  by: number | null,
) {
  const turn = game.turns[game.turns.length - 1];
  if (turn) turn.complete = true;
  const target = game.target;
  game.attempts.push({
    number: game.attempt,
    target,
    darts: game.dartsUsed,
    outcome,
    by,
  });
  if (outcome === "cleared") {
    game.best = Math.max(game.best, target);
    if (game.dartsUsed <= 3) game.safehouse = target;
    game.notice = `Cleared ${target} in ${plural(game.dartsUsed, "dart")}.`;
    if (target >= MAX_TARGET) {
      game.status = "complete";
      game.turnDarts = [];
      return;
    }
    game.target = nextTarget(target);
  } else {
    game.target = game.safehouse;
    game.notice = `Missed ${target}. Back to ${game.safehouse}.`;
  }
  if (
    game.config.rounds !== "infinite" &&
    game.attempts.length >= game.config.rounds
  ) {
    game.status = "complete";
    game.turnDarts = [];
    return;
  }
  game.attempt += 1;
  game.remaining = game.target;
  game.turnStart = game.target;
  game.dartsUsed = 0;
  game.turnDarts = [];
  game.activePlayer = (game.activePlayer + 1) % game.players.length;
}

/** The turn is over without a checkout: burn its unthrown darts, then move on. */
function endTurn(game: CheckoutGame) {
  const turn = game.turns[game.turns.length - 1];
  turn.unthrown = 3 - game.turnDarts.length;
  game.dartsUsed += turn.unthrown;
  turn.complete = true;
  if (game.dartsUsed >= game.config.dartsPerAttempt)
    endAttempt(game, "missed", null);
  else {
    game.activePlayer = (game.activePlayer + 1) % game.players.length;
    game.turnDarts = [];
  }
}

/** Replay owns all its objects; public transitions never mutate their input. */
function replay(config: CheckoutConfig, events: CheckoutEvent[]): CheckoutGame {
  const game = createCheckoutGame(config);
  for (const event of events) {
    if (game.status === "complete")
      throw new RangeError("Saved events continue after the run ended.");
    game.notice = null;
    if (event.type === "end-run") {
      game.events.push({ type: "end-run" });
      const turn = game.turns[game.turns.length - 1];
      if (turn) turn.complete = true;
      game.turnDarts = [];
      game.status = "complete";
      continue;
    }
    if (event.type === "end-turn") {
      if (!game.turnDarts.length) continue;
      game.events.push({ type: "end-turn" });
      endTurn(game);
      continue;
    }
    const dart = { ...event.dart };
    validateDart(dart);
    game.events.push({ type: "dart", dart });
    if (!game.turnDarts.length) {
      game.turnStart = game.remaining;
      game.turns.push({
        playerIndex: game.activePlayer,
        attempt: game.attempt,
        darts: [],
        unthrown: 0,
        bust: false,
        complete: false,
      });
    }
    const turn = game.turns[game.turns.length - 1];
    turn.darts.push(dart);
    game.turnDarts.push(dart);
    game.dartsUsed += 1;
    const next = game.remaining - dart.value * dart.multiplier;
    if (next === 0 && dart.multiplier === 2) {
      endAttempt(game, "cleared", game.activePlayer);
    } else if (next <= 1) {
      // Below zero, on 1, or on zero without a double: a bust.
      game.remaining = game.turnStart;
      turn.bust = true;
      endTurn(game);
    } else {
      game.remaining = next;
      if (game.turnDarts.length === 3) endTurn(game);
    }
  }
  return game;
}

export function throwCheckoutDart(game: CheckoutGame, dart: Dart): CheckoutGame {
  if (game.status === "complete") return game;
  validateDart(dart);
  return replay(game.config, [...game.events, { type: "dart", dart }]);
}

/** Finishing a turn early burns its unthrown darts from the attempt budget. */
export function endCheckoutTurn(game: CheckoutGame): CheckoutGame {
  if (game.status === "complete" || !game.turnDarts.length) return game;
  return replay(game.config, [...game.events, { type: "end-turn" }]);
}

/** Ends the run. A partly played attempt is not counted, its darts stay in the events. */
export function endCheckoutRun(game: CheckoutGame): CheckoutGame {
  if (game.status === "complete") return game;
  return replay(game.config, [...game.events, { type: "end-run" }]);
}

/** Removes an end of run first; otherwise the last dart and any end-turn after it. */
export function undoCheckoutDart(game: CheckoutGame): CheckoutGame {
  if (game.events[game.events.length - 1]?.type === "end-run")
    return replay(game.config, game.events.slice(0, -1));
  for (let i = game.events.length - 1; i >= 0; i--) {
    if (game.events[i].type === "dart")
      return replay(game.config, game.events.slice(0, i));
  }
  return game;
}

/** Removes an end of run, else the current partial turn, else the last completed turn. */
export function undoCheckoutTurn(game: CheckoutGame): CheckoutGame {
  if (game.events[game.events.length - 1]?.type === "end-run")
    return replay(game.config, game.events.slice(0, -1));
  const turn = game.turns[game.turns.length - 1];
  if (!turn) return game;
  const endMarker =
    game.events[game.events.length - 1]?.type === "end-turn" ? 1 : 0;
  return replay(
    game.config,
    game.events.slice(0, game.events.length - turn.darts.length - endMarker),
  );
}

/** Restore only legal events, rebuilding all derived state. */
export function restoreCheckoutGame(
  config: CheckoutConfig,
  events: CheckoutEvent[],
): CheckoutGame {
  if (!Array.isArray(events) || events.length > 50000)
    throw new RangeError("Invalid saved events");
  for (const event of events) {
    if (
      !event ||
      (event.type !== "dart" &&
        event.type !== "end-turn" &&
        event.type !== "end-run")
    )
      throw new RangeError("Invalid saved event");
    if (event.type === "dart") {
      if (!event.dart) throw new RangeError("Missing saved dart");
      validateDart(event.dart);
    }
  }
  return replay(config, events);
}

export function checkoutSummary(game: CheckoutGame) {
  return {
    best: game.best,
    attemptsPlayed: game.attempts.length,
    attemptsCleared: game.attempts.filter((a) => a.outcome === "cleared")
      .length,
    darts: game.turns.reduce((sum, t) => sum + t.darts.length, 0),
    attempts: game.attempts,
    players: game.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      darts: game.turns
        .filter((t) => t.playerIndex === i)
        .reduce((sum, t) => sum + t.darts.length, 0),
      checkouts: game.attempts.filter((a) => a.by === i).length,
    })),
  };
}
