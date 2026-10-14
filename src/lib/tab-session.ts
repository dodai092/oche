import { useGameStore } from "./store";
let started = false;
let requesting = false;
let release: (() => void) | undefined;
let pageActive = true;
async function readLatest() {
  await useGameStore.persist.rehydrate();
  useGameStore.getState().ready();
}
export async function acquireScoringTab() {
  if (requesting || release) return;
  if (!navigator.locks) {
    await readLatest();
    useGameStore.setState({
      readOnly: true,
      tabMessage:
        "This browser cannot protect against other scoring tabs. Use a browser with Web Locks to save changes.",
    });
    return;
  }
  requesting = true;
  try {
    // Do not await the full request: its callback holds the lock for this page's lifetime.
    await new Promise<void>((settled, reject) => {
      void navigator.locks
        .request("oche-v1-writer", { ifAvailable: true }, async (lock) => {
          try {
            if (!lock || !pageActive) {
              await readLatest();
              useGameStore.setState({
                readOnly: true,
                tabMessage:
                  "Another Oche tab is saving this scorebook. This tab is read-only. Close the other tab, then enable scoring here.",
              });
              settled();
              return;
            }
            let end!: () => void;
            const held = new Promise<void>((resolve) => {
              end = resolve;
            });
            release = end;
            await readLatest();
            if (!pageActive) {
              release = undefined;
              end();
              settled();
              return;
            }
            useGameStore.setState({ readOnly: false, tabMessage: null });
            settled();
            await held;
          } catch (error) {
            release = undefined;
            reject(error);
          }
        })
        .catch(reject);
    });
  } catch {
    useGameStore.setState({
      readOnly: true,
      hydrated: true,
      tabMessage:
        "Scoring access could not be acquired. Reload this page to try again.",
    });
  } finally {
    requesting = false;
  }
}
export function startTabSession() {
  if (started) return;
  started = true;
  window.addEventListener("pagehide", () => {
    pageActive = false;
    useGameStore.setState({ readOnly: true });
    release?.();
    release = undefined;
  });
  window.addEventListener("pageshow", () => {
    pageActive = true;
    void acquireScoringTab();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "oche-v1" && useGameStore.getState().readOnly)
      void readLatest();
  });
  void acquireScoringTab();
}
