import { playerStats } from "./engine";
import { cricketSummary } from "./cricket-engine";
import { atcSummary } from "./atc-engine";
import { checkoutSummary } from "./checkout-engine";
import type { AnyMatch } from "./store";

export type StatsGame = "x01" | "cricket" | "atc" | "checkout";

type BaseRow = {
  matchId: string;
  startedAt: string;
  playerId: string;
  playerName: string;
  darts: number;
};
export type StatRow =
  | (BaseRow & { game: "x01"; stats: ReturnType<typeof playerStats> })
  | (BaseRow & { game: "cricket"; marks: number; legs: number })
  | (BaseRow & { game: "atc"; hits: number; legs: number })
  | (BaseRow & { game: "checkout"; checkouts: number; best: number });

/** One row per player per completed match, with the figures that belong to that match's game. */
export function statRows(history: AnyMatch[]): StatRow[] {
  return history.flatMap((m): StatRow[] => {
    const base = { matchId: m.id, startedAt: m.startedAt };
    if (m.mode === "cricket") {
      return cricketSummary(m.cricket).map((s) => ({
        ...base,
        game: "cricket",
        playerId: s.id,
        playerName: s.name,
        darts: s.darts,
        marks: s.marks,
        legs: s.legs,
      }));
    }
    if (m.mode === "atc") {
      return atcSummary(m.atc).map((s) => ({
        ...base,
        game: "atc",
        playerId: s.id,
        playerName: s.name,
        darts: s.darts,
        hits: s.hits,
        legs: s.legs,
      }));
    }
    if (m.mode === "checkout") {
      const s = checkoutSummary(m.checkout);
      return s.players.map((p) => ({
        ...base,
        game: "checkout",
        playerId: p.id,
        playerName: p.name,
        darts: p.darts,
        checkouts: p.checkouts,
        best: s.best,
      }));
    }
    return m.game.players.map((p, i) => {
      const stats = playerStats(m.game, i);
      return {
        ...base,
        game: "x01",
        playerId: p.id,
        playerName: p.name,
        darts: stats.darts,
        stats,
      };
    });
  });
}

export type StatsFilter = "all" | StatsGame;
export const STATS_GAME_LABEL: Record<StatsGame, string> = {
  x01: "501",
  cricket: "Cricket",
  atc: "Around the Clock",
  checkout: "121",
};
