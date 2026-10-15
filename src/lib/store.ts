"use client";
import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import {
  createSafeStorage,
  restorePersistedData,
  validateSavedEnvelope,
} from "./persistence";
import {
  createGame,
  submitVisit,
  type VisitOptions,
  throwDart,
  endTurn,
  undoDart,
  undoTurn,
  type GameState,
  type MatchConfig,
  type Dart,
} from "./engine";
import {
  createAtcGame,
  endAtcTurn,
  throwAtcDart,
  undoAtcDart,
  undoAtcTurn,
  type AtcConfig,
  type AtcGame,
} from "./atc-engine";
import {
  createCheckoutGame,
  endCheckoutRun,
  endCheckoutTurn,
  throwCheckoutDart,
  undoCheckoutDart,
  undoCheckoutTurn,
  type CheckoutConfig,
  type CheckoutGame,
} from "./checkout-engine";
import {
  createCricketGame,
  endCricketTurn,
  throwCricketDart,
  undoCricketDart,
  undoCricketTurn,
  type CricketConfig,
  type CricketGame,
} from "./cricket-engine";
export type SavedMatch = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  mode?: "x01";
  game: GameState;
};
export type CricketMatch = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  mode: "cricket";
  cricket: CricketGame;
};
export type AtcMatch = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  mode: "atc";
  atc: AtcGame;
};
export type CheckoutMatch = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  mode: "checkout";
  checkout: CheckoutGame;
};
export type AnyMatch = SavedMatch | CricketMatch | AtcMatch | CheckoutMatch;
export const isCricket = (m: AnyMatch | null | undefined): m is CricketMatch =>
  m?.mode === "cricket";
export const isAtc = (m: AnyMatch | null | undefined): m is AtcMatch =>
  m?.mode === "atc";
export const isCheckout = (
  m: AnyMatch | null | undefined,
): m is CheckoutMatch => m?.mode === "checkout";
export const isX01 = (m: AnyMatch | null | undefined): m is SavedMatch =>
  !!m &&
  m.mode !== "cricket" &&
  m.mode !== "atc" &&
  m.mode !== "checkout";
/** The mode's game state. Every game has players, events and status. Only x01, Cricket and Around the Clock have a winner. */
export const matchGame = (m: AnyMatch) =>
  isCricket(m)
    ? m.cricket
    : isAtc(m)
      ? m.atc
      : isCheckout(m)
        ? m.checkout
        : m.game;
export const matchStatus = (m: AnyMatch | null | undefined) =>
  m ? matchGame(m).status : null;
export const matchEventCount = (m: AnyMatch | null | undefined) =>
  m ? matchGame(m).events.length : 0;
export const matchPlayerNames = (m: AnyMatch) =>
  matchGame(m).players.map((p) => p.name);
export const matchLabel = (m: AnyMatch) =>
  isCricket(m)
    ? "Cricket"
    : isAtc(m)
      ? "Around the Clock"
      : isCheckout(m)
        ? "121 Checkout"
        : String(m.game.config.startScore);
/** The winning player of a match, or null for 121 Checkout, which has no winner. */
export const matchWinner = (m: AnyMatch) => {
  if (isCheckout(m)) return null;
  const g = isCricket(m) ? m.cricket : isAtc(m) ? m.atc : m.game;
  return g.players[g.winner ?? 0];
};
export const matchWinnerName = (m: AnyMatch) => matchWinner(m)?.name ?? null;
/** One line for a finished match: "<name> wins", or the best checkout of a 121 run. */
export const matchResultLine = (m: AnyMatch) =>
  isCheckout(m)
    ? m.checkout.best
      ? `Best checkout ${m.checkout.best}`
      : "No checkout"
    : `${matchWinnerName(m)} wins`;
export type Profile = { id: string; name: string };
export type Settings = {
  entryMode: "total" | "darts";
  keyboardMode: "keypad" | "keyboard";
  startScore: 301 | 501 | 701;
  doubleOut: boolean;
  showCheckouts: boolean;
  keepAwake: boolean;
};
type Store = {
  current: AnyMatch | null;
  history: AnyMatch[];
  profiles: Profile[];
  settings: Settings;
  hydrated: boolean;
  storageError: string | null;
  readOnly: boolean;
  tabMessage: string | null;
  lastBackupAt: string | null;
  recordBackup: () => void;
  restoreBackup: (data: unknown) => void;
  ready: () => void;
  start: (config: MatchConfig) => void;
  rematch: () => void;
  visit: (score: number, options?: VisitOptions) => void;
  dart: (dart: Dart) => void;
  finishTurn: () => void;
  undo: (turn?: boolean) => void;
  startCricket: (config: CricketConfig) => void;
  cricketDart: (dart: Dart) => void;
  cricketFinishTurn: () => void;
  cricketUndo: (turn?: boolean) => void;
  startAtc: (config: AtcConfig) => void;
  atcDart: (dart: Dart) => void;
  atcFinishTurn: () => void;
  atcUndo: (turn?: boolean) => void;
  startCheckout: (config: CheckoutConfig) => void;
  checkoutDart: (dart: Dart) => void;
  checkoutFinishTurn: () => void;
  checkoutEndRun: () => void;
  checkoutUndo: (turn?: boolean) => void;
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  reportError: (message: string) => void;
};
export const safeStorage = createSafeStorage(
  () => localStorage,
  () => window.dispatchEvent(new Event("oche-storage-error")),
);
const storage: StateStorage = {
  getItem: (name) => {
    const raw = safeStorage.getItem(name);
    if (raw !== null) validateSavedEnvelope(raw);
    return raw;
  },
  setItem: (name, value) => {
    if (!useGameStore.getState().readOnly) safeStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (!useGameStore.getState().readOnly) safeStorage.removeItem(name);
  },
};
export const useGameStore = create<Store>()(
  persist(
    (set, get) => {
      const commit = (current: AnyMatch, next: AnyMatch, complete: boolean) => {
        const updated = {
          ...next,
          finishedAt: complete
            ? (current.finishedAt ?? new Date().toISOString())
            : undefined,
        };
        const history = get().history.filter((m) => m.id !== current.id);
        if (complete) history.unshift(updated);
        set({ current: updated, history: history.slice(0, 100) });
      };
      const updateGame = (game: GameState) => {
        const current = get().current;
        if (!isX01(current)) return;
        commit(current, { ...current, game }, game.status === "complete");
      };
      const updateCricket = (cricket: CricketGame) => {
        const current = get().current;
        if (!isCricket(current)) return;
        commit(current, { ...current, cricket }, cricket.status === "complete");
      };
      const x01Game = () => {
        const current = get().current;
        return isX01(current) ? current.game : undefined;
      };
      const cricketGame = () => {
        const current = get().current;
        return isCricket(current) ? current.cricket : undefined;
      };
      const updateAtc = (atc: AtcGame) => {
        const current = get().current;
        if (!isAtc(current)) return;
        commit(current, { ...current, atc }, atc.status === "complete");
      };
      const atcGame = () => {
        const current = get().current;
        return isAtc(current) ? current.atc : undefined;
      };
      const updateCheckout = (checkout: CheckoutGame) => {
        const current = get().current;
        if (!isCheckout(current)) return;
        commit(
          current,
          { ...current, checkout },
          checkout.status === "complete",
        );
      };
      const checkoutGame = () => {
        const current = get().current;
        return isCheckout(current) ? current.checkout : undefined;
      };
      return {
        current: null,
        history: [],
        profiles: [],
        settings: {
          startScore: 501,
          doubleOut: true,
          showCheckouts: true,
          entryMode: "total",
          keyboardMode: "keypad",
          keepAwake: false,
        },
        hydrated: false,
        storageError: null,
        readOnly: typeof window !== "undefined",
        tabMessage: null,
        lastBackupAt: null,
        recordBackup: () => {
          if (!get().readOnly) set({ lastBackupAt: new Date().toISOString() });
        },
        restoreBackup: (data) => {
          if (get().readOnly)
            throw Error(
              "This tab is read-only. Close the other Oche tab first.",
            );
          if (safeStorage.blocked())
            throw Error("Resolve storage recovery before importing a backup.");
          const restored = restorePersistedData(data);
          safeStorage.setItem(
            "oche-v1",
            JSON.stringify({ version: 1, state: restored }),
          );
          if (safeStorage.blocked())
            throw Error("Backup could not be saved. Current data was kept.");
          set(restored);
        },
        ready: () => set({ hydrated: true }),
        reportError: (message) => set({ storageError: message }),
        start: (config) => {
          if (get().readOnly) return;
          const game = createGame(config);
          set({
            current: {
              id: crypto.randomUUID(),
              startedAt: new Date().toISOString(),
              game,
            },
          });
        },
        rematch: () => {
          if (get().readOnly) return;
          const current = get().current;
          if (!current || matchStatus(current) !== "complete") return;
          if (isCricket(current)) get().startCricket(current.cricket.config);
          else if (isAtc(current)) get().startAtc(current.atc.config);
          else if (isCheckout(current))
            get().startCheckout(current.checkout.config);
          else get().start(current.game.config);
        },
        visit: (score, options) => {
          if (get().readOnly) return;
          const game = x01Game();
          if (game) updateGame(submitVisit(game, score, options));
        },
        dart: (dart) => {
          if (get().readOnly) return;
          const game = x01Game();
          if (game) updateGame(throwDart(game, dart));
        },
        finishTurn: () => {
          if (get().readOnly) return;
          const game = x01Game();
          if (game) updateGame(endTurn(game));
        },
        undo: (turn = false) => {
          if (get().readOnly) return;
          const game = x01Game();
          if (game) updateGame(turn ? undoTurn(game) : undoDart(game));
        },
        startCricket: (config) => {
          if (get().readOnly) return;
          set({
            current: {
              id: crypto.randomUUID(),
              startedAt: new Date().toISOString(),
              mode: "cricket",
              cricket: createCricketGame(config),
            },
          });
        },
        cricketDart: (dart) => {
          if (get().readOnly) return;
          const game = cricketGame();
          if (game) updateCricket(throwCricketDart(game, dart));
        },
        cricketFinishTurn: () => {
          if (get().readOnly) return;
          const game = cricketGame();
          if (game) updateCricket(endCricketTurn(game));
        },
        cricketUndo: (turn = false) => {
          if (get().readOnly) return;
          const game = cricketGame();
          if (game)
            updateCricket(turn ? undoCricketTurn(game) : undoCricketDart(game));
        },
        startAtc: (config) => {
          if (get().readOnly) return;
          set({
            current: {
              id: crypto.randomUUID(),
              startedAt: new Date().toISOString(),
              mode: "atc",
              atc: createAtcGame(config),
            },
          });
        },
        atcDart: (dart) => {
          if (get().readOnly) return;
          const game = atcGame();
          if (game) updateAtc(throwAtcDart(game, dart));
        },
        atcFinishTurn: () => {
          if (get().readOnly) return;
          const game = atcGame();
          if (game) updateAtc(endAtcTurn(game));
        },
        atcUndo: (turn = false) => {
          if (get().readOnly) return;
          const game = atcGame();
          if (game) updateAtc(turn ? undoAtcTurn(game) : undoAtcDart(game));
        },
        startCheckout: (config) => {
          if (get().readOnly) return;
          set({
            current: {
              id: crypto.randomUUID(),
              startedAt: new Date().toISOString(),
              mode: "checkout",
              checkout: createCheckoutGame(config),
            },
          });
        },
        checkoutDart: (dart) => {
          if (get().readOnly) return;
          const game = checkoutGame();
          if (game) updateCheckout(throwCheckoutDart(game, dart));
        },
        checkoutFinishTurn: () => {
          if (get().readOnly) return;
          const game = checkoutGame();
          if (game) updateCheckout(endCheckoutTurn(game));
        },
        checkoutEndRun: () => {
          if (get().readOnly) return;
          const game = checkoutGame();
          if (game) updateCheckout(endCheckoutRun(game));
        },
        checkoutUndo: (turn = false) => {
          if (get().readOnly) return;
          const game = checkoutGame();
          if (game)
            updateCheckout(
              turn ? undoCheckoutTurn(game) : undoCheckoutDart(game),
            );
        },
        addPlayer: (name) => {
          if (get().readOnly) return;
          const clean = name.trim().slice(0, 40);
          if (
            clean &&
            !get().profiles.some(
              (p) => p.name.toLowerCase() === clean.toLowerCase(),
            )
          )
            set({
              profiles: [
                ...get().profiles,
                { id: crypto.randomUUID(), name: clean },
              ],
            });
        },
        removePlayer: (id) => {
          if (!get().readOnly)
            set({ profiles: get().profiles.filter((p) => p.id !== id) });
        },
        updateSettings: (settings) => {
          if (!get().readOnly)
            set({ settings: { ...get().settings, ...settings } });
        },
      };
    },
    {
      name: "oche-v1",
      version: 1,
      storage: createJSONStorage(() => storage),
      skipHydration: true,
      merge: (saved, current) =>
        saved === undefined
          ? current
          : { ...current, ...restorePersistedData(saved) },
      migrate: () => {
        throw Error("Unsupported save version");
      },
      partialize: (state) => ({
        current: state.current,
        history: state.history,
        profiles: state.profiles,
        settings: state.settings,
        lastBackupAt: state.lastBackupAt,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          safeStorage.block();
          queueMicrotask(() =>
            useGameStore
              .getState()
              .reportError(
                "Saved data could not be read. The original save is preserved. Download it in Settings before resetting storage. Changes will stay in memory until you reset.",
              ),
          );
        }
      },
    },
  ),
);
