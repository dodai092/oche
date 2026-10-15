"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Target,
  Trophy,
  Undo2,
} from "lucide-react";
import { Button } from "./ui/button";
import { AtcBoard, AtcTrack } from "./atc-board";
import { AtcSummary } from "./atc-summary";
import type { AtcConfig } from "@/lib/atc-engine";
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

export function AtcMatchView({ match }: { match: AtcMatch }) {
  const { atcDart, atcFinishTurn, atcUndo, rematch, readOnly } = useGameStore();
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const game = match.atc;
  const active = game.players[game.activePlayer];

  function hit(value: number, mult: 1 | 2 | 3 = multiplier) {
    atcDart({ value, multiplier: mult });
    // A treble is rarely repeated: every dart starts as a single.
    setMultiplier(1);
  }
  function endTurn() {
    if (!game.turnDarts.length) {
      for (let i = 0; i < 3; i++)
        useGameStore.getState().atcDart({ value: 0, multiplier: 1 });
    } else atcFinishTurn();
    setMultiplier(1);
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
        <small className="small muted">{atcSettingsLabel(game.config)}</small>
        <AtcTrack game={game} playerIndex={game.activePlayer} />
      </div>
      <fieldset disabled={readOnly} className="panel scoring-panel atc-input">
        <legend className="sr-only">Scoring controls</legend>
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
            onClick={() => atcUndo()}
            aria-label="Undo dart"
          >
            <Undo2 size={17} /> Undo dart
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!game.events.length}
            onClick={() => atcUndo(true)}
            aria-label="Undo turn"
          >
            <RotateCcw size={16} /> Undo turn
          </Button>
          <Button type="button" variant="outline" onClick={endTurn}>
            End turn <ArrowRight size={16} />
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
