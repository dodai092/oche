import { playerStats, type GameState, type Turn } from "./engine";

export type LegSummary = {
  key: string;
  set: number;
  leg: number;
  winner: number | null;
  checkoutTotal: number | null;
  winnerDarts: number | null;
  players: { points: number; darts: number; average: number }[];
};

/** Read-only summary shared by completed matches and saved history. */
export function buildMatchSummary(game: GameState) {
  const groups = new Map<string, Turn[]>();
  const legNumbers = new Map<string, number>();
  const normalizedTurns = game.turns.map((turn) => {
    const key = `${turn.set}:${turn.leg}`;
    const group = groups.get(key) ?? [];
    group.push(turn);
    groups.set(key, group);
    if (!legNumbers.has(key)) legNumbers.set(key, legNumbers.size + 1);
    // Engine statistics key first-nine quotas by leg. Keep sets distinct too.
    return { ...turn, leg: legNumbers.get(key)! };
  });
  const normalizedGame = { ...game, turns: normalizedTurns };
  const legs: LegSummary[] = Array.from(groups, ([key, turns]) => {
    const winningTurn = turns.find((turn) => turn.complete && turn.checkout);
    const players = game.players.map((_, playerIndex) => {
      let points = 0;
      let darts = 0;
      for (const turn of turns) {
        if (turn.playerIndex !== playerIndex) continue;
        points += turn.bust ? 0 : turn.startScore - turn.endScore;
        darts += turn.bust ? 3 : (turn.dartsUsed ?? turn.darts.length);
      }
      return { points, darts, average: darts ? (points / darts) * 3 : 0 };
    });
    return {
      key,
      set: turns[0].set,
      leg: turns[0].leg,
      winner: winningTurn?.playerIndex ?? null,
      checkoutTotal: winningTurn
        ? winningTurn.startScore - winningTurn.endScore
        : null,
      winnerDarts: winningTurn ? players[winningTurn.playerIndex].darts : null,
      players,
    };
  });
  const players = game.players.map((player, playerIndex) => {
    const stats = playerStats(normalizedGame, playerIndex);
    const visits = game.turns.filter(
      (turn) => turn.playerIndex === playerIndex && !turn.bust,
    );
    const wins = legs.filter((leg) => leg.winner === playerIndex);
    return {
      id: player.id,
      name: player.name,
      ...stats,
      first9: stats.darts ? stats.first9 : null,
      highestVisit: visits.length
        ? Math.max(...visits.map((turn) => turn.startScore - turn.endScore))
        : null,
      bestLeg: wins.length
        ? Math.min(...wins.map((leg) => leg.winnerDarts!))
        : null,
    };
  });
  return { players, legs };
}
