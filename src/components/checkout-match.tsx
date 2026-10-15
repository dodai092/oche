"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CheckoutAttempts, CheckoutBoard } from "./checkout-board";
import type { CheckoutConfig, CheckoutGame } from "@/lib/checkout-engine";
import { useGameStore, type CheckoutMatch } from "@/lib/store";

/** One short line of the run settings, for the heading and history. */
export function checkoutSettingsLabel(config: CheckoutConfig) {
  return [
    `Start ${config.startTarget}`,
    `${config.dartsPerAttempt} darts`,
    config.rounds === "infinite"
      ? "Infinite rounds"
      : `${config.rounds} ${config.rounds === 1 ? "round" : "rounds"}`,
  ].join(" · ");
}

/** What just happened, in one sentence, for the status region. */
export function checkoutMessage(game: CheckoutGame) {
  if (game.notice) return `${game.notice} Target is now ${game.target}.`;
  const last = game.turns.at(-1);
  if (
    last?.bust &&
    last.complete &&
    last.attempt === game.attempt &&
    !game.turnDarts.length
  )
    return `Bust. The score is back to ${game.remaining}.`;
  const left = 3 - game.turnDarts.length;
  if (game.turnDarts.length)
    return `${game.turnDarts.length} ${game.turnDarts.length === 1 ? "dart" : "darts"} thrown, ${left} left in this turn.`;
  return `Attempt ${game.attempt}: check out ${game.target}.`;
}

export function CheckoutMatchView({ match }: { match: CheckoutMatch }) {
  const { settings } = useGameStore();
  const game = match.checkout;
  const active = game.players[game.activePlayer];
  return (
    <div className="page-content match-page atc-page checkout-page">
      <h1 className="sr-only">Live 121 Checkout run</h1>
      <div className="match-heading">
        <Link href="/" className="back-link" aria-label="Back to overview">
          <ArrowLeft size={19} />
          <span>Overview</span>
        </Link>
        <div className="match-format">
          <strong>121 Checkout</strong>
          <span>{checkoutSettingsLabel(game.config)}</span>
        </div>
        <span aria-hidden="true" />
      </div>
      <CheckoutBoard game={game} showRoute={settings.showCheckouts} />
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="turn-feedback"
      >
        <h2 data-testid="active-player">{active.name} to throw</h2>
        <p>{checkoutMessage(game)}</p>
      </div>
      <CheckoutAttempts game={game} />
    </div>
  );
}
