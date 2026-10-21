"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { Delete, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { submitVisit, type GameState, type VisitOptions } from "@/lib/engine";
import { useGameStore } from "@/lib/store";
function subscribeToPointer(callback: () => void) {
  const query = window.matchMedia("(pointer:coarse)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
export function VisitEntry({ game }: { game: GameState }) {
  const touch = useSyncExternalStore(
    subscribeToPointer,
    () => window.matchMedia("(pointer:coarse)").matches,
    () => false,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const settings = useGameStore((s) => s.settings),
    updateSettings = useGameStore((s) => s.updateSettings);
  const customKeypad = settings.keyboardMode === "keypad";
  function switchKeyboard() {
    if (customKeypad) {
      flushSync(() => updateSettings({ keyboardMode: "keyboard" }));
      inputRef.current?.focus({ preventScroll: true });
    } else {
      inputRef.current?.blur();
      updateSettings({ keyboardMode: "keypad" });
    }
  }
  const [value, setValue] = useState("");
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
    return { checkoutConfirmed: confirmed };
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
  const lastWasTotal =
    !game.events.length || game.events.at(-1)?.type === "visit";
  return (
    <form
      className={`visit-entry ${customKeypad ? "uses-keypad" : "uses-keyboard"}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirming) submit();
      }}
    >
      <label className="sr-only" htmlFor="visit-score">
        TOTAL FOR THIS VISIT
      </label>
      <div className="score-entry-row">
        <div className="score-input">
          <input
            ref={inputRef}
            id="visit-score"
            aria-label="Visit score"
            aria-describedby="visit-entry-hint"
            inputMode={customKeypad ? "none" : "numeric"}
            readOnly={touch && customKeypad}
            autoComplete="off"
            pattern="[0-9]{1,3}"
            placeholder="Enter a score"
            value={value}
            onChange={(e) => edit(e.target.value)}
            autoFocus={!touch || !customKeypad}
          />
          {value && !customKeypad && (
            <button
              type="button"
              className="score-delete"
              aria-label="Backspace score"
              onClick={() => edit(value.slice(0, -1))}
            >
              <Delete size={22} />
            </button>
          )}
        </div>
        <Button
          type="submit"
          disabled={!value || confirming}
          aria-label="Submit score"
        >
          Submit <ArrowRight size={17} />
        </Button>
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
            <p>Did your final dart hit a double or inner bull?</p>
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
      </div>
      {customKeypad && (
        <>
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
              className="backspace-key"
              aria-label="Backspace score"
              onClick={() => edit(value.slice(0, -1))}
            >
              <Delete size={22} />
            </button>
            <button
              type="button"
              aria-label="Digit 0"
              onClick={() => edit(value + "0")}
            >
              0
            </button>
            <button
              type="button"
              className="clear-score"
              onClick={() => edit("")}
            >
              Clear
            </button>
          </div>
        </>
      )}
      <div className="total-actions">
        <Button
          type="button"
          variant="outline"
          disabled={!game.events.length}
          aria-label={lastWasTotal ? "Undo score" : "Undo dart"}
          onClick={() => undo()}
        >
          <RotateCcw size={17} />
          {lastWasTotal ? "Undo score" : "Undo dart"}
        </Button>
        {!lastWasTotal && (
          // After a typed total, undoing the score already undoes the visit.
          <Button
            type="button"
            variant="outline"
            disabled={!game.events.length}
            onClick={() => undo(true)}
          >
            Undo turn
          </Button>
        )}
      </div>
      <div className="input-tools">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={switchKeyboard}
        >
          {customKeypad ? "Use keyboard" : "Use keypad"}
        </Button>
      </div>
      <p id="visit-entry-hint" className="sr-only">
        Choose a score, then Submit. Switch to keyboard to type and press Enter.
      </p>
    </form>
  );
}
