import { matchWinnerName, type AnyMatch } from "./store";

export type StatsPeriod = "month" | "year" | "all";

export const STATS_PERIOD_LABEL: Record<StatsPeriod, string> = {
  month: "Month",
  year: "Year",
  all: "All time",
};

/** Start of the period shown by `anchor`, or null for all time. Uses local time. */
function periodStart(period: StatsPeriod, anchor: Date): Date | null {
  if (period === "all") return null;
  if (period === "year") return new Date(anchor.getFullYear(), 0, 1);
  return new Date(anchor.getFullYear(), anchor.getMonth(), 1);
}

/** Anchor moved one period back (dir -1) or forward (dir 1). */
export function shiftAnchor(period: StatsPeriod, anchor: Date, dir: -1 | 1): Date {
  if (period === "year") return new Date(anchor.getFullYear() + dir, 0, 1);
  return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
}

/** True when the period after `anchor` starts in the future, so there is nothing to show yet. */
export function isFuturePeriod(period: StatsPeriod, anchor: Date, now: Date): boolean {
  return shiftAnchor(period, anchor, 1).getTime() > now.getTime();
}

export function periodLabel(period: StatsPeriod, anchor: Date): string {
  if (period === "all") return "All time";
  if (period === "year") return String(anchor.getFullYear());
  return anchor.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

/** True when `startedAt` falls inside the period shown by `anchor`. */
export function inPeriod(startedAt: string, period: StatsPeriod, anchor: Date): boolean {
  const start = periodStart(period, anchor);
  if (!start) return true;
  const t = Date.parse(startedAt);
  return t >= start.getTime() && t < shiftAnchor(period, start, 1).getTime();
}

/**
 * Wins and losses for one player. Pass only matches that player took part in. Matches
 * without a winner (121 Checkout) count for neither. Oche has no draws, so there is no third figure.
 */
export function playerRecord(matches: AnyMatch[], playerName: string) {
  const key = playerName.trim().toLowerCase();
  let wins = 0;
  let losses = 0;
  for (const m of matches) {
    const winner = matchWinnerName(m)?.trim().toLowerCase();
    if (!winner) continue;
    if (winner === key) wins += 1;
    else losses += 1;
  }
  return { wins, losses };
}
