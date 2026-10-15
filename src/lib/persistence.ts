import { restoreGame, type MatchConfig, type GameEvent } from "./engine";
import {
  restoreCricketGame,
  type CricketConfig,
  type CricketEvent,
} from "./cricket-engine";
import type { AnyMatch, Profile, Settings } from "./store";
type StorageBackend = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};
/** Once unavailable, persistence stays read-only until the user explicitly resets it. */
export function createSafeStorage(
  backend: () => StorageBackend,
  onError: () => void,
) {
  let disabled = false,
    original: string | null = null;
  return {
    getItem: (name: string) => {
      try {
        original = backend().getItem(name);
        return original;
      } catch (error) {
        disabled = true;
        throw error;
      }
    },
    setItem: (name: string, value: string) => {
      if (disabled) return;
      try {
        backend().setItem(name, value);
        original = value;
      } catch {
        disabled = true;
        onError();
      }
    },
    removeItem: (name: string) => {
      if (disabled) return;
      backend().removeItem(name);
    },
    block: () => {
      disabled = true;
    },
    blocked: () => disabled,
    raw: () => original,
    recover: () => {
      disabled = false;
    },
  };
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid saved object");
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 200): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw Error("Invalid saved text");
  return value;
}
function date(value: unknown): string {
  const result = text(value);
  if (!Number.isFinite(Date.parse(result))) throw Error("Invalid saved date");
  return result;
}
function players(config: Record<string, unknown>) {
  if (!Array.isArray(config.players)) throw Error("Invalid saved players");
  config.players.forEach((p) => {
    const player = record(p);
    text(player.id);
    text(player.name, 40);
  });
}
function match(value: unknown): AnyMatch {
  const v = record(value);
  if (v.mode !== undefined && v.mode !== "x01" && v.mode !== "cricket")
    throw Error("Invalid saved match mode");
  const base = {
    id: text(v.id),
    startedAt: date(v.startedAt),
    ...(v.finishedAt ? { finishedAt: date(v.finishedAt) } : {}),
  };
  if (v.mode === "cricket") {
    const c = record(v.cricket),
      config = record(c.config);
    players(config);
    return {
      ...base,
      mode: "cricket",
      cricket: restoreCricketGame(
        config as CricketConfig,
        c.events as CricketEvent[],
      ),
    };
  }
  const g = record(v.game),
    config = record(g.config);
  players(config);
  return {
    ...base,
    game: restoreGame(config as MatchConfig, g.events as GameEvent[]),
  };
}
export function restorePersistedData(value: unknown): {
  current: AnyMatch | null;
  history: AnyMatch[];
  profiles: Profile[];
  settings: Settings;
  lastBackupAt: string | null;
} {
  const v = record(value);
  if (
    !Array.isArray(v.history) ||
    v.history.length > 100 ||
    !Array.isArray(v.profiles) ||
    v.profiles.length > 1000
  )
    throw Error("Invalid saved lists");
  const settings = record(v.settings);
  if (
    ![301, 501, 701].includes(settings.startScore as number) ||
    typeof settings.doubleOut !== "boolean" ||
    typeof settings.showCheckouts !== "boolean" ||
    (settings.entryMode !== undefined &&
      !["total", "darts"].includes(settings.entryMode as string)) ||
    (settings.keyboardMode !== undefined &&
      !["keypad", "keyboard"].includes(settings.keyboardMode as string)) ||
    (settings.keepAwake !== undefined &&
      typeof settings.keepAwake !== "boolean")
  )
    throw Error("Invalid settings");
  const profiles = v.profiles.map((item) => {
    const p = record(item);
    return { id: text(p.id), name: text(p.name, 40) };
  });
  if (new Set(profiles.map((p) => p.id)).size !== profiles.length)
    throw Error("Duplicate saved players");
  const history = v.history.map(match);
  const status = (m: AnyMatch) =>
    m.mode === "cricket" ? m.cricket.status : m.game.status;
  if (history.some((m) => status(m) !== "complete"))
    throw Error("Incomplete archived match");
  return {
    current: v.current === null ? null : match(v.current),
    history,
    profiles,
    lastBackupAt: v.lastBackupAt == null ? null : date(v.lastBackupAt),
    settings: {
      startScore: settings.startScore,
      doubleOut: settings.doubleOut,
      showCheckouts: settings.showCheckouts,
      entryMode: settings.entryMode ?? "total",
      keyboardMode: settings.keyboardMode ?? "keypad",
      keepAwake: settings.keepAwake ?? false,
    } as Settings,
  };
}

/** Validate Zustand's outer envelope before undefined state can look like a missing key. */
export function validateSavedEnvelope(raw: string): void {
  const envelope = record(JSON.parse(raw));
  if (envelope.version !== 1 || !Object.hasOwn(envelope, "state"))
    throw Error("Invalid save envelope");
  record(envelope.state);
}
