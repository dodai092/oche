"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Clock,
  Crosshair,
  Flag,
  Target,
  TrendingUp,
  Trophy,
  ChevronRight,
  Zap,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  isX01,
  matchLabel,
  matchPlayerNames,
  matchStatus,
  matchResultLine,
  useGameStore,
} from "@/lib/store";
import { playerStats } from "@/lib/engine";
import { requestSetupMode } from "@/lib/setup-mode";
export function Dashboard() {
  const { current, history, profiles } = useGameStore();
  const stats = history.filter(isX01).flatMap((m) =>
    m.game.players.map((_, i) => playerStats(m.game, i)),
  );
  const darts = stats.reduce((s, x) => s + x.darts, 0),
    points = stats.reduce((s, x) => s + x.points, 0);
  // "–" until there is data, so a new device does not show zeros that look broken.
  const avg = darts ? ((points / darts) * 3).toFixed(1) : "–";
  const count = (n: number) => (n ? n.toString().padStart(2, "0") : "–");
  return (
    <div className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">WELCOME TO THE OCHE</div>
          <h1>
            A good day for darts<span className="lime">.</span>
          </h1>
          <p>Find your rhythm. Chase your next checkout.</p>
        </div>
        <span className="outline-tag">
          <span className="status-dot" /> READY WHEN YOU ARE
        </span>
      </div>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-kicker">
            <span className="tiny-line" /> YOUR NEXT LEG STARTS HERE
          </span>
          <h2>
            Step up.
            <br />
            Make it count.
          </h2>
          <p>
            A friendly rivalry or a personal best.
            <br />
            All you need is a board and three darts.
          </p>
          <Button asChild>
            <Link href="/new">
              Start a match <ArrowUpRight size={19} />
            </Link>
          </Button>
          <div className="hero-meta">
            <span>301 / 501 / 701</span>
            <i /> <span>1-4 PLAYERS</span>
            <i /> <span>NO SIGN-IN</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="dartboard">
            <div className="board-sectors" />
            <div className="board-ring outer" />
            <div className="board-ring triple" />
            <div className="board-bull" />
            <span className="board-number n20">20</span>
            <span className="board-number n6">6</span>
            <span className="board-number n3">3</span>
            <span className="board-number n11">11</span>
          </div>
          <div className="dart-illustration">
            <div className="dart-flight" />
            <div className="dart-shaft" />
            <div className="dart-barrel" />
            <div className="dart-point" />
          </div>
          <span className="art-caption">PRECISION IS A PRACTICE.</span>
        </div>
      </section>
      <section className="overview-stats" aria-label="Your statistics">
        {[
          {
            label: "MATCHES PLAYED",
            value: count(history.length),
            icon: Crosshair,
            note: "Completed on this device",
          },
          {
            label: "3-DART AVERAGE",
            value: avg,
            icon: TrendingUp,
            note: "Across all local players",
          },
          {
            label: "180s THROWN",
            value: stats.length ? count(stats.reduce((s, x) => s + x.oneEighties, 0)) : "–",
            icon: Zap,
            note: "The perfect scoring visit",
          },
          {
            label: "YOUR PLAYERS",
            value: count(profiles.length),
            icon: Trophy,
            note: "Your local lineup",
          },
        ].map((s) => (
          <article className="stat-card" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <s.icon size={17} />
            </div>
            <strong>{s.value}</strong>
            <p>{s.note}</p>
          </article>
        ))}
      </section>
      <div className="dashboard-bottom">
        <section>
          <div className="section-heading">
            <h2>Choose your game</h2>
            <span className="muted small">THE CLASSICS, DONE RIGHT</span>
          </div>
          <Link href="/new" className="mode-card" onClick={() => requestSetupMode("x01")}>
            <span className="mode-icon">
              <Crosshair size={29} />
            </span>
            <div>
              <div className="mode-title">
                Match <span className="pill">READY TO PLAY</span>
              </div>
              <p>The original race to zero. Play solo or bring your rivals.</p>
              <span className="mode-meta">
                301, 501 & 701 <span>·</span> Legs & sets <span>·</span>{" "}
                Checkout routes
              </span>
            </div>
            <ArrowUpRight size={23} />
          </Link>
          <Link href="/new" className="mode-card" onClick={() => requestSetupMode("cricket")}>
            <span className="mode-icon">
              <Target size={29} />
            </span>
            <div>
              <div className="mode-title">
                Cricket
              </div>
              <p>Close 15 to 20 and the bull before your rivals.</p>
              <span className="mode-meta">
                Standard or cut-throat <span>·</span> 2-4 players <span>·</span>{" "}
                Legs
              </span>
            </div>
            <ArrowUpRight size={23} />
          </Link>
          <Link href="/new" className="mode-card" onClick={() => requestSetupMode("atc")}>
            <span className="mode-icon">
              <Clock size={29} />
            </span>
            <div>
              <div className="mode-title">
                Around the Clock
              </div>
              <p>Hit every number in order, then the bull.</p>
              <span className="mode-meta">
                Many ways to play <span>·</span> 1-4 players <span>·</span>{" "}
                Legs
              </span>
            </div>
            <ArrowUpRight size={23} />
          </Link>
          <Link href="/new" className="mode-card" onClick={() => requestSetupMode("checkout")}>
            <span className="mode-icon">
              <Flag size={29} />
            </span>
            <div>
              <div className="mode-title">
                121
              </div>
              <p>Check out a rising target with a fixed dart budget.</p>
              <span className="mode-meta">
                Safehouse fall-back <span>·</span> 1-4 players <span>·</span>{" "}
                Practice
              </span>
            </div>
            <ArrowUpRight size={23} />
          </Link>
          <div className="tip">
            <Target size={20} />
            <p>
              <strong>Good darts start with a good finish.</strong> Checkout
              routes adapt after every dart, so your next move is always in
              sight.
            </p>
          </div>
        </section>
        <section className="recent-panel">
          <div className="section-heading">
            <h2>Last at the oche</h2>
            <Link href="/history" aria-label="See match history">
              <ArrowRight size={18} />
            </Link>
          </div>
          {matchStatus(current) === "playing" && current ? (
            <Link href="/match" className="resume-card">
              <span className="eyebrow lime">MATCH IN PROGRESS</span>
              <h3>{matchPlayerNames(current).join(" vs ")}</h3>
              <span>
                Resume your {matchLabel(current)} match{" "}
                <ChevronRight size={16} />
              </span>
            </Link>
          ) : history[0] ? (
            <Link href="/history" className="resume-card">
              <span className="eyebrow">LAST MATCH</span>
              <h3>{matchResultLine(history[0])}</h3>
              <span>
                See the scores <ChevronRight size={16} />
              </span>
            </Link>
          ) : (
            <div className="empty-recent">
              <HistoryGlyph />
              <h3>A fresh scorecard.</h3>
              <p>
                Your story starts with the first throw.
                <br />
                Finished matches will live here.
              </p>
            </div>
          )}
        </section>
      </div>
      <div className="page-foot">
        <span>BUILT FOR THE LOVE OF THE GAME.</span>
        <span>NO DISTRACTIONS. JUST DARTS.</span>
      </div>
    </div>
  );
}
function HistoryGlyph() {
  return (
    <div className="empty-glyph">
      <Crosshair size={27} />
    </div>
  );
}
