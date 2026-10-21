import { cricketSummary, type CricketGame } from "@/lib/cricket-engine";

// Live cricket scores, drawn with the same player cards as the x01 match screen.
export function CricketScoreCards({ game }: { game: CricketGame }) {
  const summary = cricketSummary(game);
  return (
    <section
      className="scoreboard cricket-board"
      aria-label="Cricket scores"
      style={{
        gridTemplateColumns: `repeat(${game.players.length}, minmax(0, 1fr))`,
      }}
    >
      {game.players.map((p, i) => {
        const active = game.status === "playing" && i === game.activePlayer;
        return (
          <article
            key={p.id}
            className={`player-score ${active ? "is-active" : ""}`}
          >
            <div className="player-score-head">
              <span className={`avatar color-${i}`}>
                {p.name.slice(0, 1)}
              </span>
              <h2>{p.name}</h2>
              {active && <span className="throwing-badge">To throw</span>}
            </div>
            <div className="big-score" data-testid={`cricket-points-${i}`}>
              {p.points}
            </div>
            <div className="score-sub">
              <span>
                <small>Avg MPR</small> {summary[i].marksPerRound.toFixed(2)}
              </span>
              <span>
                <small>Legs</small> {p.legs}
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
