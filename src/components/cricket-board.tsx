import { CRICKET_NUMBERS, type CricketGame } from "@/lib/cricket-engine";

export function Marks({ count }: { count: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`cricket-mark marks-${count}`}
      role="img"
      aria-label={count === 1 ? "1 mark" : `${count} marks`}
    >
      {count >= 1 && <line x1="6" y1="18" x2="18" y2="6" />}
      {count >= 2 && <line x1="6" y1="6" x2="18" y2="18" />}
      {count >= 3 && <circle cx="12" cy="12" r="10" />}
    </svg>
  );
}

const label = (n: number) => (n === 25 ? "Bull" : String(n));

export function CricketBoard({ game }: { game: CricketGame }) {
  return (
    <section className="panel cricket-board" aria-label="Cricket scoreboard">
      <table className="cricket-table">
        <caption className="sr-only">
          Marks and points per player, leg {game.leg}
        </caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Number</span>
            </th>
            {game.players.map((p, i) => (
              <th
                key={p.id}
                scope="col"
                className={
                  game.status === "playing" && i === game.activePlayer
                    ? "is-active"
                    : ""
                }
              >
                <span className="cricket-name">{p.name}</span>
                <strong data-testid={`cricket-points-${i}`}>{p.points}</strong>
                <small>
                  {p.legs} {p.legs === 1 ? "leg" : "legs"}
                </small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CRICKET_NUMBERS.map((n, row) => (
            <tr key={n}>
              <th scope="row">{label(n)}</th>
              {game.players.map((p, i) => (
                <td key={p.id} data-testid={`marks-${i}-${n}`}>
                  <Marks count={p.marks[row]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
