"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, RotateCcw, Trophy, Undo2 } from "lucide-react";
import { Button } from "./ui/button";
import { CricketScoreCards } from "./cricket-scorecards";
import { DartScoreField } from "./dart-score-field";
import { CricketSummary } from "./cricket-summary";
import { CRICKET_NUMBERS } from "@/lib/cricket-engine";
import type { Dart } from "@/lib/engine";
import { useGameStore, type CricketMatch } from "@/lib/store";

const MULTIPLIER_WORD = { 1: "Hit", 2: "Double", 3: "Triple" } as const;
const MULTIPLIER_PREFIX = { 1: "S", 2: "D", 3: "T" } as const;

// One dot per mark: single shows 1, double 2, triple 3.
function Marks({ count }: { count: number }) {
  return (
    <span className="cricket-marks" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}

// Left-hand column: the player's marks on one number. 1 is a slash, 2 a cross, 3 a circled cross.
function MarkSymbol({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      role="img"
      aria-label={count === 1 ? "1 mark" : `${count} marks`}
    >
      {count === 1 && <path d="M5 19 19 5" />}
      {count === 2 && <path d="M5 5 19 19M19 5 5 19" />}
      {count === 3 && (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M6 6 18 18M18 6 6 18" />
        </>
      )}
    </svg>
  );
}

function dartName(dart: Dart) {
  if (dart.value === 0) return "Miss";
  if (dart.value === 25 && dart.multiplier === 2) return "Bull";
  return `${MULTIPLIER_PREFIX[dart.multiplier]}${dart.value}`;
}

export const cricketStyleLabel = (style: "standard" | "cutthroat") =>
  style === "standard" ? "Standard" : "Cut-throat";

export function CricketMatchView({ match }: { match: CricketMatch }) {
  const { cricketDart, cricketFinishTurn, cricketUndo, rematch, readOnly } =
    useGameStore();
  const game = match.cricket;
  const active = game.players[game.activePlayer];

  function hit(value: number, mult: 1 | 2 | 3) {
    cricketDart({ value, multiplier: mult });
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
        : left
          ? `${last.marks} ${last.marks === 1 ? "mark" : "marks"} this turn, ${left} ${left === 1 ? "dart" : "darts"} left.`
          : `${last.marks} ${last.marks === 1 ? "mark" : "marks"} this turn. Submit to pass the turn.`
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
      <CricketScoreCards game={game} />
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
        <DartScoreField
          slots={game.turnDarts.map((d) => ({
            main: String(d.value * d.multiplier),
            sub: dartName(d),
          }))}
          onSubmit={cricketFinishTurn}
        />
        <div className="cricket-matrix" role="group" aria-label="Score keypad">
          {CRICKET_NUMBERS.filter((n) => n !== 25).map((n) => (
            <div className="cricket-row" key={n}>
              <span className="cricket-row-mark">
                <MarkSymbol count={active.marks[CRICKET_NUMBERS.indexOf(n)]} />
              </span>
              {([1, 2, 3] as const).map((m) => (
                <button
                  key={`${n}-${m}`}
                  type="button"
                  aria-label={`${MULTIPLIER_WORD[m]} ${n}`}
                  onClick={() => hit(n, m)}
                >
                  {n}
                  <Marks count={m} />
                </button>
              ))}
            </div>
          ))}
          <div className="cricket-row">
            <span className="cricket-row-mark" />
            <button
              type="button"
              aria-label="Outer bull"
              onClick={() => hit(25, 1)}
            >
              Bull
              <Marks count={1} />
            </button>
            <button
              type="button"
              aria-label="Inner bull"
              onClick={() => hit(25, 2)}
            >
              Bull
              <Marks count={2} />
            </button>
            <button type="button" aria-label="Miss" onClick={() => hit(0, 1)}>
              Miss
            </button>
          </div>
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
        </div>
      </fieldset>
    </div>
  );
}
