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
export type SavedMatch = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  game: GameState;
};
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
  current: SavedMatch | null;
  history: SavedMatch[];
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
      const updateGame = (game: GameState) => {
        const current = get().current;
        if (!current) return;
        const updated = {
          ...current,
          game,
          finishedAt:
            game.status === "complete"
              ? (current.finishedAt ?? new Date().toISOString())
              : undefined,
        };
        const history = get().history.filter((m) => m.id !== current.id);
        if (game.status === "complete") history.unshift(updated);
        set({ current: updated, history: history.slice(0, 100) });
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
          if (current?.game.status === "complete")
            get().start(current.game.config);
        },
        visit: (score, options) => {
          if (get().readOnly) return;
          const game = get().current?.game;
          if (game) updateGame(submitVisit(game, score, options));
        },
        dart: (dart) => {
          if (get().readOnly) return;
          const game = get().current?.game;
          if (game) updateGame(throwDart(game, dart));
        },
        finishTurn: () => {
          if (get().readOnly) return;
          const game = get().current?.game;
          if (game) updateGame(endTurn(game));
        },
        undo: (turn = false) => {
          if (get().readOnly) return;
          const game = get().current?.game;
          if (game) updateGame(turn ? undoTurn(game) : undoDart(game));
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
