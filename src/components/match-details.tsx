import Link from "next/link";
import { Flag, ArrowRight } from "lucide-react";
import {
  checkoutSuggestions,
  dartLabel,
  playerStats,
  type GameState,
} from "@/lib/engine";
export function MatchDetails({
  game,
  showCheckouts,
}: {
  game: GameState;
  showCheckouts: boolean;
}) {
  const active = game.players[game.activePlayer];
  const route = checkoutSuggestions(
    active.score,
    3 - game.turnDarts.length,
    game.config.doubleOut,
  );
  return (
    <div className="match-detail-content">
      <section className="panel">
        <h2>Match format</h2>
        <p>
          {game.config.startScore} ·{" "}
          {game.config.doubleOut ? "Double out" : "Single out"}
        </p>
        <p>
          First to {game.config.legsToWin}{" "}
          {game.config.legsToWin === 1 ? "leg" : "legs"} per set,{" "}
          {game.config.setsToWin}{" "}
          {game.config.setsToWin === 1 ? "set" : "sets"} to win.
        </p>
        <div className="detail-player-list">
          {game.players.map((p, i) => {
            const stats = playerStats(game, i);
            return (
              <div key={p.id}>
                <h3>{p.name}</h3>
                <p>
                  {p.sets} sets · {p.legs} legs · {stats.darts} darts thrown
                </p>
                <p>
                  {stats.average.toFixed(1)} average · {stats.oneEighties}{" "}
                  maximums
                </p>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel checkout-panel">
        <h2>
          <Flag size={17} /> Checkout
        </h2>
        {!showCheckouts ? (
          <p>
            Suggestions are off.{" "}
            <Link href="/settings">Change in Settings</Link>
          </p>
        ) : route.length ? (
          <div className="checkout-route">
            {route.map((d, i) => (
              <span key={i}>
                {dartLabel(d)}
                {i < route.length - 1 && <ArrowRight size={13} />}
              </span>
            ))}
          </div>
        ) : (
          <p>
            No finish available with {3 - game.turnDarts.length} darts left.
          </p>
        )}
      </section>
      <section className="panel visits-panel">
        <h2>Recent visits</h2>
        {!game.turns.length ? (
          <p>No darts entered yet.</p>
        ) : (
          <div className="visits-list">
            {game.turns
              .slice(-12)
              .reverse()
              .map((t, i) => (
                <div className="visit-row" key={game.turns.length - i}>
                  <span className={`visit-dot color-${t.playerIndex}`} />
                  <div>
                    <strong>{game.players[t.playerIndex].name}</strong>
                    <small>
                      {t.visitScore !== undefined
                        ? `${t.visitScore} total · ${t.dartsUsed} darts`
                        : t.darts.map(dartLabel).join(" · ")}
                    </small>
                  </div>
                  <span className={t.bust ? "bust-text" : ""}>
                    {t.bust ? "Bust" : t.startScore - t.endScore}
                  </span>
                  <strong>{t.endScore}</strong>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
