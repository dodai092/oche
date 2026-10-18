"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  RotateCcw,
  Target,
  Trophy,
  Undo2,
} from "lucide-react";
import { Button } from "./ui/button";
import { CheckoutAttempts, CheckoutBoard } from "./checkout-board";
import { CheckoutSummary } from "./checkout-summary";
import { CheckoutVisitEntry } from "./checkout-visit-entry";
import type { CheckoutConfig, CheckoutGame } from "@/lib/checkout-engine";
import { dartLabel } from "@/lib/engine";
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
  const {
    settings,
    updateSettings,
    checkoutDart,
    checkoutVisit,
    checkoutFinishTurn,
    checkoutEndRun,
    checkoutUndo,
    rematch,
    readOnly,
  } = useGameStore();
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const game = match.checkout;
  const active = game.players[game.activePlayer];
  const mode = game.turnDarts.length ? "darts" : settings.entryMode;

  function hit(value: number, mult: 1 | 2 | 3 = multiplier) {
    checkoutDart({ value, multiplier: mult });
    // A treble is rarely repeated: every dart starts as a single.
    setMultiplier(1);
  }

  if (game.status === "complete") {
    const ended = game.events.at(-1)?.type === "end-run";
    return (
      <div className="page-content">
        <section className="completion panel">
          <span className="winner-icon">
            <Trophy size={40} />
          </span>
          <div className="eyebrow">121 CHECKOUT. RUN COMPLETE.</div>
          <h1>
            {game.best ? `Best checkout ${game.best}` : "No checkout this run"}
          </h1>
          <p>{checkoutSettingsLabel(game.config)}</p>
          <div className="action-row">
            <Button disabled={readOnly} onClick={() => rematch()}>
              Rematch with these players <ArrowRight size={17} />
            </Button>
            <Button asChild variant="outline">
              <Link href="/new">Change match setup</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/history">View match history</Link>
            </Button>
          </div>
          <Button
            variant="ghost"
            disabled={readOnly}
            onClick={() => checkoutUndo()}
          >
            <Undo2 size={16} /> {ended ? "Resume run" : "Undo last dart"}
          </Button>
          <CheckoutSummary game={game} />
        </section>
      </div>
    );
  }

  return (
    <div className="page-content match-page atc-page checkout-page">
      <h1 className="sr-only">Live 121 Checkout run</h1>
      <div className="match-heading">
        <Link href="/" className="back-link" aria-label="Back">
          <ArrowLeft size={19} />
          <span>Back</span>
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
        className={`turn-feedback ${checkoutMessage(game).startsWith("Bust") ? "is-bust" : game.notice?.startsWith("Cleared") ? "is-checkout" : ""}`}
      >
        <h2 data-testid="active-player">{active.name} to throw</h2>
        <p>{checkoutMessage(game)}</p>
      </div>
      <CheckoutAttempts game={game} />
      <fieldset
        disabled={readOnly}
        className="panel scoring-panel atc-input checkout-input"
      >
        <legend className="sr-only">Scoring controls</legend>
        <div className="segmented entry-mode" aria-label="Score entry mode">
          <button
            type="button"
            aria-pressed={mode === "total"}
            className={mode === "total" ? "selected" : ""}
            disabled={game.turnDarts.length > 0}
            onClick={() => updateSettings({ entryMode: "total" })}
          >
            Visit total
          </button>
          <button
            type="button"
            aria-pressed={mode === "darts"}
            className={mode === "darts" ? "selected" : ""}
            onClick={() => updateSettings({ entryMode: "darts" })}
          >
            Dart-by-dart
          </button>
        </div>
        {mode === "total" ? (
          <>
            <CheckoutVisitEntry
              remaining={game.remaining}
              canUndo={game.events.length > 0}
              onSubmit={checkoutVisit}
              onUndo={() => checkoutUndo()}
              onEndRun={() => checkoutEndRun()}
            />
          </>
        ) : (
          <>
            <div className="visit-display">
              <div className="dart-slots">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`dart-slot ${game.turnDarts[i] ? "filled" : ""}`}
                  >
                    <span>DART {i + 1}</span>
                    <strong>
                      {game.turnDarts[i] ? (
                        dartLabel(game.turnDarts[i])
                      ) : (
                        <span className="slot-line" />
                      )}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="visit-total">
                <span>THIS VISIT</span>
                <strong>
                  {game.turnDarts.reduce(
                    (s, d) => s + d.value * d.multiplier,
                    0,
                  )}
                </strong>
              </div>
            </div>
            <div className="segmented multiplier-options">
              {(
                [
                  { label: "Single", value: 1 },
                  { label: "Double", value: 2 },
                  { label: "Triple", value: 3 },
                ] as const
              ).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={multiplier === m.value}
                  className={multiplier === m.value ? "selected" : ""}
                  onClick={() => setMultiplier(m.value)}
                >
                  {m.label}
                  <span aria-hidden="true">×{m.value}</span>
                </button>
              ))}
            </div>
            <div className="keypad atc-keypad">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Hit ${n}`}
                  onClick={() => hit(n)}
                >
                  <span className="hit-multiplier">
                    {multiplier === 1 ? "" : multiplier === 2 ? "D" : "T"}
                  </span>
                  {n}
                </button>
              ))}
            </div>
            <div className="bull-row">
              <button
                type="button"
                aria-label="Miss"
                onClick={() => hit(0, 1)}
                className="miss-button"
              >
                MISS <span>0</span>
              </button>
              <button
                type="button"
                aria-label="Outer bull"
                onClick={() => hit(25, 1)}
              >
                OUTER BULL <span>25</span>
              </button>
              <button
                type="button"
                aria-label="Inner bull"
                onClick={() => hit(25, 2)}
                className="bull-button"
              >
                <Target size={17} /> BULL <span>50</span>
              </button>
            </div>
            <div className="scoring-actions">
              <Button
                type="button"
                variant="ghost"
                disabled={!game.events.length}
                onClick={() => checkoutUndo()}
                aria-label="Undo dart"
              >
                <Undo2 size={17} /> Undo dart
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={!game.events.length}
                onClick={() => checkoutUndo(true)}
                aria-label="Undo turn"
              >
                <RotateCcw size={16} /> Undo turn
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!game.turnDarts.length}
                onClick={() => {
                  checkoutFinishTurn();
                  setMultiplier(1);
                }}
              >
                End turn <ArrowRight size={16} />
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => checkoutEndRun()}
              >
                <Flag size={16} /> End run
              </Button>
            </div>
          </>
        )}
      </fieldset>
    </div>
  );
}
