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
import { useGameStore } from "@/lib/store";
export function MatchSetup() {
  const { settings, profiles, current, start } = useGameStore();
  const [score, setScore] = useState<301 | 501 | 701>(settings.startScore);
  const [doubleOut, setDoubleOut] = useState(settings.doubleOut);
  const [names, setNames] = useState(["Player 1", "Player 2"]);
  const [profileIds, setProfileIds] = useState(["", ""]);
  const [legs, setLegs] = useState(1),
    [sets, setSets] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  const router = useRouter();
  function begin() {
    let players;
    try {
      players = resolvePlayers(names, profiles);
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
            {names.map((name, i) => (
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
                      setNames(names.map((n,j)=>j===i?(profile?.name??`Player ${i+1}`):n));
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
                {names.length > 1 && (
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
            ))}
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
            disabled={names.some((n) => !n.trim())}
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
