"use client";
import { useState } from "react";
import { ArrowRight, Flag, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import type { CheckoutVisit } from "@/lib/checkout-engine";

/** Enter a whole visit as one total, styled like the 501 total entry. */
export function CheckoutVisitEntry({
  remaining,
  canUndo,
  onSubmit,
  onUndo,
  onEndRun,
}: {
  remaining: number;
  canUndo: boolean;
  onSubmit: (visit: CheckoutVisit) => void;
  onUndo: () => void;
  onEndRun: () => void;
}) {
  const [value, setValue] = useState("");
  const [darts, setDarts] = useState<1 | 2 | 3>(3);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function edit(next: string) {
    if (/^\d{0,3}$/.test(next)) {
      setValue(next);
      setError(null);
      setFinishing(false);
    }
  }
  function send(visit: CheckoutVisit) {
    try {
      onSubmit(visit);
      setValue("");
      setDarts(3);
      setFinishing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check your score.");
    }
  }
  function submit() {
    if (!value) return;
    const score = Number(value);
    // Hitting the remaining score needs one more answer: was the last dart a double?
    if (score === remaining) setFinishing(true);
    else send({ score, darts: 3, checkout: false });
  }

  return (
    <div className="visit-entry">
      <div className="score-entry-row">
        <div className="score-input">
          <input
            aria-label="Visit score"
            inputMode="none"
            readOnly
            placeholder="Enter a score"
            value={value}
          />
        </div>
        <Button type="button" disabled={!value} onClick={submit}>
          Submit <ArrowRight size={17} />
        </Button>
      </div>
      {finishing && (
        <section className="finish-confirmation">
          <p>
            {Number(value)} finishes {remaining}. Was the last dart a double?
          </p>
          <div className="segmented" aria-label="Darts used">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={darts === n}
                className={darts === n ? "selected" : ""}
                onClick={() => setDarts(n)}
              >
                {n} {n === 1 ? "dart" : "darts"}
              </button>
            ))}
          </div>
          <div className="action-row">
            <Button
              type="button"
              onClick={() =>
                send({ score: Number(value), darts, checkout: true })
              }
            >
              Double finish
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                send({ score: Number(value), darts, checkout: false })
              }
            >
              Not a double (bust)
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFinishing(false)}
            >
              Cancel
            </Button>
          </div>
        </section>
      )}
      {error && (
        <p role="alert" className="visit-error">
          {error}
        </p>
      )}
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
        <span className="keypad-blank" aria-hidden="true" />
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
          variant="outline"
          disabled={!canUndo}
          aria-label="Undo score"
          onClick={onUndo}
        >
          <RotateCcw size={17} />
          Undo score
        </Button>
        <Button type="button" variant="outline" onClick={onEndRun}>
          <Flag size={17} /> End run
        </Button>
      </div>
    </div>
  );
}
