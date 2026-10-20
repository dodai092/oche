import { validateDart, type Dart } from "./engine";

export type AtcFinish = "single-bull" | "bullseye" | "all";
export type AtcField = "any" | "single" | "double" | "treble";
export type AtcOrderMode = "low-high" | "high-low" | "random";
export type AtcConfig = {
  finish: AtcFinish;
  field: AtcField;
  /** Qualifying hits needed to clear each number, 1 to 3. */
  hitsPerTarget: number;
  /** Increase by segment: a double counts as 2 hits and a treble as 3. */
  increase: boolean;
  orderMode: AtcOrderMode;
  /** The resolved sequence: a permutation of 1 to 20. Never shuffled by the engine. */
  order: number[];
  legsToWin: number;
  players: { id: string; name: string }[];
};
export type AtcStep = {
  /** 1 to 20, or 25 for a bull step. */
  target: number;
  bull: null | "any" | "outer" | "inner";
};
export type AtcEvent = { type: "dart"; dart: Dart } | { type: "end-turn" };
export type AtcTurn = {
  playerIndex: number;
  darts: Dart[];
  leg: number;
  /** Darts that moved the player forward. */
  hits: number;
  /** Darts not thrown when the turn was ended early; they count as misses. */
  unthrown: number;
  complete: boolean;
};
export type AtcPlayer = {
  id: string;
  name: string;
  /** Index into atcSteps(config). Equal to the step count only while a leg is being won. */
  step: number;
  /** Qualifying hits already made on the current number. */
  hits: number;
  legs: number;
};
export type AtcGame = {
  config: AtcConfig;
  steps: AtcStep[];
  players: AtcPlayer[];
  activePlayer: number;
  turnDarts: Dart[];
  turns: AtcTurn[];
  leg: number;
  status: "playing" | "complete";
  winner: number | null;
  notice: string | null;
  events: AtcEvent[];
};

const FINISHES: AtcFinish[] = ["single-bull", "bullseye", "all"];
const FIELDS: AtcField[] = ["any", "single", "double", "treble"];
const ORDER_MODES: AtcOrderMode[] = ["low-high", "high-low", "random"];

/** Build the 20-number sequence. Randomness is injected so the engine stays pure. */
export function makeAtcOrder(
  mode: AtcOrderMode,
  random: () => number,
): number[] {
  const order = Array.from({ length: 20 }, (_, i) => i + 1);
  if (mode === "high-low") return order.reverse();
  if (mode === "low-high") return order;
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function atcSteps(config: AtcConfig): AtcStep[] {
  const numbers: AtcStep[] = config.order.map((target) => ({
    target,
    bull: null,
  }));
  if (config.finish === "all")
    return [
      ...numbers,
      { target: 25, bull: "outer" },
      { target: 25, bull: "inner" },
    ];
  return [
    ...numbers,
    { target: 25, bull: config.finish === "bullseye" ? "inner" : "any" },
  ];
}

export function atcStepLabel(step: AtcStep): string {
  if (step.bull === "any") return "Any bull";
  if (step.bull === "outer") return "Outer bull";
  if (step.bull === "inner") return "Bull";
  return String(step.target);
}

export function createAtcGame(config: AtcConfig): AtcGame {
  if (
    !FINISHES.includes(config.finish) ||
    !FIELDS.includes(config.field) ||
    !ORDER_MODES.includes(config.orderMode) ||
    typeof config.increase !== "boolean" ||
    !Number.isInteger(config.hitsPerTarget) ||
    config.hitsPerTarget < 1 ||
    config.hitsPerTarget > 3 ||
    !Number.isInteger(config.legsToWin) ||
    config.legsToWin < 1 ||
    !Array.isArray(config.order) ||
    config.order.length !== 20 ||
    [...config.order].sort((a, b) => a - b).some((n, i) => n !== i + 1) ||
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
    throw new RangeError("Invalid Around the Clock configuration");
  const copy: AtcConfig = {
    ...config,
    order: [...config.order],
    players: config.players.map((p) => ({ ...p })),
  };
  return {
    config: copy,
    steps: atcSteps(copy),
    players: copy.players.map((p) => ({
      id: p.id,
      name: p.name,
      step: 0,
      hits: 0,
      legs: 0,
    })),
    activePlayer: 0,
    turnDarts: [],
    turns: [],
    leg: 1,
    status: "playing",
    winner: null,
    notice: null,
    events: [],
  };
}

/** The player's current target and how many more hits it needs, or null when finished. */
export function atcCurrent(game: AtcGame, playerIndex: number) {
  const p = game.players[playerIndex];
  const step = game.steps[p.step];
  if (!step) return null;
  return {
    step,
    hitsLeft: step.bull ? 1 : game.config.hitsPerTarget - p.hits,
  };
}

function fieldFits(field: AtcField, multiplier: number): boolean {
  if (field === "any") return true;
  return (
    (field === "single" && multiplier === 1) ||
    (field === "double" && multiplier === 2) ||
    (field === "treble" && multiplier === 3)
  );
}

/** The increase-by-segment rule lives here: hits roll on, but stop at the bull steps. */
function advance(game: AtcGame, player: AtcPlayer, credit: number) {
  const need = game.config.hitsPerTarget;
  while (credit > 0 && player.step < game.steps.length) {
    if (game.steps[player.step].bull) return;
    const left = need - player.hits;
    if (credit >= left) {
      credit -= left;
      player.step += 1;
      player.hits = 0;
    } else {
      player.hits += credit;
      credit = 0;
    }
  }
}

/** True when the dart moved the active player forward. */
function applyDart(game: AtcGame, dart: Dart): boolean {
  const player = game.players[game.activePlayer];
  const step = game.steps[player.step];
  if (!step) return false;
  if (step.bull) {
    const ok =
      dart.value === 25 &&
      (step.bull === "any" ||
        (step.bull === "outer" && dart.multiplier === 1) ||
        (step.bull === "inner" && dart.multiplier === 2));
    if (ok) {
      player.step += 1;
      player.hits = 0;
    }
    return ok;
  }
  if (dart.value !== step.target || !fieldFits(game.config.field, dart.multiplier))
    return false;
  advance(game, player, game.config.increase ? dart.multiplier : 1);
  return true;
}

function startTurn(game: AtcGame) {
  game.turns.push({
    playerIndex: game.activePlayer,
    darts: [],
    leg: game.leg,
    hits: 0,
    unthrown: 0,
    complete: false,
  });
}

function nextPlayer(game: AtcGame) {
  game.turns[game.turns.length - 1].complete = true;
  game.activePlayer = (game.activePlayer + 1) % game.players.length;
  game.turnDarts = [];
}

function winLeg(game: AtcGame, winner: number) {
  const winnerPlayer = game.players[winner];
  winnerPlayer.legs += 1;
  game.turns[game.turns.length - 1].complete = true;
  game.turnDarts = [];
  if (winnerPlayer.legs === game.config.legsToWin) {
    game.status = "complete";
    game.winner = winner;
    return;
  }
  game.notice = `${winnerPlayer.name} won the leg`;
  game.leg += 1;
  for (const p of game.players) {
    p.step = 0;
    p.hits = 0;
  }
  game.activePlayer = (game.leg - 1) % game.players.length;
}

/** Replay owns all its objects; public transitions never mutate their input. */
function replay(config: AtcConfig, events: AtcEvent[]): AtcGame {
  const game = createAtcGame(config);
  for (const event of events) {
    if (game.status === "complete")
      throw new RangeError("Saved events continue after match completion.");
    game.notice = null;
    if (event.type === "end-turn") {
      if (!game.turnDarts.length) continue;
      game.events.push({ type: "end-turn" });
      game.turns[game.turns.length - 1].unthrown = 3 - game.turnDarts.length;
      nextPlayer(game);
      continue;
    }
    const dart = { ...event.dart };
    validateDart(dart);
    game.events.push({ type: "dart", dart });
    // Saves from before visits held at three darts ended the turn on the third dart with no event.
    if (game.turnDarts.length === 3) nextPlayer(game);
    if (!game.turnDarts.length) startTurn(game);
    const turn = game.turns[game.turns.length - 1];
    turn.darts.push(dart);
    game.turnDarts.push(dart);
    if (applyDart(game, dart)) turn.hits += 1;
    if (game.players[game.activePlayer].step === game.steps.length)
      winLeg(game, game.activePlayer);
  }
  return game;
}

/** A visit holds at three darts until it is ended, so a fourth dart is ignored. */
export function throwAtcDart(game: AtcGame, dart: Dart): AtcGame {
  if (game.status === "complete" || game.turnDarts.length >= 3) return game;
  validateDart(dart);
  return replay(game.config, [...game.events, { type: "dart", dart }]);
}

/** Finishing early records the unthrown darts as misses in the summary. */
export function endAtcTurn(game: AtcGame): AtcGame {
  if (game.status === "complete" || !game.turnDarts.length) return game;
  return replay(game.config, [...game.events, { type: "end-turn" }]);
}

/** Also removes an explicit end-turn after that dart, reopening the visit. */
export function undoAtcDart(game: AtcGame): AtcGame {
  for (let i = game.events.length - 1; i >= 0; i--) {
    if (game.events[i].type === "dart")
      return replay(game.config, game.events.slice(0, i));
  }
  return game;
}

/** Removes the current partial visit, or the most recent completed visit when empty. */
export function undoAtcTurn(game: AtcGame): AtcGame {
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
export function restoreAtcGame(
  config: AtcConfig,
  events: AtcEvent[],
): AtcGame {
  if (!Array.isArray(events) || events.length > 50000)
    throw new RangeError("Invalid saved events");
  for (const event of events) {
    if (!event || (event.type !== "dart" && event.type !== "end-turn"))
      throw new RangeError("Invalid saved event");
    if (event.type === "dart") {
      if (!event.dart) throw new RangeError("Missing saved dart");
      validateDart(event.dart);
    }
  }
  return replay(config, events);
}

export function atcSummary(game: AtcGame) {
  return game.players.map((p, i) => {
    const turns = game.turns.filter((t) => t.playerIndex === i);
    const darts = turns.reduce((s, t) => s + t.darts.length + t.unthrown, 0);
    const hits = turns.reduce((s, t) => s + t.hits, 0);
    return {
      id: p.id,
      name: p.name,
      legs: p.legs,
      darts,
      hits,
      hitRate: darts ? hits / darts : 0,
    };
  });
}
