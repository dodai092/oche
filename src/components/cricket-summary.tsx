import { CricketBoard } from "./cricket-board";
import { cricketSummary, type CricketGame } from "@/lib/cricket-engine";

export function CricketSummary({ game }: { game: CricketGame }) {
  const rows = cricketSummary(game);
  return (
    <section aria-label="Cricket summary">
      <CricketBoard game={game} />
      <div className="table-scroll">
        <table className="cricket-results">
          <thead>
            <tr>
              <th>Player</th>
              <th>Legs</th>
              <th>Points</th>
              <th>Marks</th>
              <th>Marks per round</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.legs}</td>
                <td>{r.points}</td>
                <td>{r.marks}</td>
                <td>{r.marksPerRound.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Marks per round counts marks on 15 to 20 and the bull per three darts,
        including marks beyond a closed number.
      </p>
    </section>
  );
}
