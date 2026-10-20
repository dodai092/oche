export type Dart = { value: number; multiplier: 1 | 2 | 3 };
export type MatchConfig = {
  startScore: 301 | 501 | 701;
  doubleOut: boolean;
  legsToWin: number;
  setsToWin: number;
  players: { id: string; name: string }[];
  bot?: { playerId: string; difficulty: "easy" | "medium" | "hard" | number };
};
export type VisitOptions = {
  dartsUsed?: number;
  checkoutConfirmed?: boolean;
  checkoutAttempts?: number;
};
type VisitEvent = {
  type: "visit";
  score: number;
  dartsUsed: number;
  checkoutConfirmed: boolean;
  checkoutAttempts: number;
};
export type GameEvent =
  { type: "dart"; dart: Dart } | { type: "end-turn" } | VisitEvent;
export type Turn = {
  visitScore?: number;
  dartsUsed?: number;
  checkoutAttempts?: number;
  playerIndex: number;
  darts: Dart[];
  startScore: number;
  endScore: number;
  bust: boolean;
  checkout: boolean;
  leg: number;
  set: number;
  complete: boolean;
};
export type PlayerState = {
  id: string;
  name: string;
  score: number;
  legs: number;
  sets: number;
};
export type GameState = {
  config: MatchConfig;
  players: PlayerState[];
  activePlayer: number;
  turnDarts: Dart[];
  turnStartScore: number;
  turns: Turn[];
  leg: number;
  set: number;
  status: "playing" | "complete";
  winner: number | null;
  notice: string | null;
  events: GameEvent[];
};
/** Leg numbers are match-wide; legs are wins in the current set, sets are match wins.
 * History includes the live incomplete visit. Only actually thrown darts are stored.
 */
export function createGame(config: MatchConfig): GameState {
  if (
    ![301, 501, 701].includes(config.startScore) ||
    typeof config.doubleOut !== "boolean" ||
    !Number.isInteger(config.legsToWin) ||
    config.legsToWin < 1 ||
    !Number.isInteger(config.setsToWin) ||
    config.setsToWin < 1 ||
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
    new Set(config.players.map((p) => p.id)).size !== config.players.length ||
    (config.bot !== undefined &&
      (!config.bot || !config.players.some((p) => p.id === config.bot?.playerId) ||
        !(
          ["easy", "medium", "hard"].includes(config.bot.difficulty as string) ||
          (Number.isInteger(config.bot.difficulty) &&
            (config.bot.difficulty as number) >= 1 &&
            (config.bot.difficulty as number) <= 20)
        )))
  ) {
    throw new RangeError("Invalid match configuration");
  }
  const copy = { ...config, ...(config.bot ? { bot: { ...config.bot } } : {}), players: config.players.map((p) => ({ ...p })) };
  return {
    config: copy,
    players: copy.players.map((p) => ({
      ...p,
      score: copy.startScore,
      legs: 0,
      sets: 0,
    })),
    activePlayer: 0,
    turnDarts: [],
    turnStartScore: copy.startScore,
    turns: [],
    leg: 1,
    set: 1,
    status: "playing",
    winner: null,
    notice: null,
    events: [],
  };
}

export function validateDart(dart: Dart): void {
  if (
    !Number.isInteger(dart.value) ||
    ![1, 2, 3].includes(dart.multiplier) ||
    !(dart.value === 0
      ? dart.multiplier === 1
      : dart.value === 25
        ? dart.multiplier <= 2
        : dart.value >= 1 && dart.value <= 20)
  ) {
    throw new RangeError("Invalid dart");
  }
}
const dartPoints = (dart: Dart) => dart.value * dart.multiplier;
const canFinish = (score: number, doubleOut: boolean) =>
  doubleOut
    ? (score >= 2 && score <= 40 && score % 2 === 0) || score === 50
    : scoringDarts.some((dart) => dartPoints(dart) === score);

function finishTurn(game: GameState, turn: Turn): void {
  turn.complete = true;
  if (turn.checkout) {
    const winner = game.players[game.activePlayer];
    winner.legs += 1;
    game.notice = "Checkout";
    if (winner.legs === game.config.legsToWin) {
      winner.sets += 1;
      if (winner.sets === game.config.setsToWin) {
        game.status = "complete";
        game.winner = game.activePlayer;
        game.turnDarts = [];
        game.turnStartScore = winner.score;
        return;
      }
      game.set += 1;
      game.players.forEach((p) => {
        p.legs = 0;
      });
    }
    game.leg += 1;
    game.players.forEach((p) => {
      p.score = game.config.startScore;
    });
    game.activePlayer = (game.leg - 1) % game.players.length;
  } else {
    game.activePlayer = (game.activePlayer + 1) % game.players.length;
  }
  game.turnDarts = [];
  game.turnStartScore = game.players[game.activePlayer].score;
}

/** Replay owns all its objects; public transitions never mutate their input. */
function replay(config: MatchConfig, events: GameEvent[]): GameState {
  const game = createGame(config);
  for (const event of events) {
    if (game.status === "complete")
      throw new RangeError("Saved events continue after match completion.");
    if (event.type === "visit") {
      validateVisit(game, event);
      const startScore = game.players[game.activePlayer].score;
      const remaining = startScore - event.score;
      const bust =
        remaining < 0 ||
        (config.doubleOut &&
          (remaining === 1 || (remaining === 0 && !event.checkoutConfirmed)));
      const turn: Turn = {
        playerIndex: game.activePlayer,
        darts: [],
        visitScore: event.score,
        dartsUsed: event.dartsUsed,
        checkoutAttempts: event.checkoutAttempts,
        startScore,
        endScore: bust ? startScore : remaining,
        bust,
        checkout: remaining === 0 && !bust,
        leg: game.leg,
        set: game.set,
        complete: true,
      };
      game.events.push({ ...event });
      game.turns.push(turn);
      game.notice = bust ? "Bust" : null;
      game.players[game.activePlayer].score = turn.endScore;
      finishTurn(game, turn);
      continue;
    }
    if (event.type === "end-turn") {
      if (!game.turnDarts.length) continue;
      game.events.push({ type: "end-turn" });
      game.notice = null;
      finishTurn(game, game.turns[game.turns.length - 1]);
      continue;
    }
    const dart = { ...event.dart };
    validateDart(dart);
    game.events.push({ type: "dart", dart });
    game.notice = null;
    if (!game.turnDarts.length) {
      game.turns.push({
        playerIndex: game.activePlayer,
        darts: [],
        startScore: game.turnStartScore,
        endScore: game.turnStartScore,
        bust: false,
        checkout: false,
        leg: game.leg,
        set: game.set,
        complete: false,
      });
    }
    const turn = game.turns[game.turns.length - 1];
    turn.darts.push(dart);
    game.turnDarts.push(dart);
    const remaining = game.players[game.activePlayer].score - dartPoints(dart);
    turn.bust =
      remaining < 0 ||
      (game.config.doubleOut &&
        (remaining === 1 || (remaining === 0 && dart.multiplier !== 2)));
    turn.checkout = remaining === 0 && !turn.bust;
    turn.endScore = turn.bust ? turn.startScore : remaining;
    game.players[game.activePlayer].score = turn.endScore;
    if (turn.bust) game.notice = "Bust";
    if (turn.bust || turn.checkout || turn.darts.length === 3)
      finishTurn(game, turn);
  }
  return game;
}

export function throwDart(game: GameState, dart: Dart): GameState {
  if (game.status === "complete") return game;
  validateDart(dart);
  return replay(game.config, [...game.events, { type: "dart", dart }]);
}

/** Finishing early counts only thrown darts, without filling unused slots with misses. */
export function endTurn(game: GameState): GameState {
  if (game.status === "complete" || !game.turnDarts.length) return game;
  return replay(game.config, [...game.events, { type: "end-turn" }]);
}

/** Also removes the explicit end-turn after that dart, reopening the visit. */
export function undoDart(game: GameState): GameState {
  for (let i = game.events.length - 1; i >= 0; i--) {
    if (game.events[i].type === "dart" || game.events[i].type === "visit")
      return replay(game.config, game.events.slice(0, i));
  }
  return game;
}

/** Removes the current partial visit, or the most recent completed visit when empty. */
export function undoTurn(game: GameState): GameState {
  const turn = game.turns[game.turns.length - 1];
  if (!turn) return game;
  const endMarker =
    game.events[game.events.length - 1]?.type === "end-turn" ? 1 : 0;
  return replay(
    game.config,
    game.events.slice(
      0,
      game.events.length -
        (turn.visitScore !== undefined ? 1 : turn.darts.length + endMarker),
    ),
  );
}

const scoringDarts: Dart[] = [
  ...Array.from({ length: 20 }, (_, i) =>
    ([1, 2, 3] as const).map((multiplier) => ({ value: i + 1, multiplier })),
  ).flat(),
  { value: 25, multiplier: 1 as const },
  { value: 25, multiplier: 2 as const },
].sort((a, b) => dartPoints(b) - dartPoints(a) || b.multiplier - a.multiplier);

/** Shortest route first, then lexicographically highest dart scores. */
export function checkoutSuggestions(
  score: number,
  dartsLeft: number,
  doubleOut: boolean,
): Dart[] {
  if (
    !Number.isInteger(score) ||
    score <= 0 ||
    !Number.isInteger(dartsLeft) ||
    dartsLeft < 1 ||
    dartsLeft > 3
  )
    return [];
  function search(remaining: number, count: number): Dart[] | null {
    if (remaining > count * 60) return null;
    for (const dart of scoringDarts) {
      const next = remaining - dartPoints(dart);
      if (count === 1) {
        if (next === 0 && (!doubleOut || dart.multiplier === 2))
          return [{ ...dart }];
      } else if (next > (doubleOut ? 1 : 0)) {
        const tail = search(next, count - 1);
        if (tail) return [{ ...dart }, ...tail];
      }
    }
    return null;
  }
  for (let count = 1; count <= dartsLeft; count++) {
    const route = search(score, count);
    if (route) return route;
  }
  return [];
}

export function dartLabel(dart: Dart): string {
  validateDart(dart);
  if (dart.value === 0) return "Miss";
  if (dart.value === 25 && dart.multiplier === 1) return "Outer bull";
  if (dart.value === 25 && dart.multiplier === 2) return "Bullseye";
  return `${dart.multiplier === 3 ? "T" : dart.multiplier === 2 ? "D" : ""}${dart.value}`;
}

/** Bust visits count three darts and zero points, including first-nine averages.
 * Attempts approximate intent: every thrown dart from a one-dart finish counts,
 * including misses/singles. Only thrown darts count as attempts, never bust padding.
 * First-nine averages pool each player's first nine statistical darts in every leg.
 */
export function playerStats(
  game: GameState,
  playerIndex: number,
): {
  average: number;
  first9: number | null;
  oneEighties: number;
  checkoutAttempts: number;
  checkoutPercentage: number;
  darts: number;
  points: number;
  checkouts: number;
} {
  if (!game.players[playerIndex]) throw new RangeError("Invalid player index");
  let darts = 0,
    points = 0,
    oneEighties = 0,
    checkoutAttempts = 0,
    checkouts = 0;
  let first9Unavailable = false;
  let firstDarts = 0,
    firstPoints = 0;
  const legDarts = new Map<number, number>();
  for (const turn of game.turns) {
    if (turn.playerIndex !== playerIndex) continue;
    const count = turn.bust ? 3 : (turn.dartsUsed ?? turn.darts.length);
    darts += count;
    points += turn.startScore - turn.endScore;
    if (!turn.bust && turn.startScore - turn.endScore === 180) oneEighties++;
    if (turn.checkout) checkouts++;
    let remaining = turn.startScore;
    const previous = legDarts.get(turn.leg) ?? 0;
    if (turn.visitScore !== undefined) {
      checkoutAttempts += turn.checkoutAttempts ?? 0;
      const firstCount = Math.min(count, Math.max(0, 9 - previous));
      firstDarts += firstCount;
      if (!turn.bust && firstCount > 0) {
        if (firstCount < count && turn.visitScore > 0) first9Unavailable = true;
        else firstPoints += turn.startScore - turn.endScore;
      }
      legDarts.set(turn.leg, previous + count);
      continue;
    }
    for (let i = 0; i < count; i++) {
      const dart = turn.darts[i];
      if (dart && canFinish(remaining, game.config.doubleOut))
        checkoutAttempts++;
      if (previous + i < 9) {
        firstDarts++;
        if (!turn.bust && dart) firstPoints += dartPoints(dart);
      }
      if (dart) remaining -= dartPoints(dart);
    }
    legDarts.set(turn.leg, previous + count);
  }
  return {
    average: darts ? (points / darts) * 3 : 0,
    first9: first9Unavailable
      ? null
      : firstDarts
        ? (firstPoints / firstDarts) * 3
        : 0,
    oneEighties,
    checkoutAttempts,
    checkoutPercentage: checkoutAttempts
      ? (checkouts / checkoutAttempts) * 100
      : 0,
    darts,
    points,
    checkouts,
  };
}

/** Restore only legal events, rebuilding derived scores and statistics. */
export function restoreGame(
  config: MatchConfig,
  events: GameEvent[],
): GameState {
  if (!Array.isArray(events) || events.length > 50000)
    throw new RangeError("Invalid saved events");
  for (const event of events) {
    if (
      !event ||
      (event.type !== "dart" &&
        event.type !== "end-turn" &&
        event.type !== "visit")
    )
      throw new RangeError("Invalid saved event");
    if (event.type === "dart") {
      if (!event.dart) throw new RangeError("Missing saved dart");
      validateDart(event.dart);
    }
  }
  return replay(config, events);
}

// Reachable sums include misses, so a reported visit need not fabricate segments.
const visitTotals: Set<number>[] = [new Set([0])];
for (let count = 1; count <= 3; count++) {
  const totals = new Set<number>();
  for (const score of visitTotals[count - 1])
    for (const dart of [{ value: 0, multiplier: 1 }, ...scoringDarts])
      totals.add(score + dart.value * dart.multiplier);
  visitTotals.push(totals);
}
function validateVisit(game: GameState, event: VisitEvent): void {
  if (game.turnDarts.length)
    throw new RangeError(
      "Finish or undo the current darts before entering a visit total.",
    );
  if (
    !Number.isInteger(event.dartsUsed) ||
    event.dartsUsed < 1 ||
    event.dartsUsed > 3 ||
    !Number.isInteger(event.score) ||
    !visitTotals[event.dartsUsed].has(event.score)
  )
    throw new RangeError(
      "That score is not possible with the selected number of darts.",
    );
  if (
    typeof event.checkoutConfirmed !== "boolean" ||
    !Number.isInteger(event.checkoutAttempts) ||
    event.checkoutAttempts < 0 ||
    event.checkoutAttempts > event.dartsUsed
  )
    throw new RangeError(
      "Checkout attempts must be between zero and darts thrown.",
    );
  const finishing = event.score === game.players[game.activePlayer].score;
  if (
    event.checkoutConfirmed &&
    (!finishing ||
      !checkoutSuggestions(event.score, event.dartsUsed, game.config.doubleOut)
        .length)
  )
    throw new RangeError(
      "That checkout is not possible with the selected number of darts.",
    );
  if (
    finishing &&
    (!game.config.doubleOut || event.checkoutConfirmed) &&
    event.checkoutAttempts < 1
  )
    throw new RangeError(
      "A finish must include at least one checkout attempt.",
    );
}
/** Atomic reported visit. Actual segments remain unknown; misses at doubles are user-reported. */
export function submitVisit(
  game: GameState,
  score: number,
  options: VisitOptions = {},
): GameState {
  if (game.status === "complete") return game;
  const checkoutConfirmed = options.checkoutConfirmed ?? false;
  const finishing = score === game.players[game.activePlayer].score;
  const event: VisitEvent = {
    type: "visit",
    score,
    dartsUsed: options.dartsUsed ?? 3,
    checkoutConfirmed,
    checkoutAttempts:
      options.checkoutAttempts ??
      (finishing && (!game.config.doubleOut || checkoutConfirmed) ? 1 : 0),
  };
  validateVisit(game, event);
  return replay(game.config, [...game.events, event]);
}
