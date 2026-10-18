import { atcCurrent, atcStepLabel, type AtcGame } from "@/lib/atc-engine";

export function AtcBoard({ game }: { game: AtcGame }) {
  const total = game.steps.length;
  return (
    <section className="panel atc-board" aria-label="Around the Clock scoreboard">
      <ul className="atc-players">
        {game.players.map((p, i) => {
          const current = atcCurrent(game, i);
          const active = game.status === "playing" && i === game.activePlayer;
          return (
            <li key={p.id} className={active ? "is-active" : ""}>
              <div className="atc-player-head">
                <span className="atc-name">{p.name}</span>
                <small>
                  {p.legs} {p.legs === 1 ? "leg" : "legs"}
                </small>
              </div>
              <div className="atc-target">
                <span className="sr-only">Target </span>
                <strong data-testid={`atc-target-${i}`}>
                  {current ? atcStepLabel(current.step) : "Done"}
                </strong>
                {current && current.hitsLeft > 1 && (
                  <small>{current.hitsLeft} hits to go</small>
                )}
              </div>
              <div
                className="atc-bar"
                role="progressbar"
                aria-label={`${p.name} progress`}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={p.step}
              >
                <span style={{ width: `${Math.round((p.step / total) * 100)}%` }} />
              </div>
              <small data-testid={`atc-progress-${i}`}>
                {p.step} of {total} done
              </small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
