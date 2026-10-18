import { atcCurrent, atcStepLabel, atcSummary, type AtcGame } from "@/lib/atc-engine";

// Live Around the Clock player cards, with the same card classes as the x01 and cricket screens.
export function AtcScoreCards({ game }: { game: AtcGame }) {
  const summary = atcSummary(game);
  return (
    <section
      className="scoreboard atc-board"
      aria-label="Around the Clock scores"
      style={{
        gridTemplateColumns: `repeat(${game.players.length}, minmax(0, 1fr))`,
      }}
    >
      {game.players.map((p, i) => {
        const current = atcCurrent(game, i);
        const active = game.status === "playing" && i === game.activePlayer;
        const stats = summary[i];
        return (
          <article
            key={p.id}
            className={`player-score ${active ? "is-active" : ""}`}
          >
            <div className="player-score-head">
              <span className={`avatar color-${i}`}>{p.name.slice(0, 1)}</span>
              <h2>{p.name}</h2>
              {active && <span className="throwing-badge">TO THROW</span>}
            </div>
            <div className="atc-ring">
              <strong data-testid={`atc-target-${i}`}>
                {current ? atcStepLabel(current.step) : "Done"}
              </strong>
              {current && current.hitsLeft > 1 && (
                <small>{current.hitsLeft} hits to go</small>
              )}
            </div>
            <span className="atc-target-tag">TARGET</span>
            <div className="atc-stats">
              <span>
                <small>Darts hit</small>{" "}
                <strong>
                  {stats.hits}/{stats.darts}
                </strong>
              </span>
              <span>
                <small>Hit rate</small>{" "}
                <strong>{Number((stats.hitRate * 100).toFixed(2))}%</strong>
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
