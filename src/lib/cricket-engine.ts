import { validateDart, type Dart } from "./engine";

/** Closing order on the board: 20 down to 15, then the bull (25). */
export const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25] as const;
export type CricketStyle = "standard" | "cutthroat";
export type CricketConfig = {
  style: CricketStyle;
  legsToWin: number;
  players: { id: string; name: string }[];
};
export type CricketEvent = { type: "dart"; dart: Dart } | { type: "end-turn" };
export type CricketTurn = {
  playerIndex: number;
  darts: Dart[];
  leg: number;
  /** Marks thrown on cricket numbers, including marks beyond a closed number. */
  marks: number;
  complete: boolean;
};
export type CricketPlayer = {
  id: string;
  name: string;
  /** Marks per CRICKET_NUMBERS entry, capped at 3 (closed). */
  marks: number[];
  points: number;
  legs: number;
  /** Event count when this player closed every number, or null. */
  closedAllAt: number | null;
};
export type CricketGame = {
  config: CricketConfig;
  players: CricketPlayer[];
  activePlayer: number;
  turnDarts: Dart[];
  turns: CricketTurn[];
  leg: number;
  status: "playing" | "complete";
  winner: number | null;
  notice: string | null;
  events: CricketEvent[];
};

const numbers: readonly number[] = CRICKET_NUMBERS;

export function createCricketGame(config: CricketConfig): CricketGame {
  if (
    !["standard", "cutthroat"].includes(config.style) ||
    !Number.isInteger(config.legsToWin) ||
    config.legsToWin < 1 ||
    config.players.length < 2 ||
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
    throw new RangeError("Invalid Cricket configuration");
  const copy: CricketConfig = {
    ...config,
    players: config.players.map((p) => ({ ...p })),
  };
  return {
    config: copy,
    players: copy.players.map((p) => ({
      id: p.id,
      name: p.name,
      marks: numbers.map(() => 0),
      points: 0,
      legs: 0,
      closedAllAt: null,
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

/** Who wins the leg now, if anyone. `active` is the player who just threw. */
export function cricketLegWinner(
  players: Pick<CricketPlayer, "points" | "closedAllAt">[],
  style: CricketStyle,
  active: number,
): number | null {
  const sign = style === "standard" ? 1 : -1;
  if (players.every((p) => p.closedAllAt !== null)) {
    // Nothing is left to score: best score wins, a tie goes to the earlier closer.
    return players
      .map((p, i) => ({ i, score: sign * p.points, at: p.closedAllAt! }))
      .sort((a, b) => b.score - a.score || a.at - b.at)[0].i;
  }
  const me = players[active];
  if (me.closedAllAt === null) return null;
  return players.every(
    (other, i) => i === active || sign * me.points >= sign * other.points,
  )
    ? active
    : null;
}

function startTurn(game: CricketGame) {
  game.turns.push({
    playerIndex: game.activePlayer,
    darts: [],
    leg: game.leg,
    marks: 0,
    complete: false,
  });
}

function nextPlayer(game: CricketGame) {
  game.turns[game.turns.length - 1].complete = true;
  game.activePlayer = (game.activePlayer + 1) % game.players.length;
  game.turnDarts = [];
}

function winLeg(game: CricketGame, winner: number) {
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
    p.marks = numbers.map(() => 0);
    p.points = 0;
    p.closedAllAt = null;
  }
  game.activePlayer = (game.leg - 1) % game.players.length;
}

function applyDart(game: CricketGame, dart: Dart) {
  const player = game.players[game.activePlayer];
  const turn = game.turns[game.turns.length - 1];
  const i = numbers.indexOf(dart.value);
  if (i >= 0) {
    const total = player.marks[i] + dart.multiplier;
    const overflow = Math.max(0, total - 3);
    player.marks[i] = Math.min(3, total);
    turn.marks += dart.multiplier;
    if (overflow > 0) {
      const opponents = game.players.filter((_, j) => j !== game.activePlayer);
      const open = opponents.filter((o) => o.marks[i] < 3);
      if (game.config.style === "standard") {
        if (open.length) player.points += overflow * dart.value;
      } else {
        for (const o of open) o.points += overflow * dart.value;
      }
    }
    if (player.closedAllAt === null && player.marks.every((m) => m === 3))
      player.closedAllAt = game.events.length;
  }
}

/** Replay owns all its objects; public transitions never mutate their input. */
function replay(config: CricketConfig, events: CricketEvent[]): CricketGame {
  const game = createCricketGame(config);
  for (const event of events) {
    if (game.status === "complete")
      throw new RangeError("Saved events continue after match completion.");
    game.notice = null;
    if (event.type === "end-turn") {
      if (!game.turnDarts.length) continue;
      game.events.push({ type: "end-turn" });
      nextPlayer(game);
      continue;
    }
    const dart = { ...event.dart };
    validateDart(dart);
    game.events.push({ type: "dart", dart });
    if (!game.turnDarts.length) startTurn(game);
    game.turns[game.turns.length - 1].darts.push(dart);
    game.turnDarts.push(dart);
    applyDart(game, dart);
    const winner = cricketLegWinner(
      game.players,
      game.config.style,
      game.activePlayer,
    );
    if (winner !== null) winLeg(game, winner);
    else if (game.turnDarts.length === 3) nextPlayer(game);
  }
  return game;
}

export function throwCricketDart(game: CricketGame, dart: Dart): CricketGame {
  if (game.status === "complete") return game;
  validateDart(dart);
  return replay(game.config, [...game.events, { type: "dart", dart }]);
}

/** Finishing early counts only thrown darts. */
export function endCricketTurn(game: CricketGame): CricketGame {
  if (game.status === "complete" || !game.turnDarts.length) return game;
  return replay(game.config, [...game.events, { type: "end-turn" }]);
}

/** Also removes an explicit end-turn after that dart, reopening the visit. */
export function undoCricketDart(game: CricketGame): CricketGame {
  for (let i = game.events.length - 1; i >= 0; i--) {
    if (game.events[i].type === "dart")
      return replay(game.config, game.events.slice(0, i));
  }
  return game;
}

/** Removes the current partial visit, or the most recent completed visit when empty. */
export function undoCricketTurn(game: CricketGame): CricketGame {
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
export function restoreCricketGame(
  config: CricketConfig,
  events: CricketEvent[],
): CricketGame {
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

export function cricketSummary(game: CricketGame) {
  return game.players.map((p, i) => {
    const turns = game.turns.filter((t) => t.playerIndex === i);
    const darts = turns.reduce((s, t) => s + t.darts.length, 0);
    const marks = turns.reduce((s, t) => s + t.marks, 0);
    return {
      id: p.id,
      name: p.name,
      legs: p.legs,
      points: p.points,
      darts,
      marks,
      marksPerRound: darts ? (marks / darts) * 3 : 0,
    };
  });
}
