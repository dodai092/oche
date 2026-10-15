import { checkoutSummary } from "./checkout-engine";
import { cricketSummary } from "./cricket-engine";
import { atcSummary } from "./atc-engine";
import {
  isAtc,
  isCheckout,
  isCricket,
  matchWinnerName,
  useGameStore,
  type AnyMatch,
} from "./store";

export type SheetLogConfig = { url: string; token: string };
export type SheetRow = {
  id: string;
  finishedAt: string;
  mode: string;
  players: string[];
  winner: string | null;
  json: string;
};
export type SheetLogStatus = {
  pending: number;
  lastSentAt: string | null;
  lastError: string | null;
};

type Deps = {
  read: (key: string) => string | null;
  write: (key: string, value: string) => void;
  post: (url: string, body: string) => Promise<string>;
  now: () => string;
};

export const SHEET_LOG_KEYS = {
  config: "oche-sheet-config",
  queue: "oche-sheet-queue",
  sent: "oche-sheet-sent",
  status: "oche-sheet-status",
};
const MAX_SENT_IDS = 500;

/** The row written to the sheet for one finished match. */
export function matchRow(m: AnyMatch): SheetRow {
  const players = isCheckout(m)
    ? checkoutSummary(m.checkout).players.map((p) => p.name)
    : isCricket(m)
      ? cricketSummary(m.cricket).map((p) => p.name)
      : isAtc(m)
        ? atcSummary(m.atc).map((p) => p.name)
        : m.game.players.map((p) => p.name);
  return {
    id: m.id,
    finishedAt: m.finishedAt ?? m.startedAt,
    mode: isCheckout(m) ? "checkout" : isCricket(m) ? "cricket" : isAtc(m) ? "atc" : "x01",
    players,
    winner: matchWinnerName(m),
    json: JSON.stringify(m),
  };
}

/**
 * Queue of finished matches waiting for the sheet. Rows are sent in order, one at a time,
 * and stay queued until the sheet confirms them. A failure stops the run so order is kept.
 */
export function createSheetLog(deps: Deps) {
  const readJson = <T>(key: string, fallback: T): T => {
    try {
      const raw = deps.read(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  };
  const writeJson = (key: string, value: unknown) => deps.write(key, JSON.stringify(value));
  let running = false;

  const queue = () => readJson<SheetRow[]>(SHEET_LOG_KEYS.queue, []);
  const sent = () => readJson<string[]>(SHEET_LOG_KEYS.sent, []);
  const setStatus = (patch: Partial<Omit<SheetLogStatus, "pending">>) =>
    writeJson(SHEET_LOG_KEYS.status, { ...readJson(SHEET_LOG_KEYS.status, {}), ...patch });

  function getConfig(): SheetLogConfig {
    return readJson<SheetLogConfig>(SHEET_LOG_KEYS.config, { url: "", token: "" });
  }

  function setConfig(config: SheetLogConfig) {
    writeJson(SHEET_LOG_KEYS.config, { url: config.url.trim(), token: config.token.trim() });
  }

  function enqueue(m: AnyMatch) {
    const known = sent();
    const rows = queue();
    if (known.includes(m.id) || rows.some((r) => r.id === m.id)) return false;
    writeJson(SHEET_LOG_KEYS.queue, [...rows, matchRow(m)]);
    return true;
  }

  function status(): SheetLogStatus {
    const saved = readJson<Partial<SheetLogStatus>>(SHEET_LOG_KEYS.status, {});
    return {
      pending: queue().length,
      lastSentAt: saved.lastSentAt ?? null,
      lastError: saved.lastError ?? null,
    };
  }

  /** Sends queued rows. Resolves when the queue is empty or a send fails. */
  async function flush() {
    const { url, token } = getConfig();
    if (!url || running) return;
    running = true;
    try {
      for (const row of queue()) {
        let reply: { ok?: boolean; error?: string };
        try {
          reply = JSON.parse(
            await deps.post(url, JSON.stringify({ token, row })),
          ) as { ok?: boolean; error?: string };
        } catch {
          setStatus({ lastError: "Could not reach the sheet. Matches stay queued." });
          return;
        }
        if (reply.ok !== true) {
          setStatus({ lastError: reply.error ?? "The sheet refused this match." });
          return;
        }
        writeJson(SHEET_LOG_KEYS.queue, queue().filter((r) => r.id !== row.id));
        writeJson(SHEET_LOG_KEYS.sent, [...sent(), row.id].slice(-MAX_SENT_IDS));
        setStatus({ lastSentAt: deps.now(), lastError: null });
      }
    } finally {
      running = false;
    }
  }

  return { getConfig, setConfig, enqueue, flush, status };
}

function browserStorage(): Pick<Deps, "read" | "write"> {
  return {
    read: (key) => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write: (key, value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Storage is full or blocked. The queue is lost on refresh.
      }
    },
  };
}

/** The app's sheet log, backed by this browser's storage. */
export const sheetLog = createSheetLog({
  ...browserStorage(),
  post: async (url, body) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body,
    });
    return response.text();
  },
  now: () => new Date().toISOString(),
});

/** Queues matches as they finish. The first load is skipped so saved history is not sent by accident. */
export function watchFinishedMatches() {
  return useGameStore.subscribe((state, prev) => {
    if (!prev.hydrated || !state.hydrated) return;
    let added = false;
    for (const m of state.history) {
      if (!prev.history.some((p) => p.id === m.id)) added = sheetLog.enqueue(m) || added;
    }
    if (added) void sheetLog.flush();
  });
}
