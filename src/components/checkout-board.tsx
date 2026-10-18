import { checkoutSuggestions, dartLabel } from "@/lib/engine";
import type { CheckoutGame } from "@/lib/checkout-engine";

export function CheckoutBoard({
  game,
  showRoute,
}: {
  game: CheckoutGame;
  showRoute: boolean;
}) {
  const dartsLeft = game.config.dartsPerAttempt - game.dartsUsed;
  const turnLeft = Math.min(3 - game.turnDarts.length, dartsLeft);
  const route =
    showRoute && game.status === "playing"
      ? checkoutSuggestions(game.remaining, turnLeft, true)
      : [];
  const rounds = game.config.rounds;
  return (
    <section
      className="panel atc-board checkout-board"
      aria-label="121 Checkout scoreboard"
    >
      <div className="checkout-figures">
        <div>
          <span className="checkout-label">Target</span>
          <strong data-testid="checkout-target">{game.target}</strong>
        </div>
        <div>
          <span className="checkout-label">Remaining</span>
          <strong data-testid="checkout-remaining" className="lime">
            {game.remaining}
          </strong>
        </div>
      </div>
      <dl className="checkout-facts">
        <div>
          <dt>Attempt</dt>
          <dd data-testid="checkout-attempt">
            {rounds === "infinite" ? game.attempt : `${game.attempt} of ${rounds}`}
          </dd>
        </div>
        <div>
          <dt>Darts left</dt>
          <dd data-testid="checkout-darts-left">{dartsLeft}</dd>
        </div>
        <div>
          <dt>Safehouse</dt>
          <dd data-testid="checkout-safehouse">{game.safehouse}</dd>
        </div>
        <div>
          <dt>Best</dt>
          <dd data-testid="checkout-best">{game.best || "None"}</dd>
        </div>
      </dl>
      {route.length > 0 && (
        <p className="checkout-route small muted">
          Route: <strong>{route.map(dartLabel).join("  ")}</strong>
        </p>
      )}
    </section>
  );
}

/** The finished attempts of the run, newest last. Reuses the sequence chip styles. */
export function CheckoutAttempts({ game }: { game: CheckoutGame }) {
  const recent = game.attempts.slice(-12);
  if (!recent.length) return null;
  return (
    <div className="atc-sequence panel">
      <ol className="atc-track" aria-label="Attempts">
        {recent.map((a) => (
          <li key={a.number} className={a.outcome === "cleared" ? "done" : ""}>
            {a.target}
            <span className="sr-only"> {a.outcome}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
