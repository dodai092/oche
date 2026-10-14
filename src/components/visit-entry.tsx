"use client";
import { useState } from "react";
import { Delete, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { submitVisit, type GameState, type VisitOptions } from "@/lib/engine";
import { useGameStore } from "@/lib/store";
export function VisitEntry({ game }: { game: GameState }) {
  const [value, setValue] = useState("");
  const [dartsUsed, setDartsUsed] = useState(3);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const visit = useGameStore((s) => s.visit),
    undo = useGameStore((s) => s.undo);
  function edit(next: string) {
    if (/^\d{0,3}$/.test(next)) {
      setValue(next);
      setError(null);
      setConfirming(false);
    }
  }
  function options(confirmed: boolean): VisitOptions {
    return {
      dartsUsed,
      checkoutConfirmed: confirmed,
      checkoutAttempts:
        confirming ||
        confirmed ||
        (!game.config.doubleOut &&
          Number(value) === game.players[game.activePlayer].score)
          ? Math.max(1, attempts)
          : attempts,
    };
  }
  function commit(confirmed: boolean) {
    try {
      visit(Number(value), options(confirmed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check your score.");
    }
  }
  function submit() {
    if (!value) return;
    try {
      submitVisit(game, Number(value), options(false));
      if (
        game.config.doubleOut &&
        Number(value) === game.players[game.activePlayer].score
      ) {
        setConfirming(true);
        setError(null);
        return;
      }
      commit(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check your score.");
    }
  }
  const lastWasTotal = game.events.at(-1)?.type === "visit";
  return (
    <form
      className="visit-entry"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirming) submit();
      }}
    >
      <label className="field-label" htmlFor="visit-score">
        TOTAL FOR THIS VISIT
      </label>
      <div className="score-entry-row">
        <input
          id="visit-score"
          aria-label="Visit score"
          aria-describedby="visit-entry-hint"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]{1,3}"
          placeholder="Enter a score"
          value={value}
          onChange={(e) => edit(e.target.value)}
          autoFocus={
            typeof window !== "undefined" &&
            window.matchMedia("(pointer:fine)").matches
          }
        />
        <Button
          type="submit"
          disabled={!value || confirming}
          aria-label="Submit score"
        >
          Submit <ArrowRight size={17} />
        </Button>
      </div>
      {error && (
        <p role="alert" className="visit-error">
          {error}
        </p>
      )}
      {confirming && (
        <section
          className="finish-confirmation"
          aria-labelledby="finish-confirmation-title"
        >
          <h3 id="finish-confirmation-title">Confirm your finish</h3>
          <p>
            Did your final dart hit a double or inner bull? Set the darts thrown
            and checkout attempts below.
          </p>
          <div className="action-row">
            <Button type="button" onClick={() => commit(true)}>
              Confirm double-out
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => commit(false)}
            >
              No double, record bust
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}
      <details className="visit-details" open={confirming ? true : undefined}>
        <summary>
          Darts & checkout attempts{" "}
          <span>
            {dartsUsed} darts / {confirming ? Math.max(1, attempts) : attempts}{" "}
            attempts
          </span>
        </summary>
        <div className="two-fields">
          <label className="field-label">
            Darts thrown
            <select
              aria-label="Darts thrown"
              value={dartsUsed}
              onChange={(e) => {
                const n = Number(e.target.value);
                setDartsUsed(n);
                setAttempts(Math.min(attempts, n));
                setError(null);
              }}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n} dart{n === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Checkout attempts
            <select
              aria-label="Checkout attempts"
              value={confirming ? Math.max(1, attempts) : attempts}
              onChange={(e) => setAttempts(Number(e.target.value))}
            >
              {Array.from({ length: dartsUsed + 1 }, (_, i) => i)
                .filter((n) => !confirming || n > 0)
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <p className="small muted">
          Report how many darts you threw at a checkout. Defaults are three
          darts and no checkout attempts.
        </p>
      </details>
      <div className="total-keypad" aria-label="Score keypad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            type="button"
            key={n}
            aria-label={`Digit ${n}`}
            onClick={() => edit(value + String(n))}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          aria-label="Backspace score"
          onClick={() => edit(value.slice(0, -1))}
        >
          <Delete size={23} />
        </button>
        <button
          type="button"
          aria-label="Digit 0"
          onClick={() => edit(value + "0")}
        >
          0
        </button>
        <button type="button" className="clear-score" onClick={() => edit("")}>
          Clear
        </button>
      </div>
      <div className="total-actions">
        <Button
          type="button"
          variant="ghost"
          disabled={!game.events.length}
          aria-label={lastWasTotal ? "Undo score" : "Undo dart"}
          onClick={() => undo()}
        >
          <RotateCcw size={17} />
          {lastWasTotal ? "Undo score" : "Undo dart"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={!game.events.length}
          onClick={() => undo(true)}
        >
          Undo turn
        </Button>
      </div>
      <p id="visit-entry-hint" className="keypad-hint">
        Type your visit total and press Enter, or use the keypad and Submit.
        Scores count only after submission.
      </p>
    </form>
  );
}
