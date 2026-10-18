"use client";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Trophy,
  Undo2,
} from "lucide-react";
import { Button } from "./ui/button";
import { AtcScoreCards } from "./atc-scorecards";
import { DartScoreField } from "./dart-score-field";
import { AtcSummary } from "./atc-summary";
import { atcCurrent, type AtcConfig, type AtcStep } from "@/lib/atc-engine";
import { dartLabel } from "@/lib/engine";
import { useGameStore, type AtcMatch } from "@/lib/store";

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

/** The keys for the current target only: S, D and T of the number, or the two bull keys. */
function targetKeys(step: AtcStep | undefined) {
  if (!step) return [];
  if (step.bull) {
    return [
      { label: "Outer", aria: "Outer bull", value: 25, mult: 1 as const },
      { label: "Bull", aria: "Inner bull", value: 25, mult: 2 as const },
    ];
  }
  return ([1, 2, 3] as const).map((mult) => ({
    label: `${["S", "D", "T"][mult - 1]}${step.target}`,
    aria: `${["Hit", "Double", "Triple"][mult - 1]} ${step.target}`,
    value: step.target,
    mult,
  }));
}

export function AtcMatchView({ match }: { match: AtcMatch }) {
  const { atcDart, atcFinishTurn, atcUndo, rematch, readOnly } = useGameStore();
  const game = match.atc;
  const active = game.players[game.activePlayer];
  const keys = targetKeys(atcCurrent(game, game.activePlayer)?.step);

  function hit(value: number, mult: 1 | 2 | 3) {
    atcDart({ value, multiplier: mult });
  }

  if (game.status === "complete") {
    const winner = game.players[game.winner ?? 0];
    return (
      <div className="page-content">
        <section className="completion panel">
          <span className="winner-icon">
            <Trophy size={40} />
          </span>
          <div className="eyebrow">AROUND THE CLOCK. DONE.</div>
          <h1>{winner.name} wins!</h1>
          <p>
            Around the Clock · {game.leg} {game.leg === 1 ? "leg" : "legs"} played
          </p>
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
            onClick={() => atcUndo()}
          >
            <Undo2 size={16} /> Undo winning dart
          </Button>
          <AtcSummary game={game} />
        </section>
      </div>
    );
  }

  const last = game.turns.at(-1);
  const left = 3 - game.turnDarts.length;
  const message = game.notice
    ? `${game.notice}. Leg ${game.leg} starts now.`
    : last
      ? last.complete
        ? `${game.players[last.playerIndex].name} made ${last.hits} ${last.hits === 1 ? "hit" : "hits"}.`
        : left
          ? `${last.hits} ${last.hits === 1 ? "hit" : "hits"} this turn, ${left} ${left === 1 ? "dart" : "darts"} left.`
          : `${last.hits} ${last.hits === 1 ? "hit" : "hits"} this turn. Submit to pass the turn.`
      : "Hit the first number to start.";

  return (
    <div className="page-content match-page atc-page">
      <h1 className="sr-only">Live Around the Clock match</h1>
      <div className="match-heading">
        <Link href="/" className="back-link" aria-label="Back">
          <ArrowLeft size={19} />
          <span>Back</span>
        </Link>
        <div className="match-format">
          <strong>Around the Clock</strong>
          <span>
            Leg {game.leg} · first to {game.config.legsToWin}
          </span>
        </div>
        <span aria-hidden="true" />
      </div>
      <AtcScoreCards game={game} />
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="turn-feedback"
      >
        <h2 data-testid="active-player">{active.name} to throw</h2>
        <p>{message}</p>
      </div>
      <fieldset disabled={readOnly} className="scoring-panel atc-input">
        <legend className="sr-only">Scoring controls</legend>
        <DartScoreField
          slots={game.turnDarts.map((d) => ({ main: dartLabel(d) }))}
          onSubmit={atcFinishTurn}
        />
        <div
          className={`atc-keys ${keys.length === 2 ? "is-bull" : ""}`}
          role="group"
          aria-label="Score keypad"
        >
          {keys.map((k) => (
            <button
              key={`${k.label}-${k.mult}`}
              type="button"
              aria-label={k.aria}
              onClick={() => hit(k.value, k.mult)}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="atc-bottom-row">
          <button
            type="button"
            aria-label="Undo dart"
            disabled={!game.events.length}
            onClick={() => atcUndo()}
          >
            <Undo2 size={22} />
          </button>
          <button
            type="button"
            aria-label="Miss"
            onClick={() => hit(0, 1)}
          >
            MISS
          </button>
        </div>
        <div className="scoring-actions">
          <Button
            type="button"
            variant="ghost"
            disabled={!game.events.length}
            onClick={() => atcUndo(true)}
            aria-label="Undo turn"
          >
            <RotateCcw size={16} /> Undo turn
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
