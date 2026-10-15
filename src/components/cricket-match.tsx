"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CricketBoard } from "./cricket-board";
import type { CricketMatch } from "@/lib/store";

export const cricketStyleLabel = (style: "standard" | "cutthroat") =>
  style === "standard" ? "Standard" : "Cut-throat";

export function CricketMatchView({ match }: { match: CricketMatch }) {
  const game = match.cricket;
  const active = game.players[game.activePlayer];
  const last = game.turns.at(-1);
  const message = game.notice
    ? `${game.notice}. Leg ${game.leg} starts now.`
    : last
      ? last.complete
        ? `${game.players[last.playerIndex].name} threw ${last.marks} ${last.marks === 1 ? "mark" : "marks"}.`
        : `${last.marks} ${last.marks === 1 ? "mark" : "marks"} this turn, ${3 - game.turnDarts.length} ${3 - game.turnDarts.length === 1 ? "dart" : "darts"} left.`
      : "Throw at 20 to start.";
  return (
    <div className="page-content match-page cricket-page">
      <h1 className="sr-only">Live Cricket match</h1>
      <div className="match-heading">
        <Link href="/" className="back-link" aria-label="Back to overview">
          <ArrowLeft size={19} />
          <span>Overview</span>
        </Link>
        <div className="match-format">
          <strong>Cricket · {cricketStyleLabel(game.config.style)}</strong>
          <span>
            Leg {game.leg} · first to {game.config.legsToWin}
          </span>
        </div>
        <span aria-hidden="true" />
      </div>
      <CricketBoard game={game} />
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="turn-feedback"
      >
        <h2 data-testid="active-player">{active.name} to throw</h2>
        <p>{message}</p>
      </div>
    </div>
  );
}
