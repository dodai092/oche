"use client";
import { useState } from "react";
import Link from "next/link";
import {
  UsersRound,
  Plus,
  Trash2,
  ArrowUpRight,
  History,
  Trophy,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  isAtc,
  isCheckout,
  isCricket,
  matchWinner,
  matchGame,
  useGameStore,
  safeStorage,
  type AtcMatch,
  type CheckoutMatch,
  type CricketMatch,
  type SavedMatch,
} from "@/lib/store";
import { CricketSummary } from "./cricket-summary";
import { AtcSummary } from "./atc-summary";
import { atcSettingsLabel } from "./atc-match";
import { CheckoutSummary } from "./checkout-summary";
import { checkoutSettingsLabel } from "./checkout-match";
import { playerStats } from "@/lib/engine";
import {
  STATS_GAME_LABEL,
  statRows,
  type StatRow,
  type StatsFilter,
  type StatsGame,
} from "@/lib/game-stats";
import { Button } from "./ui/button";
import type { Screen } from "./oche-app";
import { BackupPanel } from "./backup-panel";
import { MatchSummary } from "./match-summary";
const titles = {
  players: ["The home team", "Your regulars, ready for the next match."],
  statistics: ["Know your game", "Real numbers from every match played here."],
  history: ["The scorebook", "Every rivalry has a history. This is yours."],
  settings: ["Your darts room", "Set your defaults. Keep your data close."],
};
export function DataScreens({
  screen,
}: {
  screen: Exclude<Screen, "dashboard" | "new" | "match">;
}) {
  const store = useGameStore();
  const [name, setName] = useState("");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [title, subtitle] = titles[screen];
  const allMatches = store.history;
  const [gameFilter, setGameFilter] = useState<StatsFilter>("x01");
  const allRows = statRows(allMatches);
  const uniquePlayers = Array.from(
    new Map(
      // Guests get a new id every match, so group by name.
      allRows.map((r) => [r.playerName.trim().toLowerCase(), r.playerName.trim()] as const),
    ).entries(),
  );
  const gameRows = allRows.filter((r) => gameFilter === "all" || r.game === gameFilter);
  const rows = gameRows.filter(
    (r) => playerFilter === "all" || r.playerName.trim().toLowerCase() === playerFilter,
  );
  function downloadRaw() {
    const raw = safeStorage.raw();
    if (raw === null) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "oche-original-save.txt";
    a.click();
    URL.revokeObjectURL(url);
  }
  function resetStorage() {
    if (store.readOnly) return;
    if (
      !window.confirm(
        "Replace the original saved data with the current in-memory data? Download the original first if you need it.",
      )
    )
      return;
    safeStorage.recover();
    useGameStore.setState({ storageError: null });
  }
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR GAME, ON RECORD</div>
          <h1>
            {title}
            <span className="lime">.</span>
          </h1>
          <p>{subtitle}</p>
        </div>
      </div>
      {screen === "players" && (
        <>
          <form
            className="panel add-player-form"
            onSubmit={(e) => {
              e.preventDefault();
              store.addPlayer(name);
              setName("");
            }}
          >
            <label className="field-label">
              PLAYER NAME
              <input
                aria-label="Player name"
                placeholder="Add someone to your lineup"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <Button type="submit" disabled={!name.trim() || store.readOnly}>
              <Plus size={17} /> Add player
            </Button>
          </form>
          {!store.profiles.length ? (
            <Empty
              icon={<UsersRound size={35} />}
              title="Make it a regular thing."
              text="Add your local players. Choose their names when setting up a match."
            />
          ) : (
            <div className="profiles-grid">
              {store.profiles.map((p, i) => {
                const game = matchGame;
                const played = allMatches.filter((m) =>
                  game(m).players.some((x) => x.id === p.id),
                );
                const won = played.filter(
                  (m) => matchWinner(m)?.id === p.id,
                ).length;
                return (
                  <article key={p.id} className="panel profile-card">
                    <span className={`avatar color-${i % 4}`}>
                      {p.name.slice(0, 1)}
                    </span>
                    <h2>{p.name}</h2>
                    <p>
                      {played.length} matches · {won} wins
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => store.removePlayer(p.id)}
                      aria-label={`Remove ${p.name}`}
                      disabled={store.readOnly}
                    >
                      <Trash2 size={14} /> Remove profile
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
      {screen === "statistics" && (
        <>
          <div className="filter-bar">
            <label htmlFor="stats-game">GAME</label>
            <select
              id="stats-game"
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value as StatsFilter)}
            >
              <option value="x01">501</option>
              <option value="cricket">Cricket</option>
              <option value="atc">Around the Clock</option>
              <option value="checkout">121</option>
              <option value="all">All games</option>
            </select>
            <label htmlFor="stats-player">PLAYER</label>
            <select
              id="stats-player"
              value={playerFilter}
              onChange={(e) => setPlayerFilter(e.target.value)}
            >
              <option value="all">All local players</option>
              {uniquePlayers.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <span className="small muted">
              Completed matches on this device. Each game has its own figures.
            </span>
          </div>
          {!rows.length ? (
            <>
              <div className="overview-stats stats-preview" aria-hidden="true">
                {["3-DART AVERAGE", "DARTS THROWN", "180s", "CHECKOUT RATE"].map((label) => (
                  <div className="stat-card" key={label}>
                    <div className="stat-top">{label}</div>
                    <strong>–</strong>
                  </div>
                ))}
              </div>
              <Empty
                icon={<ChartNoAxesCombined size={36} />}
                title="Find your baseline."
                text="Complete your first match to see your scoring and checkout statistics."
              />
            </>
          ) : gameFilter === "x01" ? (
            <X01Stats rows={rows.filter((r) => r.game === "x01")} />
          ) : (
            <MixedStats rows={rows} filter={gameFilter} />
          )}
        </>
      )}
      {screen === "history" && (
        <>
          {!allMatches.length ? (
            <Empty
              icon={<History size={36} />}
              title="A fresh scorebook."
              text="Finish a match and come back for your results, visit history and averages."
            />
          ) : (
            <div className="history-list">
              {allMatches.map((m) =>
                isCricket(m) ? (
                  <CricketRecord key={m.id} match={m} />
                ) : isAtc(m) ? (
                  <AtcRecord key={m.id} match={m} />
                ) : isCheckout(m) ? (
                  <CheckoutRecord key={m.id} match={m} />
                ) : (
                  <MatchRecord key={m.id} match={m} />
                ),
              )}
            </div>
          )}
        </>
      )}
      {screen === "settings" && (
        <div className="settings-grid">
          <section className="panel">
            <h2>Match defaults</h2>
            <label className="field-label">
              STARTING SCORE
              <select
                aria-label="Starting score"
                disabled={store.readOnly}
                value={store.settings.startScore}
                onChange={(e) =>
                  store.updateSettings({
                    startScore: Number(e.target.value) as 301 | 501 | 701,
                  })
                }
              >
                {[301, 501, 701].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label className="setting-toggle">
              <span>
                <strong>Double out by default</strong>
                <small>Finish on a double or inner bull.</small>
              </span>
              <input
                type="checkbox"
                checked={store.settings.doubleOut}
                disabled={store.readOnly}
                onChange={(e) =>
                  store.updateSettings({ doubleOut: e.target.checked })
                }
              />
            </label>
            <label className="setting-toggle">
              <span>
                <strong>Checkout suggestions</strong>
                <small>Show a route to zero during live matches.</small>
              </span>
              <input
                type="checkbox"
                checked={store.settings.showCheckouts}
                disabled={store.readOnly}
                onChange={(e) =>
                  store.updateSettings({ showCheckouts: e.target.checked })
                }
              />
            </label>
          </section>
          <section className="panel">
            {store.storageError && (
              <div className="recovery-panel">
                <h3>Storage recovery</h3>
                <p>
                  The original saved value is preserved until you choose to
                  reset it. Download it before making that choice.
                </p>
                <Button
                  variant="outline"
                  onClick={downloadRaw}
                  disabled={safeStorage.raw() === null}
                >
                  Download original save
                </Button>
                <Button variant="ghost" onClick={resetStorage} disabled={store.readOnly}>
                  Reset storage with current data
                </Button>
              </div>
            )}
            <span className="eyebrow">LOCAL FIRST</span>
            <h2>Your data stays here.</h2>
            <p>
              Matches, players and preferences are saved in this browser.
              Clearing site data removes them. There is no cloud sync.
            </p>
            <p>
              The most recent 100 completed matches are retained. Export a copy
              to keep a longer record.
            </p>
            <BackupPanel />
          </section>
        </div>
      )}
    </div>
  );
}
function Empty({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="empty-state panel">
      {icon}
      <h2>{title}</h2>
      <p>{text}</p>
      <Button asChild>
        <Link href="/new">
          Start a match <ArrowUpRight size={17} />
        </Link>
      </Button>
    </div>
  );
}
function AtcRecord({ match }: { match: AtcMatch }) {
  const g = match.atc;
  return (
    <details className="panel history-record">
      <summary>
        <span className="history-trophy">
          <Trophy size={21} />
        </span>
        <span>
          <strong>{g.players[g.winner ?? 0].name} wins</strong>
          <small>
            {g.players.map((p) => p.name).join(" vs ")} ·{" "}
            {new Date(match.startedAt).toLocaleDateString("en-GB")}
          </small>
        </span>
        <span className="outline-tag">
          AROUND THE CLOCK / {g.config.orderMode.replace("-", " TO ").toUpperCase()}
        </span>
        <Plus size={18} />
      </summary>
      <p className="small muted">{atcSettingsLabel(g.config)}</p>
      <AtcSummary game={g} />
    </details>
  );
}
function CheckoutRecord({ match }: { match: CheckoutMatch }) {
  const g = match.checkout;
  return (
    <details className="panel history-record">
      <summary>
        <span className="history-trophy">
          <Trophy size={21} />
        </span>
        <span>
          <strong>
            {g.best ? `Best checkout ${g.best}` : "No checkout"}
          </strong>
          <small>
            {g.players.map((p) => p.name).join(" vs ")} ·{" "}
            {new Date(match.startedAt).toLocaleDateString("en-GB")}
          </small>
        </span>
        <span className="outline-tag">
          121 CHECKOUT / {g.best ? `BEST ${g.best}` : "NO CHECKOUT"}
        </span>
        <Plus size={18} />
      </summary>
      <p className="small muted">{checkoutSettingsLabel(g.config)}</p>
      <CheckoutSummary game={g} />
    </details>
  );
}
function CricketRecord({ match }: { match: CricketMatch }) {
  const g = match.cricket;
  return (
    <details className="panel history-record">
      <summary>
        <span className="history-trophy">
          <Trophy size={21} />
        </span>
        <span>
          <strong>{g.players[g.winner ?? 0].name} wins</strong>
          <small>
            {g.players.map((p) => p.name).join(" vs ")} ·{" "}
            {new Date(match.startedAt).toLocaleDateString("en-GB")}
          </small>
        </span>
        <span className="outline-tag">
          CRICKET / {g.config.style === "standard" ? "STANDARD" : "CUT-THROAT"}
        </span>
        <Plus size={18} />
      </summary>
      <CricketSummary game={g} />
    </details>
  );
}
function MatchRecord({ match }: { match: SavedMatch }) {
  const g = match.game;
  return (
    <details className="panel history-record">
      <summary>
        <span className="history-trophy">
          <Trophy size={21} />
        </span>
        <span>
          <strong>{g.players[g.winner ?? 0].name} wins</strong>
          <small>
            {g.players.map((p) => p.name).join(" vs ")} ·{" "}
            {new Date(match.startedAt).toLocaleDateString("en-GB")}
          </small>
        </span>
        <span className="outline-tag">
          {g.config.startScore} / {g.config.doubleOut ? "DOUBLE" : "SINGLE"} OUT
        </span>
        <Plus size={18} />
      </summary>
      <MatchSummary game={g} />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Sets</th>
              <th>Legs won</th>
              <th>3-dart avg</th>
              <th>180s</th>
            </tr>
          </thead>
          <tbody>
            {g.players.map((p, i) => {
              const stats = playerStats(g, i);
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sets}</td>
                  <td>{stats.checkouts}</td>
                  <td>{stats.average.toFixed(2)}</td>
                  <td>{stats.oneEighties}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <h3>Visit log</h3>
        <table>
          <thead>
            <tr>
              <th>Leg</th>
              <th>Player</th>
              <th>Darts</th>
              <th>Scored</th>
              <th>Left</th>
            </tr>
          </thead>
          <tbody>
            {g.turns.map((t, i) => (
              <tr key={i}>
                <td>{t.leg}</td>
                <td>{g.players[t.playerIndex].name}</td>
                <td>
                  {t.visitScore !== undefined
                    ? `${t.visitScore} total (${t.dartsUsed} darts)`
                    : t.darts.map((d) => d.value * d.multiplier).join(", ")}
                </td>
                <td>{t.bust ? "Bust" : t.startScore - t.endScore}</td>
                <td>{t.endScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

type X01Row = Extract<StatRow, { game: "x01" }>;

function X01Stats({ rows }: { rows: X01Row[] }) {
  const darts = rows.reduce((s, r) => s + r.stats.darts, 0),
    points = rows.reduce((s, r) => s + r.stats.points, 0),
    attempts = rows.reduce((s, r) => s + r.stats.checkoutAttempts, 0),
    checkouts = rows.reduce((s, r) => s + r.stats.checkouts, 0);
  return (
    <>
      <div className="overview-stats">
        {[
          {
            label: "3-DART AVERAGE",
            value: darts ? ((points / darts) * 3).toFixed(2) : "0.00",
          },
          { label: "DARTS THROWN", value: darts },
          {
            label: "180s",
            value: rows.reduce((s, r) => s + r.stats.oneEighties, 0),
          },
          {
            label: "CHECKOUT RATE",
            value: `${attempts ? ((checkouts / attempts) * 100).toFixed(1) : 0}%`,
          },
        ].map((x) => (
          <div className="stat-card" key={x.label}>
            <div className="stat-top">{x.label}</div>
            <strong>{x.value}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Match breakdown</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Date</th>
                <th>3-dart avg</th>
                <th>First 9 avg</th>
                <th>180s</th>
                <th>Checkouts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.matchId}-${r.playerId}`}>
                  <td>{r.playerName}</td>
                  <td>{new Date(r.startedAt).toLocaleDateString("en-GB")}</td>
                  <td>{r.stats.average.toFixed(2)}</td>
                  <td>
                    {r.stats.first9 === null ? "Unavailable" : r.stats.first9.toFixed(2)}
                  </td>
                  <td>{r.stats.oneEighties}</td>
                  <td>
                    {r.stats.checkouts}/{r.stats.checkoutAttempts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Checkout attempts are reported for visit totals and inferred for individual darts. Busts count
          three statistical darts. First-9 averages cover each leg; first-nine is unavailable when an
          entered total straddles dart nine.
        </p>
      </div>
    </>
  );
}

function MixedStats({ rows, filter }: { rows: StatRow[]; filter: Exclude<StatsFilter, "x01"> }) {
  const matches = new Set(rows.map((r) => r.matchId)).size;
  const darts = rows.reduce((s, r) => s + r.darts, 0);
  const of = <G extends StatsGame>(game: G) =>
    rows.filter((r): r is Extract<StatRow, { game: G }> => r.game === game);
  const cricket = of("cricket"),
    atc = of("atc"),
    checkout = of("checkout");
  const perRound = (n: number, d: number) => (d ? ((n / d) * 3).toFixed(2) : "0.00");
  const cards: { label: string; value: string | number }[] = [
    { label: "MATCHES", value: matches },
    { label: "DARTS THROWN", value: darts },
  ];
  if (filter === "cricket")
    cards.push(
      { label: "MARKS PER ROUND", value: perRound(cricket.reduce((s, r) => s + r.marks, 0), cricket.reduce((s, r) => s + r.darts, 0)) },
      { label: "LEGS WON", value: cricket.reduce((s, r) => s + r.legs, 0) },
    );
  if (filter === "atc")
    cards.push(
      { label: "HITS PER ROUND", value: perRound(atc.reduce((s, r) => s + r.hits, 0), atc.reduce((s, r) => s + r.darts, 0)) },
      { label: "LEGS WON", value: atc.reduce((s, r) => s + r.legs, 0) },
    );
  if (filter === "checkout")
    cards.push(
      { label: "BEST TARGET", value: Math.max(0, ...checkout.map((r) => r.best)) || "None" },
      { label: "CHECKOUTS", value: checkout.reduce((s, r) => s + r.checkouts, 0) },
    );
  return (
    <>
      <div className="overview-stats">
        {cards.map((x) => (
          <div className="stat-card" key={x.label}>
            <div className="stat-top">{x.label}</div>
            <strong>{x.value}</strong>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Match breakdown</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Date</th>
                <th>Game</th>
                <th>Darts</th>
                <th>Figures</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.matchId}-${r.playerId}`}>
                  <td>{r.playerName}</td>
                  <td>{new Date(r.startedAt).toLocaleDateString("en-GB")}</td>
                  <td>{STATS_GAME_LABEL[r.game]}</td>
                  <td>{r.darts}</td>
                  <td>
                    {r.game === "x01"
                      ? `${perRound(r.stats.points, r.darts)} avg`
                      : r.game === "cricket"
                        ? `${perRound(r.marks, r.darts)} marks/round · ${r.legs} ${r.legs === 1 ? "leg" : "legs"}`
                        : r.game === "atc"
                          ? `${perRound(r.hits, r.darts)} hits/round · ${r.legs} ${r.legs === 1 ? "leg" : "legs"}`
                          : `${r.checkouts} ${r.checkouts === 1 ? "checkout" : "checkouts"} · best ${r.best}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          Each game is scored on its own terms, so compare figures within a game. Marks and hits are
          counted per round of three darts.
        </p>
      </div>
    </>
  );
}
