"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RotateCcw,
  Undo2,
  ArrowRight,
  Target,
  Trophy,
  Crosshair,
  Check,
  Flag,
} from "lucide-react";
import { VisitEntry } from "./visit-entry";
import { Button } from "./ui/button";
import { useGameStore } from "@/lib/store";
import {
  checkoutSuggestions,
  dartLabel,
  playerStats,
  type Dart,
} from "@/lib/engine";
export function LiveMatch() {
  const { current, dart, undo, finishTurn, settings, storageError } =
    useGameStore();
  const [entryMode, setEntryMode] = useState<"total" | "darts">(() =>
    useGameStore.getState().current?.game.turnDarts.length ? "darts" : "total",
  );
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  if (!current)
    return (
      <div className="page-content">
        <div className="empty-state">
          <Target size={44} />
          <h1>The board is waiting.</h1>
          <p>Set up a local match to start scoring.</p>
          <Button asChild>
            <Link href="/new">
              Start a match <ArrowRight size={18} />
            </Link>
          </Button>
        </div>
      </div>
    );
  const game = current.game,
    active = game.players[game.activePlayer];
  const routes = checkoutSuggestions(
    active.score,
    3 - game.turnDarts.length,
    game.config.doubleOut,
  );
  const lastTurn = game.turns.at(-1);
  const mode = game.turnDarts.length ? "darts" : entryMode;
  function hit(value: number, mult: 1 | 2 | 3 = multiplier) {
    dart({ value, multiplier: mult });
    if (!useGameStore.getState().current?.game.turnDarts.length)
      setMultiplier(1);
  }
  function endVisit() {
    if (!game.turnDarts.length) {
      for (let i = 0; i < 3; i++)
        useGameStore.getState().dart({ value: 0, multiplier: 1 });
    } else finishTurn();
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
            {game.config.startScore} ·{" "}
            {game.config.doubleOut ? "Double out" : "Single out"} ·{" "}
            {game.turns.filter((t) => t.checkout).length} legs played
          </p>
          <div className="completion-stats">
            {game.players.map((p, i) => {
              const stats = playerStats(game, i);
              return (
                <div key={p.id}>
                  <span className={`avatar color-${i}`}>
                    {p.name.slice(0, 1)}
                  </span>
                  <h3>{p.name}</h3>
                  <strong>{stats.average.toFixed(1)}</strong>
                  <small>3-DART AVERAGE</small>
                  <p>
                    {p.sets} sets · {stats.checkouts} legs won · {stats.darts}{" "}
                    darts
                  </p>
                </div>
              );
            })}
          </div>
          <div className="action-row">
            <Button asChild>
              <Link href="/new">
                Play again <ArrowRight size={17} />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/history">View match history</Link>
            </Button>
          </div>
          <Button variant="ghost" onClick={() => undo()}>
            {" "}
            <Undo2 size={16} />{" "}
            {game.events.at(-1)?.type === "visit"
              ? "Undo winning score"
              : "Undo winning dart"}
          </Button>
        </section>
      </div>
    );
  }
  return (
    <div className="page-content match-page">
      <div className="match-heading">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> Overview
        </Link>
        <div className="match-tags">
          <span className="pill">
            <span className="status-dot" /> LIVE MATCH
          </span>
          <span>
            {game.config.startScore} ·{" "}
            {game.config.doubleOut ? "DOUBLE OUT" : "SINGLE OUT"}
          </span>
        </div>
        <span className="small muted">
          SET {game.set} / LEG {game.leg}
        </span>
      </div>
      <div
        className="scoreboard"
        style={{
          gridTemplateColumns: `repeat(${game.players.length}, minmax(0, 1fr))`,
        }}
      >
        {game.players.map((p, i) => {
          const stats = playerStats(game, i);
          return (
            <article
              key={p.id}
              className={`player-score ${i === game.activePlayer ? "is-active" : ""}`}
            >
              <div className="player-score-head">
                <span className={`avatar color-${i}`}>
                  {p.name.slice(0, 1)}
                </span>
                <h2>{p.name}</h2>
                {i === game.activePlayer && (
                  <span className="throwing-badge">TO THROW</span>
                )}
              </div>
              <div className="big-score" data-testid={`score-${i}`}>
                {p.score}
              </div>
              <div className="score-sub">
                <span>
                  {p.sets} <small>SETS</small>
                </span>
                <span>
                  {p.legs} <small>LEGS</small>
                </span>
                <span>
                  {stats.average.toFixed(1)} <small>AVG</small>
                </span>
              </div>
              <div className="score-progress">
                <span
                  style={{
                    width: `${((game.config.startScore - p.score) / game.config.startScore) * 100}%`,
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>
      <div className="live-grid">
        <section className="panel scoring-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">AT THE OCHE</span>
              <h2 data-testid="active-player">
                {active.name}
                <span className="muted">, your throw.</span>
              </h2>
            </div>
            <span className="darts-left">
              {3 - game.turnDarts.length} DARTS LEFT
            </span>
          </div>
          <div className="segmented entry-mode" aria-label="Score entry mode">
            <button
              aria-pressed={mode === "total"}
              className={mode === "total" ? "selected" : ""}
              disabled={game.turnDarts.length > 0}
              onClick={() => setEntryMode("total")}
            >
              Visit total
            </button>
            <button
              aria-pressed={mode === "darts"}
              className={mode === "darts" ? "selected" : ""}
              onClick={() => setEntryMode("darts")}
            >
              Dart-by-dart
            </button>
          </div>
          {mode === "total" ? (
            <VisitEntry
              key={`${current.id}-${game.events.length}`}
              game={game}
            />
          ) : (
            <>
              <div className="visit-display">
                <div className="dart-slots">
                  {[0, 1, 2].map((_, i) => (
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
                    aria-pressed={multiplier === m.value}
                    className={multiplier === m.value ? "selected" : ""}
                    onClick={() => setMultiplier(m.value)}
                  >
                    {m.label}
                    <span aria-hidden="true">×{m.value}</span>
                  </button>
                ))}
              </div>
              <div className="keypad">
                {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
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
                <button onClick={() => hit(0, 1)} className="miss-button">
                  MISS <span>0</span>
                </button>
                <button onClick={() => hit(25, 1)}>
                  OUTER BULL <span>25</span>
                </button>
                <button onClick={() => hit(25, 2)} className="bull-button">
                  <Target size={17} /> BULL <span>50</span>
                </button>
              </div>
              <div className="scoring-actions">
                <Button
                  variant="ghost"
                  disabled={!game.events.length}
                  onClick={() => undo()}
                  aria-label="Undo dart"
                >
                  <Undo2 size={17} /> Undo dart
                </Button>
                <Button
                  variant="ghost"
                  disabled={!game.events.length}
                  onClick={() => undo(true)}
                  aria-label="Undo turn"
                >
                  <RotateCcw size={16} /> Undo turn
                </Button>
                <Button variant="outline" onClick={endVisit}>
                  End turn <ArrowRight size={16} />
                </Button>
              </div>
              <p className="keypad-hint">
                Choose a multiplier, then tap the segment. Bull buttons always
                score 25 or 50.
              </p>
            </>
          )}
        </section>
        <aside className="match-aside">
          <section className="panel checkout-panel">
            <div className="section-heading">
              <h2>
                <Flag size={18} /> The finish line
              </h2>
            </div>
            {settings.showCheckouts ? (
              routes.length ? (
                <>
                  <span className="eyebrow lime">{active.score} CHECKOUT</span>
                  <div className="checkout-route">
                    {routes.map((d, i) => (
                      <span key={i}>
                        {dartLabel(d)}
                        {i < routes.length - 1 && <ArrowRight size={13} />}
                      </span>
                    ))}
                  </div>
                  <p>
                    A way out in {routes.length} dart
                    {routes.length > 1 ? "s" : ""}. Make the last one count.
                  </p>
                </>
              ) : (
                <div className="no-checkout">
                  <Crosshair size={25} />
                  <h3>
                    {active.score > 170
                      ? "Build your finish."
                      : "Set up the next visit."}
                  </h3>
                  <p>
                    No checkout with {3 - game.turnDarts.length} darts left.
                    Keep a comfortable double in sight.
                  </p>
                </div>
              )
            ) : (
              <p>
                Checkout suggestions are off.{" "}
                <Link href="/settings">Change in Settings</Link>
              </p>
            )}
          </section>
          <div
            role="status"
            className={`match-notice ${game.notice === "Bust" ? "bust-notice" : ""}`}
          >
            {game.notice === "Bust" ? (
              <>
                <RotateCcw size={18} />
                <span>
                  <strong>Bust. Score restored.</strong>
                  <small>
                    {lastTurn && game.players[lastTurn.playerIndex].name} stays
                    on {lastTurn?.startScore}.
                  </small>
                </span>
              </>
            ) : game.notice === "Checkout" ? (
              <>
                <Check size={18} />
                <span>
                  <strong>Game shot!</strong>
                  <small>New leg. {active.name} throws first.</small>
                </span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>
                  {storageError
                    ? "Playing in memory. Storage unavailable."
                    : "Every dart saved on this device."}
                </span>
              </>
            )}
          </div>
          <section className="panel visits-panel">
            <div className="section-heading">
              <h2>Recent visits</h2>
              <span className="small muted">SCORE / LEFT</span>
            </div>
            {game.turns.length === 0 ? (
              <p className="muted small">Your first throw starts the story.</p>
            ) : (
              <div className="visits-list">
                {game.turns
                  .slice(-6)
                  .reverse()
                  .map((t, i) => (
                    <div className="visit-row" key={`${game.turns.length - i}`}>
                      <span className={`visit-dot color-${t.playerIndex}`} />
                      <div>
                        <strong>{game.players[t.playerIndex].name}</strong>
                        <small>
                          {t.visitScore !== undefined
                            ? `${t.visitScore} total · ${t.dartsUsed} darts`
                            : t.darts
                                .map((d: Dart) => dartLabel(d))
                                .join(" · ")}
                        </small>
                      </div>
                      <span className={t.bust ? "bust-text" : ""}>
                        {t.bust ? "BUST" : t.startScore - t.endScore}
                      </span>
                      <strong>{t.endScore}</strong>
                    </div>
                  ))}
              </div>
            )}
          </section>
        </aside>
      </div>
      <div className="page-foot">
        <span>
          FIRST TO {game.config.legsToWin} LEGS / {game.config.setsToWin} SETS
        </span>
        <span>{storageError ? "MEMORY ONLY" : "SAVED AFTER EVERY DART"}</span>
      </div>
    </div>
  );
}
