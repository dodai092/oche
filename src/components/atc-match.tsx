"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AtcBoard, AtcTrack } from "./atc-board";
import type { AtcConfig } from "@/lib/atc-engine";
import type { AtcMatch } from "@/lib/store";

const FINISH = { "single-bull": "Single bull", bullseye: "Bullseye", all: "All" };
const FIELD = { any: "Any", single: "Single", double: "Double", treble: "Treble" };
const ORDER = {
  "low-high": "Low to high",
  "high-low": "High to low",
  random: "Random",
};

/** One short line of the match settings, for the heading and history. */
export function atcSettingsLabel(config: AtcConfig) {
  const parts = [ORDER[config.orderMode], `Finish ${FINISH[config.finish]}`];
  if (config.field !== "any") parts.push(`${FIELD[config.field]} only`);
  if (config.hitsPerTarget > 1) parts.push(`${config.hitsPerTarget} hits`);
  if (config.increase) parts.push("Increase by segment");
  return parts.join(" · ");
}

export function AtcMatchView({ match }: { match: AtcMatch }) {
  const game = match.atc;
  const active = game.players[game.activePlayer];
  const last = game.turns.at(-1);
  const left = 3 - game.turnDarts.length;
  const message = game.notice
    ? `${game.notice}. Leg ${game.leg} starts now.`
    : last
      ? last.complete
        ? `${game.players[last.playerIndex].name} made ${last.hits} ${last.hits === 1 ? "hit" : "hits"}.`
        : `${last.hits} ${last.hits === 1 ? "hit" : "hits"} this turn, ${left} ${left === 1 ? "dart" : "darts"} left.`
      : "Hit the first number to start.";
  return (
    <div className="page-content match-page atc-page">
      <h1 className="sr-only">Live Around the Clock match</h1>
      <div className="match-heading">
        <Link href="/" className="back-link" aria-label="Back to overview">
          <ArrowLeft size={19} />
          <span>Overview</span>
        </Link>
        <div className="match-format">
          <strong>Around the Clock</strong>
          <span>
            Leg {game.leg} · first to {game.config.legsToWin}
          </span>
        </div>
        <span aria-hidden="true" />
      </div>
      <AtcBoard game={game} />
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="turn-feedback"
      >
        <h2 data-testid="active-player">{active.name} to throw</h2>
        <p>{message}</p>
      </div>
      <div className="atc-sequence panel">
        <small className="muted">{atcSettingsLabel(game.config)}</small>
        <AtcTrack game={game} playerIndex={game.activePlayer} />
      </div>
    </div>
  );
}
