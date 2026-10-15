import { AtcBoard } from "./atc-board";
import { atcSummary, type AtcGame } from "@/lib/atc-engine";

export function AtcSummary({ game }: { game: AtcGame }) {
  const rows = atcSummary(game);
  return (
    <section aria-label="Around the Clock summary">
      <AtcBoard game={game} />
      <div className="table-scroll">
        <table className="cricket-results">
          <thead>
            <tr>
              <th>Player</th>
              <th>Legs</th>
              <th>Darts</th>
              <th>Hits</th>
              <th>Hit rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.legs}</td>
                <td>{r.darts}</td>
                <td>{r.hits}</td>
                <td>{Math.round(r.hitRate * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Hit rate is the share of darts that moved a player forward. Darts left
        unthrown when a turn is ended early count as misses.
      </p>
    </section>
  );
}
