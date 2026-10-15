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
import { CricketBoard } from "./cricket-board";
import { CricketSummary } from "./cricket-summary";
import { CRICKET_NUMBERS } from "@/lib/cricket-engine";
import { dartLabel } from "@/lib/engine";
import { useGameStore, type CricketMatch } from "@/lib/store";

export const cricketStyleLabel = (style: "standard" | "cutthroat") =>
  style === "standard" ? "Standard" : "Cut-throat";

export function CricketMatchView({ match }: { match: CricketMatch }) {
  const { cricketDart, cricketFinishTurn, cricketUndo, rematch, readOnly } =
    useGameStore();
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const game = match.cricket;
  const active = game.players[game.activePlayer];

  function hit(value: number, mult: 1 | 2 | 3 = multiplier) {
    cricketDart({ value, multiplier: mult });
    // A triple is rarely repeated: every dart starts as a single.
    setMultiplier(1);
  }
  function endTurn() {
    if (!game.turnDarts.length) {
      for (let i = 0; i < 3; i++)
        useGameStore.getState().cricketDart({ value: 0, multiplier: 1 });
    } else cricketFinishTurn();
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
          <div className="eyebrow">GAME. SHOT. MATCH.</div>
          <h1>{winner.name} wins!</h1>
          <p>
            Cricket · {cricketStyleLabel(game.config.style)} · {game.leg}{" "}
            {game.leg === 1 ? "leg" : "legs"} played
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
            onClick={() => cricketUndo()}
          >
            <Undo2 size={16} /> Undo winning dart
          </Button>
          <CricketSummary game={game} />
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
        ? `${game.players[last.playerIndex].name} threw ${last.marks} ${last.marks === 1 ? "mark" : "marks"}.`
        : `${last.marks} ${last.marks === 1 ? "mark" : "marks"} this turn, ${left} ${left === 1 ? "dart" : "darts"} left.`
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
      <fieldset disabled={readOnly} className="panel scoring-panel cricket-input">
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
        <div className="keypad cricket-keypad">
          {CRICKET_NUMBERS.filter((n) => n !== 25).map((n) => (
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
            OUTER BULL <span>1 mark</span>
          </button>
          <button
            type="button"
            aria-label="Inner bull"
            onClick={() => hit(25, 2)}
            className="bull-button"
          >
            <Target size={17} /> BULL <span>2 marks</span>
          </button>
        </div>
        <div className="scoring-actions">
          <Button
            type="button"
            variant="ghost"
            disabled={!game.events.length}
            onClick={() => cricketUndo()}
            aria-label="Undo dart"
          >
            <Undo2 size={17} /> Undo dart
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!game.events.length}
            onClick={() => cricketUndo(true)}
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
