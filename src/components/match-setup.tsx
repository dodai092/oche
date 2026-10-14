"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Plus,
  Minus,
  Target,
  UsersRound,
  Check,
  Info,
} from "lucide-react";
import { Button } from "./ui/button";
import { resolvePlayers } from "@/lib/setup";
import {
  BOT_LEVELS,
  DEFAULT_BOT_LEVEL,
  botLabel,
  botLevelStats,
} from "@/lib/bot";
import { useGameStore } from "@/lib/store";
export function MatchSetup() {
  const { settings, profiles, current, start, readOnly } = useGameStore();
  const [score, setScore] = useState<301 | 501 | 701>(settings.startScore);
  const [doubleOut, setDoubleOut] = useState(settings.doubleOut);
  const [names, setNames] = useState(["Player 1", "Player 2"]);
  const [profileIds, setProfileIds] = useState(["", ""]);
  const [legs, setLegs] = useState(1),
    [sets, setSets] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  const [opponent, setOpponent] = useState("local");
  const [difficulty, setDifficulty] = useState(DEFAULT_BOT_LEVEL);
  const router = useRouter();
  function begin() {
    let players;
    try {
      players = resolvePlayers(
        opponent === "bot" ? names.slice(0, -1) : names,
        profiles,
      );
      if (opponent === "bot")
        players.push({ id: `bot-${crypto.randomUUID()}`, name: "DartBot" });
    } catch (error) {
      setValidationError(
        error instanceof Error ? error.message : "Check the player lineup.",
      );
      return;
    }
    setValidationError(null);
    if (current?.game.status === "playing" && !replace) {
      setReplace(true);
      return;
    }
    start({
      startScore: score,
      doubleOut,
      legsToWin: legs,
      setsToWin: sets,
      players,
      ...(opponent === "bot"
        ? { bot: { playerId: players.at(-1)!.id, difficulty } }
        : {}),
    });
    router.push("/match");
  }
  return (
    <div className="page-content setup-page">
      <Link href="/" className="back-link">
        <ArrowLeft size={16} /> Back to overview
      </Link>
      <div className="page-heading">
        <div>
          <div className="eyebrow">MAKE IT YOUR GAME</div>
          <h1>
            Set the stage<span className="lime">.</span>
          </h1>
          <p>A few details, then straight to the board.</p>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          begin();
        }}
        className="setup-grid"
      >
        <div className="setup-fields">
          <section className="panel">
            <div className="section-heading">
              <h2>
                <Target size={20} /> Match format
              </h2>
              <span className="step-number">01</span>
            </div>
            <label className="field-label">STARTING SCORE</label>
            <div className="segmented score-options">
              {([301, 501, 701] as const).map((s) => (
                <button
                  type="button"
                  key={s}
                  className={s === score ? "selected" : ""}
                  aria-pressed={s === score}
                  onClick={() => setScore(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <label className="field-label">CHECKOUT RULE</label>
            <div className="rule-options">
              {[
                {
                  value: true,
                  title: "Double out",
                  desc: "Finish on a double or inner bull.",
                },
                {
                  value: false,
                  title: "Single out",
                  desc: "Finish on any scoring segment.",
                },
              ].map((rule) => (
                <button
                  type="button"
                  key={rule.title}
                  onClick={() => setDoubleOut(rule.value)}
                  className={doubleOut === rule.value ? "selected" : ""}
                  aria-pressed={doubleOut === rule.value}
                >
                  <span className="radio">
                    {doubleOut === rule.value && <Check size={12} />}
                  </span>
                  <span>
                    <strong>{rule.title}</strong>
                    <small>{rule.desc}</small>
                  </span>
                </button>
              ))}
            </div>
            <div className="two-fields">
              <label className="field-label">
                LEGS TO WIN A SET
                <select
                  value={legs}
                  onChange={(e) => setLegs(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      First to {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                SETS TO WIN MATCH
                <select
                  value={sets}
                  onChange={(e) => setSets(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      First to {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>
                <UsersRound size={20} /> The lineup
              </h2>
              <span className="step-number">02</span>
            </div>
            {names.map((name, i) =>
              opponent === "bot" && i === names.length - 1 ? (
                <div className="player-input" key={i}>
                  <span className={`avatar color-${i}`}>B</span>
                  <div>
                    <strong>DartBot</strong>
                    <p className="small muted">
                      {botLabel(difficulty)}. Throws actual darts
                      automatically.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="player-input" key={i}>
                  <span className={`avatar color-${i}`}>{i + 1}</span>
                  <div className="player-lineup-fields">
                    <select
                      className="player-profile-select"
                      aria-label={`Player ${i + 1} profile`}
                      value={profileIds[i]}
                      onChange={(e) => {
                        const id = e.target.value;
                        setProfileIds(
                          profileIds.map((p, j) => (j === i ? id : p)),
                        );
                        const profile = profiles.find((p) => p.id === id);
                        setNames(
                          names.map((n, j) =>
                            j === i ? (profile?.name ?? `Player ${i + 1}`) : n,
                          ),
                        );
                      }}
                    >
                      <option value="">Guest player</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <label>
                      Player {i + 1}
                      <input
                        required
                        maxLength={40}
                        aria-label={`Player ${i + 1} name`}
                        value={name}
                        onChange={(e) => {
                          setProfileIds(
                            profileIds.map((p, j) => (j === i ? "" : p)),
                          );
                          setNames(
                            names.map((n, j) => (j === i ? e.target.value : n)),
                          );
                        }}
                      />
                    </label>
                  </div>
                  {names.length > (opponent === "bot" ? 2 : 1) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove player ${i + 1}`}
                      onClick={() => {
                        setNames(names.filter((_, j) => j !== i));
                        setProfileIds(profileIds.filter((_, j) => j !== i));
                      }}
                    >
                      <Minus size={18} />
                    </Button>
                  )}
                </div>
              ),
            )}
            <div className="two-fields opponent-fields">
              <label className="field-label">
                Opponent
                <select
                  aria-label="Opponent"
                  value={opponent}
                  onChange={(e) => {
                    setOpponent(e.target.value);
                    if (e.target.value === "bot" && names.length === 1) {
                      setNames([...names, "DartBot"]);
                      setProfileIds([...profileIds, ""]);
                    }
                  }}
                >
                  <option value="local">Local players</option>
                  <option value="bot">DartBot</option>
                </select>
              </label>
              {opponent === "bot" && (
                <div className="field-label bot-level">
                  <label htmlFor="bot-level">
                    Bot difficulty
                    <strong>
                      {difficulty === BOT_LEVELS ? "Level 20 (max)" : `Level ${difficulty}`}
                    </strong>
                  </label>
                  <input
                    id="bot-level"
                    type="range"
                    min={1}
                    max={BOT_LEVELS}
                    step={1}
                    value={difficulty}
                    aria-valuetext={`Level ${difficulty}, three-dart average ${botLevelStats(difficulty).average}`}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                  />
                  <dl className="bot-level-stats">
                    <div>
                      <dt>3-dart average</dt>
                      <dd>{botLevelStats(difficulty).average}</dd>
                    </div>
                    <div>
                      <dt>Checkout</dt>
                      <dd>{botLevelStats(difficulty).checkout}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
            {names.length < 4 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNames([...names, `Player ${names.length + 1}`]);
                  setProfileIds([...profileIds, ""]);
                }}
              >
                <Plus size={17} /> Add another player
              </Button>
            )}
          </section>
        </div>
        <aside className="panel match-summary">
          <span className="eyebrow">YOUR MATCH</span>
          <div className="summary-score">
            {score}
            <span>X01 / LOCAL</span>
          </div>
          <dl>
            <div>
              <dt>Players</dt>
              <dd>{names.length}</dd>
            </div>
            <div>
              <dt>Checkout</dt>
              <dd>{doubleOut ? "Double out" : "Single out"}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>
                First to {sets} set{sets > 1 ? "s" : ""}
              </dd>
            </div>
            <div>
              <dt>Legs per set</dt>
              <dd>First to {legs}</dd>
            </div>
          </dl>
          <p className="summary-note">
            <Info size={16} /> Scores save after every dart. Pick up where you
            left off, even after a refresh.
          </p>
          {validationError && (
            <div role="alert" className="replace-warning">
              {validationError}
            </div>
          )}
          {replace && (
            <div className="replace-warning" role="alert">
              A match is already in progress. Starting this match will replace
              it.<Link href="/match">Resume existing match</Link>
            </div>
          )}
          <Button
            className="full-width"
            type="submit"
            disabled={readOnly || names.some((n,i) => !(opponent === "bot" && i === names.length-1) && !n.trim())}
          >
            {replace ? "Replace & start match" : "Start match"}
            <ArrowUpRight size={18} />
          </Button>
          <p className="small muted center">
            {names[0] || "Player 1"} throws first. Starters rotate each leg.
          </p>
        </aside>
      </form>
    </div>
  );
}
