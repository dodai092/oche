import { checkoutSummary, type CheckoutGame } from "@/lib/checkout-engine";

export function CheckoutSummary({ game }: { game: CheckoutGame }) {
  const s = checkoutSummary(game);
  return (
    <section aria-label="121 Checkout summary">
      <p>
        {s.attemptsCleared} of {s.attemptsPlayed}{" "}
        {s.attemptsPlayed === 1 ? "attempt" : "attempts"} cleared · {s.darts}{" "}
        {s.darts === 1 ? "dart" : "darts"} thrown
      </p>
      <div className="table-scroll">
        <table className="cricket-results">
          <thead>
            <tr>
              <th>Player</th>
              <th>Darts</th>
              <th>Checkouts</th>
            </tr>
          </thead>
          <tbody>
            {s.players.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.darts}</td>
                <td>{p.checkouts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-scroll">
        <table className="cricket-results">
          <caption className="sr-only">Attempts</caption>
          <thead>
            <tr>
              <th>#</th>
              <th>Target</th>
              <th>Darts used</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {s.attempts.length ? (
              s.attempts.map((a) => (
                <tr key={a.number}>
                  <td>{a.number}</td>
                  <td>{a.target}</td>
                  <td>{a.darts}</td>
                  <td>
                    {a.outcome === "cleared" && a.by !== null
                      ? `Cleared by ${game.players[a.by].name}`
                      : "Missed"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>No attempt was finished.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Darts used counts every dart of the attempt, including darts left
        unthrown after a bust or an early end of turn. A partly played attempt
        is not counted when a run is ended.
      </p>
    </section>
  );
}
