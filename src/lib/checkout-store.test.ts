import { beforeEach, expect, it, vi } from "vitest";
import type { CheckoutConfig } from "./checkout-engine";
import type { Dart } from "./engine";

beforeEach(() => {
  vi.resetModules();
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
});
const S = (value: number): Dart => ({ value, multiplier: 1 });
const D = (value: number): Dart => ({ value, multiplier: 2 });
const config: CheckoutConfig = {
  startTarget: 40,
  dartsPerAttempt: 6,
  rounds: 1,
  players: [{ id: "alice", name: "Alice" }],
};

it("never treats a checkout match as x01, Cricket or Around the Clock", async () => {
  const { useGameStore, isX01, isAtc, isCricket, isCheckout, matchLabel } =
    await import("./store");
  useGameStore.getState().startCheckout(config);
  const current = useGameStore.getState().current;
  expect(isCheckout(current)).toBe(true);
  expect(isX01(current)).toBe(false);
  expect(isCricket(current)).toBe(false);
  expect(isAtc(current)).toBe(false);
  expect(matchLabel(current!)).toBe("121 Checkout");
});

it("routes darts, undo, turn end and end of run to the checkout engine only", async () => {
  const { useGameStore, isCheckout } = await import("./store");
  const store = useGameStore.getState();
  store.startCheckout(config);
  // x01, Cricket and Around the Clock actions leave a checkout match alone.
  store.dart(S(20));
  store.cricketDart(S(20));
  store.atcDart(S(1));
  store.visit(60);
  let current = useGameStore.getState().current;
  expect(isCheckout(current) && current.checkout.events).toHaveLength(0);
  store.checkoutDart(S(1));
  current = useGameStore.getState().current;
  expect(isCheckout(current) && current.checkout.turnDarts).toHaveLength(1);
  store.checkoutFinishTurn();
  store.checkoutUndo();
  current = useGameStore.getState().current;
  expect(isCheckout(current) && current.checkout.events).toHaveLength(0);
  store.checkoutEndRun();
  expect(useGameStore.getState().history).toHaveLength(1);
  store.checkoutUndo();
  current = useGameStore.getState().current;
  expect(isCheckout(current) && current.checkout.status).toBe("playing");
});

it("has no winner: the winner helpers return null and the result line names the best checkout", async () => {
  const { useGameStore, matchWinner, matchWinnerName, matchResultLine } =
    await import("./store");
  const store = useGameStore.getState();
  store.startCheckout(config);
  store.checkoutDart(D(20));
  const finished = useGameStore.getState().current!;
  expect(matchWinner(finished)).toBeNull();
  expect(matchWinnerName(finished)).toBeNull();
  expect(matchResultLine(finished)).toBe("Best checkout 40");
  store.rematch();
  store.checkoutEndRun();
  expect(matchResultLine(useGameStore.getState().current!)).toBe("No checkout");
});

it("keeps the winner helpers working for a finished x01 match", async () => {
  const { useGameStore, matchWinner, matchResultLine } = await import("./store");
  const store = useGameStore.getState();
  store.start({
    startScore: 301,
    doubleOut: false,
    legsToWin: 1,
    setsToWin: 1,
    players: [{ id: "solo", name: "Solo" }],
  });
  const triple20: Dart = { value: 20, multiplier: 3 };
  for (let i = 0; i < 5; i++) store.dart(triple20); // 300
  store.dart(S(1)); // 301
  const current = useGameStore.getState().current!;
  expect(current.finishedAt).toBeDefined();
  expect(matchWinner(current)?.id).toBe("solo");
  expect(matchResultLine(current)).toBe("Solo wins");
});

it("archives a finished match and rematches with the same settings", async () => {
  const { useGameStore, isCheckout } = await import("./store");
  const store = useGameStore.getState();
  store.startCheckout(config);
  store.checkoutDart(D(20));
  expect(useGameStore.getState().history).toHaveLength(1);
  const finished = useGameStore.getState().current!;
  store.rematch();
  const next = useGameStore.getState().current!;
  expect(next.id).not.toBe(finished.id);
  expect(isCheckout(next) && next.checkout.config).toEqual(
    isCheckout(finished) && finished.checkout.config,
  );
  expect(isCheckout(next) && next.checkout.events).toEqual([]);
  expect(useGameStore.getState().history).toHaveLength(1);
});
