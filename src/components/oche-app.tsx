"use client";
import { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Crosshair,
  UsersRound,
  ChartNoAxesCombined,
  History,
  Settings2,
  ArrowUpRight,
  Target,
  CircleHelp,
} from "lucide-react";
import { useGameStore } from "@/lib/store";
import { startTabSession, acquireScoringTab } from "@/lib/tab-session";
import { Button } from "./ui/button";
import { OfflineManager } from "./offline-manager";
import { Dashboard } from "./dashboard";
import { MatchSetup } from "./match-setup";
import { LiveMatch } from "./live-match";
import { DataScreens } from "./data-screens";
export type Screen =
  | "dashboard"
  | "new"
  | "match"
  | "players"
  | "statistics"
  | "history"
  | "settings";
const navigation = [
  { screen: "dashboard", href: "/", label: "Overview", icon: LayoutDashboard },
  { screen: "new", href: "/new", label: "Play darts", icon: Crosshair },
  { screen: "players", href: "/players", label: "Players", icon: UsersRound },
  {
    screen: "statistics",
    href: "/statistics",
    label: "Statistics",
    icon: ChartNoAxesCombined,
  },
  {
    screen: "history",
    href: "/history",
    label: "Match history",
    icon: History,
  },
  { screen: "settings", href: "/settings", label: "Settings", icon: Settings2 },
];
export function OcheApp({ screen }: { screen: Screen }) {
  const hydrated = useGameStore((s) => s.hydrated);
  const error = useGameStore((s) => s.storageError);
  const tabMessage = useGameStore((s) => s.tabMessage);
  useEffect(() => {
    const storageError = () =>
      useGameStore
        .getState()
        .reportError(
          "Browser storage is full or unavailable. This match works in memory, but changes may not survive a refresh. Export your data in Settings.",
        );
    window.addEventListener("oche-storage-error", storageError);
    startTabSession();
    return () => window.removeEventListener("oche-storage-error", storageError);
  }, []);
  useEffect(() => {
    // The mobile tab strip scrolls sideways; bring the current tab into view.
    document
      .querySelector(".nav-item.active")
      ?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [screen]);
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className={`app-shell ${screen === "match" ? "match-shell" : ""}`}>
        <aside className="sidebar">
          <Link href="/" className="wordmark" aria-label="Oche home">
            <span className="logo-mark">
              <Target size={24} />
            </span>
            oche<span className="logo-dot">.</span>
          </Link>
          <div className="sidebar-label">YOUR DARTS ROOM</div>
          <nav aria-label="Main navigation">
            {navigation.map((item) => (
              <Link
                key={item.screen}
                href={item.href}
                className={`nav-item ${screen === item.screen || (screen === "match" && item.screen === "new") ? "active" : ""}`}
              >
                <item.icon size={19} />
                <span>{item.label}</span>
                {item.screen === "new" && (
                  <ArrowUpRight size={15} className="nav-arrow" />
                )}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="local-note">
              <span className="status-dot" /> LOCAL EDITION <span>01</span>
            </div>
            <p>
              Your board. Your people.
              <br />
              Every dart counts.
            </p>
            <Link href="/settings" className="help-link">
              <CircleHelp size={16} /> Data & preferences
            </Link>
          </div>
        </aside>
        <main id="main-content">
          <header className="topbar">
            <span>THE GAME STARTS HERE</span>
            <div>
              <span className="status-dot" />{" "}
              {error ? "Storage unavailable" : "Saved on this device"}
            </div>
          </header>
          {error && (
            <div role="alert" className="error-banner">
              {error}
            </div>
          )}
          <OfflineManager showStatus={screen === "settings"} />
          {tabMessage && (
            <div className="tab-warning" role="alert">
              <p>{tabMessage}</p>
              <Button
                variant="outline"
                onClick={() => void acquireScoringTab()}
              >
                Enable scoring in this tab
              </Button>
            </div>
          )}
          {!hydrated ? (
            <div className="loading" role="status">
              Opening your darts room...
            </div>
          ) : screen === "dashboard" ? (
            <Dashboard />
          ) : screen === "new" ? (
            <MatchSetup />
          ) : screen === "match" ? (
            <LiveMatch />
          ) : (
            <DataScreens screen={screen} />
          )}
        </main>
      </div>
      <footer
        className={`mobile-footer ${screen === "match" ? "match-footer" : ""}`}
      >
        OCHE / EVERY DART COUNTS
      </footer>
    </>
  );
}
