import { describe, expect, it } from "vitest";
import {
  inPeriod,
  isFuturePeriod,
  periodLabel,
  playerRecord,
  shiftAnchor,
} from "./stats-period";
import type { AnyMatch } from "./store";

const at = (y: number, m: number, d: number) => new Date(y, m, d, 10).toISOString();

describe("stats periods", () => {
  const oct = new Date(2026, 9, 15);

  it("keeps a match inside its month, year and all time", () => {
    expect(inPeriod(at(2026, 9, 1), "month", oct)).toBe(true);
    expect(inPeriod(at(2026, 9, 31), "month", oct)).toBe(true);
    expect(inPeriod(at(2026, 8, 30), "month", oct)).toBe(false);
    expect(inPeriod(at(2026, 10, 1), "month", oct)).toBe(false);
    expect(inPeriod(at(2026, 0, 1), "year", oct)).toBe(true);
    expect(inPeriod(at(2025, 11, 31), "year", oct)).toBe(false);
    expect(inPeriod(at(2019, 3, 3), "all", oct)).toBe(true);
  });

  it("steps the anchor by one month or one year", () => {
    expect(shiftAnchor("month", oct, -1).getMonth()).toBe(8);
    expect(shiftAnchor("month", oct, 1).getMonth()).toBe(10);
    expect(shiftAnchor("year", oct, -1).getFullYear()).toBe(2025);
  });

  it("blocks stepping into a period that has not started", () => {
    const now = new Date(2026, 9, 15);
    expect(isFuturePeriod("month", now, now)).toBe(true);
    expect(isFuturePeriod("month", new Date(2026, 8, 1), now)).toBe(false);
    expect(isFuturePeriod("year", now, now)).toBe(true);
  });

  it("labels the period", () => {
    expect(periodLabel("all", oct)).toBe("All time");
    expect(periodLabel("year", oct)).toBe("2026");
    expect(periodLabel("month", oct)).toContain("2026");
  });
});

describe("playerRecord", () => {
  const winner = (name: string) => ({
    id: name,
    name,
  });
  const match = (winnerName: string | null) =>
    ({
      id: `m-${winnerName}`,
      mode: "x01",
      game: {
        players: [winner("Ana"), winner("Ben")],
        winner: winnerName === "Ana" ? 0 : winnerName === "Ben" ? 1 : undefined,
      },
    }) as unknown as AnyMatch;

  it("counts wins and losses by name, ignoring case and spaces", () => {
    const matches = [match("Ana"), match("Ben"), match("Ben")];
    expect(playerRecord(matches, " ana ")).toEqual({ wins: 1, losses: 2 });
  });

  it("counts a 121 Checkout run, which has no winner, for neither side", () => {
    const checkout = { id: "c", mode: "checkout", checkout: {} } as unknown as AnyMatch;
    expect(playerRecord([checkout], "Ana")).toEqual({ wins: 0, losses: 0 });
  });
});
