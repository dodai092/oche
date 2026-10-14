import type { GameState } from "../lib/engine";
import { buildMatchSummary } from "../lib/match-summary";
import styles from "./match-summary.module.css";

const average = (value: number | null) =>
  value === null ? "Unavailable" : value.toFixed(1);

export function MatchSummary({ game }: { game: GameState }) {
  const summary = buildMatchSummary(game);
  return (
    <section className={styles.summary} aria-label="Match summary">
      <h2>Match summary</h2>
      <div className={styles.players}>
        {summary.players.map((player) => (
          <article key={player.id} className={styles.player}>
            <h3>{player.name}</h3>
            <dl className={styles.stats}>
              <div>
                <dt>3-dart average</dt>
                <dd className={styles.highlight}>{average(player.average)}</dd>
              </div>
              <div>
                <dt>Highest valid visit</dt>
                <dd>{player.highestVisit ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt>Checkout rate</dt>
                <dd>
                  {player.checkoutAttempts
                    ? `${player.checkoutPercentage.toFixed(1)}%`
                    : "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Checkouts / attempts</dt>
                <dd>
                  {player.checkouts} / {player.checkoutAttempts}
                </dd>
              </div>
              <div>
                <dt>Best winning leg</dt>
                <dd>
                  {player.bestLeg === null
                    ? "Unavailable"
                    : `${player.bestLeg} darts`}
                </dd>
              </div>
              <div>
                <dt>First-nine average</dt>
                <dd>{average(player.first9)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      {!summary.legs.length ? (
        <p>No visits recorded yet.</p>
      ) : (
        <div
          className={styles.tableScroll}
          role="region"
          aria-label="Leg results"
          tabIndex={0}
        >
          <table className={styles.table}>
            <caption>
              Leg-by-leg results. Darts and averages use statistical dart
              counts.
            </caption>
            <thead>
              <tr>
                <th scope="col">Set / leg</th>
                <th scope="col">Winner</th>
                <th scope="col">Checkout total</th>
                <th scope="col">Winner darts</th>
                {summary.players.map((p) => (
                  <th key={p.id} scope="col">
                    {p.name}
                    <small>Points / darts / avg</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.legs.map((leg) => (
                <tr key={leg.key}>
                  <th scope="row">
                    {leg.set} / {leg.leg}
                  </th>
                  <td>
                    {leg.winner === null
                      ? "In progress"
                      : summary.players[leg.winner].name}
                  </td>
                  <td>{leg.checkoutTotal ?? "Unavailable"}</td>
                  <td>{leg.winnerDarts ?? "Unavailable"}</td>
                  {leg.players.map((player, index) => (
                    <td key={summary.players[index].id}>
                      {player.points} / {player.darts} /{" "}
                      {average(player.average)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className={styles.note}>
        Busts score zero and count as three statistical darts. Other visits use
        the recorded dart count, including partial visits. Checkout totals cover
        the whole winning visit. Dart-entry attempts count darts thrown from a
        one-dart finish, an approximation of intent. Typed-total attempts are
        player-reported; their segments are unknown. First-nine is unavailable
        when a typed total crosses dart nine and its points cannot be split.
        Best legs include completed wins only.
      </p>
    </section>
  );
}
