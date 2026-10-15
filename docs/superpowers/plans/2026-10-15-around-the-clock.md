# Around the Clock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Around the Clock (every setting from the reference screenshot, 1 to 4 local players, first to N legs) as a third game mode beside x01 and Cricket, without changing x01 or Cricket behavior or any saved data.

**Architecture:** A new pure, event-sourced `atc-engine.ts` (dart and end-turn events replayed from scratch, like `cricket-engine.ts`). Saved matches become a three-way union tagged by `mode`: x01 (mode missing or `"x01"`), `"cricket"` and a new `"atc"` that carries an `atc` game. History, backup, tab lock, offline cache and profiles stay shared. The random order is resolved once at setup and stored in the config.

**Tech Stack:** Next.js 16 App Router (static export), React 19, Zustand persist, TypeScript, Vitest, Playwright (Chromium, mobile Chromium, mobile WebKit), plain CSS in `src/app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-10-15-around-the-clock-design.md`

## Global Constraints

- Never use em dashes anywhere (code comments, UI copy, docs, commit messages). Use a period, comma, "and" or "so".
- Keep the charcoal/lime identity and existing design tokens: `--bg`, `--surface`, `--raised`, `--line`, `--text`, `--muted`, `--lime`. No new colors.
- Keep the Dodai navbar removed. Do not add a bot, speech, statistics, round limits or sets for this mode, and do not build 121 Checkout (it has its own spec and plan).
- x01 and Cricket scoring rules, saved data shape and every existing test stay green. Old saves have no `mode` and must load as x01. Cricket saves (`mode: "cricket"`) load unchanged.
- Minimum 12px text, 44px touch targets on mobile, visible focus, no horizontal overflow at 320px.
- Dart events are the single source of truth. Every derived value comes from replaying events. The engine never shuffles or reads a clock.
- Tests: `npx vitest run`, `npx playwright test --workers=2` (dev server on 127.0.0.1:3000 is reused), `npx tsc --noEmit`, `npx eslint src tests scripts`. Task 6 also needs `GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH=/oche npm run build` then `NEXT_PUBLIC_BASE_PATH=/oche node scripts/verify-offline.mjs`.
- Visual checks happen in ONE batched round after Task 6 at 1440x900, 390x844 and 844x390: fix everything in one pass, one confirmation round, then stop. Do not take screenshots in earlier tasks.
- Commit messages end with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Do not push; the user pushes when ready.
- Check `git status` before editing. `.claude/` and `.impeccable/` are untracked on purpose.

## Review Focus

Failure modes the spec implies that most likely bite a person using the app. Each has a test in the task named.

1. `isX01` currently means "not Cricket". An Around the Clock match must never be treated as x01 (the x01 engine would be handed an ATC game). Task 2.
2. Saves from before this feature (x01 with no `mode`, and Cricket) must still load and resume. Task 2.
3. A random order must be identical after a refresh and after a backup round trip, never re-shuffled. Tasks 2 and 4.
4. Increase by segment must not finish a leg through a bull step, and undoing the winning dart must restore the previous position. Tasks 1 and 5.
5. Refreshing in the middle of a turn restores the same partial turn. Task 5.
6. Switching from "DartBot" in x01 setup to Around the Clock must turn the bot slot back into a normal player. Task 4.
7. A history that mixes x01, Cricket and Around the Clock must render all three, keep Statistics honest, and survive export then import. Task 6.

## File Structure

- Create `src/lib/atc-engine.ts`, `src/lib/atc-engine.test.ts`, `src/lib/atc-persistence.test.ts`, `src/lib/atc-store.test.ts`.
- Modify `src/lib/store.ts`: `AtcMatch`, three-way `AnyMatch`, `isAtc`, `matchGame`, ATC actions, mode-safe x01 actions.
- Modify `src/lib/persistence.ts`: restore ATC matches.
- Create `src/components/atc-board.tsx`, `atc-match.tsx`, `atc-summary.tsx`, `atc-settings.tsx`.
- Modify `live-match.tsx`, `match-setup.tsx`, `dashboard.tsx`, `data-screens.tsx`: dispatch and entry points.
- Modify `src/app/globals.css`: ATC styles (append only).
- Create `tests/e2e/atc.spec.ts`. Modify `tests/e2e/cricket.spec.ts` (one regex, Task 6).
- Modify `README.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/PROGRESS.md`.

---

### Task 1: Around the Clock engine

**Files:**
- Create: `src/lib/atc-engine.ts`
- Create: `src/lib/atc-engine.test.ts`

**Interfaces:**
- Produces (used by every later task): types `AtcFinish`, `AtcField`, `AtcOrderMode`, `AtcConfig`, `AtcStep`, `AtcEvent`, `AtcTurn`, `AtcPlayer`, `AtcGame`; functions `makeAtcOrder(mode, random)`, `atcSteps(config)`, `atcStepLabel(step)`, `createAtcGame(config)`, `atcCurrent(game, playerIndex)` returning `{ step, hitsLeft } | null`, `throwAtcDart(game, dart)`, `endAtcTurn(game)`, `undoAtcDart(game)`, `undoAtcTurn(game)`, `restoreAtcGame(config, events)`, `atcSummary(game)` returning per player `{ id, name, legs, darts, hits, hitRate }`.
- Consumes: `Dart`, `validateDart` from `./engine` (`validateDart` is already exported).

The code below was written and run during planning: all 28 tests, `tsc` and `eslint` passed.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/atc-engine.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  atcCurrent,
  atcStepLabel,
  atcSteps,
  atcSummary,
  createAtcGame,
  endAtcTurn,
  makeAtcOrder,
  restoreAtcGame,
  throwAtcDart,
  undoAtcDart,
  undoAtcTurn,
  type AtcConfig,
  type AtcGame,
} from "./atc-engine";
import type { Dart } from "./engine";

const S = (value: number): Dart => ({ value, multiplier: 1 });
const D = (value: number): Dart => ({ value, multiplier: 2 });
const T = (value: number): Dart => ({ value, multiplier: 3 });
const miss = S(0);
const lowHigh = makeAtcOrder("low-high", Math.random);

function config(overrides: Partial<AtcConfig> = {}, players = 2): AtcConfig {
  return {
    finish: "bullseye",
    field: "any",
    hitsPerTarget: 1,
    increase: false,
    orderMode: "low-high",
    order: lowHigh,
    legsToWin: 1,
    players: Array.from({ length: players }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player ${i + 1}`,
    })),
    ...overrides,
  };
}
const solo = (overrides: Partial<AtcConfig> = {}) =>
  createAtcGame(config(overrides, 1));
function throwAll(game: AtcGame, darts: Dart[]): AtcGame {
  return darts.reduce((g, d) => throwAtcDart(g, d), game);
}
/** Solo helper: clear numbers 1 to n inclusive with singles. */
function clearTo(game: AtcGame, n: number): AtcGame {
  return throwAll(
    game,
    Array.from({ length: n }, (_, i) => S(i + 1)),
  );
}
const target = (g: AtcGame, i = 0) => atcStepLabel(atcCurrent(g, i)!.step);

describe("order and steps", () => {
  it("builds low to high, high to low and a deterministic shuffle", () => {
    expect(makeAtcOrder("low-high", Math.random)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    expect(makeAtcOrder("high-low", Math.random)[0]).toBe(20);
    const a = makeAtcOrder("random", () => 0.5);
    const b = makeAtcOrder("random", () => 0.5);
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(lowHigh);
    expect(a).not.toEqual(lowHigh);
  });
  it("adds one bull step, or two for the all finish", () => {
    expect(atcSteps(config({ finish: "single-bull" })).slice(20)).toEqual([
      { target: 25, bull: "any" },
    ]);
    expect(atcSteps(config({ finish: "bullseye" })).slice(20)).toEqual([
      { target: 25, bull: "inner" },
    ]);
    expect(atcSteps(config({ finish: "all" })).slice(20)).toEqual([
      { target: 25, bull: "outer" },
      { target: 25, bull: "inner" },
    ]);
  });
});

describe("configuration", () => {
  it("accepts 1 to 4 players", () => {
    expect(() => createAtcGame(config({}, 1))).not.toThrow();
    expect(() => createAtcGame(config({}, 4))).not.toThrow();
  });
  it("rejects bad configurations", () => {
    expect(() => createAtcGame(config({}, 0))).toThrow(RangeError);
    expect(() => createAtcGame(config({}, 5))).toThrow(RangeError);
    expect(() => createAtcGame(config({ hitsPerTarget: 4 }))).toThrow(RangeError);
    expect(() => createAtcGame(config({ hitsPerTarget: 0 }))).toThrow(RangeError);
    expect(() => createAtcGame(config({ legsToWin: 0 }))).toThrow(RangeError);
    expect(() => createAtcGame(config({ finish: "x" as never }))).toThrow(RangeError);
    expect(() => createAtcGame(config({ field: "x" as never }))).toThrow(RangeError);
    expect(() => createAtcGame(config({ order: lowHigh.slice(1) }))).toThrow(RangeError);
    expect(() =>
      createAtcGame(config({ order: [...lowHigh.slice(1), 2] })),
    ).toThrow(RangeError);
    const dup = config();
    dup.players[1].id = dup.players[0].id;
    expect(() => createAtcGame(dup)).toThrow(RangeError);
  });
});

describe("progress", () => {
  it("moves on only when the current number is hit", () => {
    let g = solo();
    expect(target(g)).toBe("1");
    g = throwAtcDart(g, S(2));
    expect(target(g)).toBe("1");
    g = throwAtcDart(g, S(1));
    expect(target(g)).toBe("2");
  });
  it("follows the chosen order", () => {
    const g = solo({ orderMode: "high-low", order: makeAtcOrder("high-low", Math.random) });
    expect(target(g)).toBe("20");
    expect(target(throwAtcDart(g, S(20)))).toBe("19");
  });
  it("lets a double or a treble count under the any field", () => {
    expect(target(throwAtcDart(solo(), D(1)))).toBe("2");
    expect(target(throwAtcDart(solo(), T(1)))).toBe("2");
  });
});

describe("target field", () => {
  it("accepts only the chosen multiplier", () => {
    const only = (field: "single" | "double" | "treble", ok: Dart, bad: Dart[]) => {
      let g = solo({ field });
      for (const d of bad) g = throwAtcDart(g, d);
      expect(target(g)).toBe("1");
      expect(target(throwAtcDart(g, ok))).toBe("2");
    };
    only("single", S(1), [D(1), T(1)]);
    only("double", D(1), [S(1), T(1)]);
    only("treble", T(1), [S(1), D(1)]);
  });
});

describe("hits per target", () => {
  it("needs the chosen number of hits and keeps them across turns", () => {
    let g = createAtcGame(config({ hitsPerTarget: 2 }));
    g = throwAtcDart(g, S(1));
    expect(atcCurrent(g, 0)!.hitsLeft).toBe(1);
    g = endAtcTurn(g);
    g = endAtcTurn(throwAtcDart(g, miss));
    expect(target(g, 0)).toBe("1");
    expect(atcCurrent(g, 0)!.hitsLeft).toBe(1);
    g = throwAtcDart(g, S(1));
    expect(target(g, 0)).toBe("2");
  });
});

describe("increase by segment", () => {
  const inc = (overrides: Partial<AtcConfig> = {}) =>
    solo({ increase: true, ...overrides });
  it("moves a double two numbers and a treble three", () => {
    expect(target(throwAtcDart(inc(), D(1)))).toBe("3");
    expect(target(throwAtcDart(inc(), T(1)))).toBe("4");
    expect(target(throwAtcDart(inc(), S(1)))).toBe("2");
  });
  it("rolls surplus hits on when more than one hit is needed", () => {
    const g = throwAtcDart(inc({ hitsPerTarget: 2 }), T(1));
    expect(target(g)).toBe("2");
    expect(atcCurrent(g, 0)!.hitsLeft).toBe(1);
    const h = throwAtcDart(inc({ hitsPerTarget: 3 }), D(1));
    expect(target(h)).toBe("1");
    expect(atcCurrent(h, 0)!.hitsLeft).toBe(1);
  });
  it("does not skip numbers when the toggle is off", () => {
    expect(target(throwAtcDart(solo(), T(1)))).toBe("2");
  });
  it("stops at the bull step and drops surplus past the last number", () => {
    const at19 = clearTo(inc(), 18);
    expect(target(at19)).toBe("19");
    const afterTreble = throwAtcDart(at19, T(19));
    expect(target(afterTreble)).toBe("Bullseye");
    expect(afterTreble.status).toBe("playing");
    const at20 = clearTo(inc(), 19);
    expect(target(throwAtcDart(at20, T(20)))).toBe("Bullseye");
  });
});

describe("finish options", () => {
  const atBull = (finish: "single-bull" | "bullseye" | "all") =>
    clearTo(solo({ finish }), 20);
  it("single bull is won by the outer or the inner bull", () => {
    expect(throwAtcDart(atBull("single-bull"), S(25)).status).toBe("complete");
    expect(throwAtcDart(atBull("single-bull"), D(25)).status).toBe("complete");
  });
  it("bullseye is won only by the inner bull", () => {
    const g = atBull("bullseye");
    expect(target(g)).toBe("Bullseye");
    expect(throwAtcDart(g, S(25)).status).toBe("playing");
    expect(throwAtcDart(g, D(25)).status).toBe("complete");
  });
  it("all needs the outer bull and then the inner bull", () => {
    let g = atBull("all");
    expect(target(g)).toBe("Outer bull");
    g = throwAtcDart(g, D(25));
    expect(target(g)).toBe("Outer bull");
    g = throwAtcDart(g, S(25));
    expect(target(g)).toBe("Bullseye");
    expect(throwAtcDart(g, S(25)).status).toBe("playing");
    expect(throwAtcDart(g, D(25)).status).toBe("complete");
  });
  it("ignores the field setting on the bull", () => {
    const g = clearTo(solo({ field: "treble", finish: "single-bull" }), 0);
    const ready = throwAll(
      g,
      Array.from({ length: 20 }, (_, i) => T(i + 1)),
    );
    expect(throwAtcDart(ready, S(25)).status).toBe("complete");
  });
});

describe("turns, legs and winning", () => {
  it("wins as soon as the last step is hit, even mid-turn", () => {
    let g = createAtcGame(config({ finish: "single-bull" }, 1));
    g = clearTo(g, 20);
    expect(g.turnDarts).toHaveLength(2);
    g = throwAtcDart(g, S(25));
    expect(g.status).toBe("complete");
    expect(g.winner).toBe(0);
  });
  it("switches after three darts and on an early end of turn", () => {
    let g = createAtcGame(config());
    g = throwAll(g, [miss, miss, miss]);
    expect(g.activePlayer).toBe(1);
    g = endAtcTurn(throwAtcDart(g, miss));
    expect(g.activePlayer).toBe(0);
  });
  it("tracks each player on their own", () => {
    let g = createAtcGame(config());
    g = throwAll(g, [S(1), S(2), S(3)]);
    g = throwAll(g, [miss, miss, miss]);
    expect(target(g, 0)).toBe("4");
    expect(target(g, 1)).toBe("1");
  });
  it("rotates the starter and resets positions after a leg", () => {
    let g = createAtcGame(config({ finish: "single-bull", legsToWin: 2 }, 2));
    // Player 1 clears 1..20 and the bull while Player 2 only misses.
    const mine: Dart[] = [...Array.from({ length: 20 }, (_, i) => S(i + 1)), S(25)];
    for (let i = 0; i < mine.length; i += 3) {
      g = throwAll(g, mine.slice(i, i + 3));
      if (g.status === "playing" && g.leg === 1) g = throwAll(g, [miss, miss, miss]);
    }
    expect(g.leg).toBe(2);
    expect(g.players[0].legs).toBe(1);
    expect(g.activePlayer).toBe(1);
    expect(g.players.every((p) => p.step === 0)).toBe(true);
  });
  it("completes the match at the leg target and refuses further events", () => {
    let g = clearTo(solo({ finish: "single-bull" }), 20);
    g = throwAtcDart(g, S(25));
    expect(g.status).toBe("complete");
    expect(throwAtcDart(g, S(1))).toBe(g);
    expect(() =>
      restoreAtcGame(g.config, [...g.events, { type: "dart", dart: S(1) }]),
    ).toThrow(RangeError);
  });
});

describe("undo and restore", () => {
  it("undoes a dart and a turn by replay", () => {
    let g = createAtcGame(config());
    g = throwAll(g, [S(1), S(2), S(3)]);
    g = throwAtcDart(g, miss);
    expect(undoAtcDart(g).events).toHaveLength(3);
    expect(undoAtcDart(g).activePlayer).toBe(1);
    expect(undoAtcTurn(g).events).toHaveLength(3);
    const first = undoAtcTurn(undoAtcTurn(g));
    expect(first.events).toHaveLength(0);
    expect(target(first)).toBe("1");
  });
  it("undo also removes an explicit end of turn", () => {
    let g = createAtcGame(config());
    g = endAtcTurn(throwAtcDart(g, S(1)));
    expect(g.activePlayer).toBe(1);
    const back = undoAtcDart(g);
    expect(back.activePlayer).toBe(0);
    expect(back.events).toHaveLength(0);
  });
  it("undoing the winning dart restores the position", () => {
    const before = clearTo(solo({ finish: "single-bull" }), 20);
    const won = throwAtcDart(before, S(25));
    expect(won.status).toBe("complete");
    const back = undoAtcDart(won);
    expect(back.status).toBe("playing");
    expect(back.winner).toBeNull();
    expect(back.players[0].legs).toBe(0);
    expect(target(back)).toBe("Bull");
  });
  it("restoring the saved events rebuilds the same state", () => {
    let g = createAtcGame(
      config({ increase: true, hitsPerTarget: 2, field: "any" }, 3),
    );
    g = throwAll(g, [S(1), D(1), T(2)]);
    g = endAtcTurn(throwAtcDart(g, S(1)));
    expect(restoreAtcGame(g.config, g.events)).toEqual(g);
  });
  it("rejects malformed saved events", () => {
    const c = config();
    expect(() => restoreAtcGame(c, [{ type: "visit" } as never])).toThrow(RangeError);
    expect(() => restoreAtcGame(c, [{ type: "dart" } as never])).toThrow(RangeError);
    expect(() =>
      restoreAtcGame(c, [{ type: "dart", dart: T(25) }]),
    ).toThrow(RangeError);
  });
});

describe("summary", () => {
  it("reports darts, hits and hit rate, counting unthrown darts as misses", () => {
    let g = createAtcGame(config());
    g = endAtcTurn(throwAll(g, [S(1), miss]));
    const [first, second] = atcSummary(g);
    expect(first).toMatchObject({ darts: 3, hits: 1 });
    expect(first.hitRate).toBeCloseTo(1 / 3);
    expect(second).toMatchObject({ darts: 0, hits: 0, hitRate: 0 });
  });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run src/lib/atc-engine.test.ts`
Expected: FAIL, cannot find module `./atc-engine`.

- [ ] **Step 3: Write the engine**

Create `src/lib/atc-engine.ts`:

```ts
import { validateDart, type Dart } from "./engine";

export type AtcFinish = "single-bull" | "bullseye" | "all";
export type AtcField = "any" | "single" | "double" | "treble";
export type AtcOrderMode = "low-high" | "high-low" | "random";
export type AtcConfig = {
  finish: AtcFinish;
  field: AtcField;
  /** Qualifying hits needed to clear each number, 1 to 3. */
  hitsPerTarget: number;
  /** Increase by segment: a double counts as 2 hits and a treble as 3. */
  increase: boolean;
  orderMode: AtcOrderMode;
  /** The resolved sequence: a permutation of 1 to 20. Never shuffled by the engine. */
  order: number[];
  legsToWin: number;
  players: { id: string; name: string }[];
};
export type AtcStep = {
  /** 1 to 20, or 25 for a bull step. */
  target: number;
  bull: null | "any" | "outer" | "inner";
};
export type AtcEvent = { type: "dart"; dart: Dart } | { type: "end-turn" };
export type AtcTurn = {
  playerIndex: number;
  darts: Dart[];
  leg: number;
  /** Darts that moved the player forward. */
  hits: number;
  /** Darts not thrown when the turn was ended early; they count as misses. */
  unthrown: number;
  complete: boolean;
};
export type AtcPlayer = {
  id: string;
  name: string;
  /** Index into atcSteps(config). Equal to the step count only while a leg is being won. */
  step: number;
  /** Qualifying hits already made on the current number. */
  hits: number;
  legs: number;
};
export type AtcGame = {
  config: AtcConfig;
  steps: AtcStep[];
  players: AtcPlayer[];
  activePlayer: number;
  turnDarts: Dart[];
  turns: AtcTurn[];
  leg: number;
  status: "playing" | "complete";
  winner: number | null;
  notice: string | null;
  events: AtcEvent[];
};

const FINISHES: AtcFinish[] = ["single-bull", "bullseye", "all"];
const FIELDS: AtcField[] = ["any", "single", "double", "treble"];
const ORDER_MODES: AtcOrderMode[] = ["low-high", "high-low", "random"];

/** Build the 20-number sequence. Randomness is injected so the engine stays pure. */
export function makeAtcOrder(
  mode: AtcOrderMode,
  random: () => number,
): number[] {
  const order = Array.from({ length: 20 }, (_, i) => i + 1);
  if (mode === "high-low") return order.reverse();
  if (mode === "low-high") return order;
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function atcSteps(config: AtcConfig): AtcStep[] {
  const numbers: AtcStep[] = config.order.map((target) => ({
    target,
    bull: null,
  }));
  if (config.finish === "all")
    return [
      ...numbers,
      { target: 25, bull: "outer" },
      { target: 25, bull: "inner" },
    ];
  return [
    ...numbers,
    { target: 25, bull: config.finish === "bullseye" ? "inner" : "any" },
  ];
}

export function atcStepLabel(step: AtcStep): string {
  if (step.bull === "any") return "Bull";
  if (step.bull === "outer") return "Outer bull";
  if (step.bull === "inner") return "Bullseye";
  return String(step.target);
}

export function createAtcGame(config: AtcConfig): AtcGame {
  if (
    !FINISHES.includes(config.finish) ||
    !FIELDS.includes(config.field) ||
    !ORDER_MODES.includes(config.orderMode) ||
    typeof config.increase !== "boolean" ||
    !Number.isInteger(config.hitsPerTarget) ||
    config.hitsPerTarget < 1 ||
    config.hitsPerTarget > 3 ||
    !Number.isInteger(config.legsToWin) ||
    config.legsToWin < 1 ||
    !Array.isArray(config.order) ||
    config.order.length !== 20 ||
    [...config.order].sort((a, b) => a - b).some((n, i) => n !== i + 1) ||
    !Array.isArray(config.players) ||
    config.players.length < 1 ||
    config.players.length > 4 ||
    config.players.some(
      (p) =>
        typeof p.id !== "string" ||
        !p.id ||
        typeof p.name !== "string" ||
        !p.name.trim() ||
        p.name.length > 40,
    ) ||
    new Set(config.players.map((p) => p.id)).size !== config.players.length
  )
    throw new RangeError("Invalid Around the Clock configuration");
  const copy: AtcConfig = {
    ...config,
    order: [...config.order],
    players: config.players.map((p) => ({ ...p })),
  };
  return {
    config: copy,
    steps: atcSteps(copy),
    players: copy.players.map((p) => ({
      id: p.id,
      name: p.name,
      step: 0,
      hits: 0,
      legs: 0,
    })),
    activePlayer: 0,
    turnDarts: [],
    turns: [],
    leg: 1,
    status: "playing",
    winner: null,
    notice: null,
    events: [],
  };
}

/** The player's current target and how many more hits it needs, or null when finished. */
export function atcCurrent(game: AtcGame, playerIndex: number) {
  const p = game.players[playerIndex];
  const step = game.steps[p.step];
  if (!step) return null;
  return {
    step,
    hitsLeft: step.bull ? 1 : game.config.hitsPerTarget - p.hits,
  };
}

function fieldFits(field: AtcField, multiplier: number): boolean {
  if (field === "any") return true;
  return (
    (field === "single" && multiplier === 1) ||
    (field === "double" && multiplier === 2) ||
    (field === "treble" && multiplier === 3)
  );
}

/** The increase-by-segment rule lives here: hits roll on, but stop at the bull steps. */
function advance(game: AtcGame, player: AtcPlayer, credit: number) {
  const need = game.config.hitsPerTarget;
  while (credit > 0 && player.step < game.steps.length) {
    if (game.steps[player.step].bull) return;
    const left = need - player.hits;
    if (credit >= left) {
      credit -= left;
      player.step += 1;
      player.hits = 0;
    } else {
      player.hits += credit;
      credit = 0;
    }
  }
}

/** True when the dart moved the active player forward. */
function applyDart(game: AtcGame, dart: Dart): boolean {
  const player = game.players[game.activePlayer];
  const step = game.steps[player.step];
  if (!step) return false;
  if (step.bull) {
    const ok =
      dart.value === 25 &&
      (step.bull === "any" ||
        (step.bull === "outer" && dart.multiplier === 1) ||
        (step.bull === "inner" && dart.multiplier === 2));
    if (ok) {
      player.step += 1;
      player.hits = 0;
    }
    return ok;
  }
  if (dart.value !== step.target || !fieldFits(game.config.field, dart.multiplier))
    return false;
  advance(game, player, game.config.increase ? dart.multiplier : 1);
  return true;
}

function startTurn(game: AtcGame) {
  game.turns.push({
    playerIndex: game.activePlayer,
    darts: [],
    leg: game.leg,
    hits: 0,
    unthrown: 0,
    complete: false,
  });
}

function nextPlayer(game: AtcGame) {
  game.turns[game.turns.length - 1].complete = true;
  game.activePlayer = (game.activePlayer + 1) % game.players.length;
  game.turnDarts = [];
}

function winLeg(game: AtcGame, winner: number) {
  const winnerPlayer = game.players[winner];
  winnerPlayer.legs += 1;
  game.turns[game.turns.length - 1].complete = true;
  game.turnDarts = [];
  if (winnerPlayer.legs === game.config.legsToWin) {
    game.status = "complete";
    game.winner = winner;
    return;
  }
  game.notice = `${winnerPlayer.name} won the leg`;
  game.leg += 1;
  for (const p of game.players) {
    p.step = 0;
    p.hits = 0;
  }
  game.activePlayer = (game.leg - 1) % game.players.length;
}

/** Replay owns all its objects; public transitions never mutate their input. */
function replay(config: AtcConfig, events: AtcEvent[]): AtcGame {
  const game = createAtcGame(config);
  for (const event of events) {
    if (game.status === "complete")
      throw new RangeError("Saved events continue after match completion.");
    game.notice = null;
    if (event.type === "end-turn") {
      if (!game.turnDarts.length) continue;
      game.events.push({ type: "end-turn" });
      game.turns[game.turns.length - 1].unthrown = 3 - game.turnDarts.length;
      nextPlayer(game);
      continue;
    }
    const dart = { ...event.dart };
    validateDart(dart);
    game.events.push({ type: "dart", dart });
    if (!game.turnDarts.length) startTurn(game);
    const turn = game.turns[game.turns.length - 1];
    turn.darts.push(dart);
    game.turnDarts.push(dart);
    if (applyDart(game, dart)) turn.hits += 1;
    if (game.players[game.activePlayer].step === game.steps.length)
      winLeg(game, game.activePlayer);
    else if (game.turnDarts.length === 3) nextPlayer(game);
  }
  return game;
}

export function throwAtcDart(game: AtcGame, dart: Dart): AtcGame {
  if (game.status === "complete") return game;
  validateDart(dart);
  return replay(game.config, [...game.events, { type: "dart", dart }]);
}

/** Finishing early records the unthrown darts as misses in the summary. */
export function endAtcTurn(game: AtcGame): AtcGame {
  if (game.status === "complete" || !game.turnDarts.length) return game;
  return replay(game.config, [...game.events, { type: "end-turn" }]);
}

/** Also removes an explicit end-turn after that dart, reopening the visit. */
export function undoAtcDart(game: AtcGame): AtcGame {
  for (let i = game.events.length - 1; i >= 0; i--) {
    if (game.events[i].type === "dart")
      return replay(game.config, game.events.slice(0, i));
  }
  return game;
}

/** Removes the current partial visit, or the most recent completed visit when empty. */
export function undoAtcTurn(game: AtcGame): AtcGame {
  const turn = game.turns[game.turns.length - 1];
  if (!turn) return game;
  const endMarker =
    game.events[game.events.length - 1]?.type === "end-turn" ? 1 : 0;
  return replay(
    game.config,
    game.events.slice(0, game.events.length - turn.darts.length - endMarker),
  );
}

/** Restore only legal events, rebuilding all derived state. */
export function restoreAtcGame(
  config: AtcConfig,
  events: AtcEvent[],
): AtcGame {
  if (!Array.isArray(events) || events.length > 50000)
    throw new RangeError("Invalid saved events");
  for (const event of events) {
    if (!event || (event.type !== "dart" && event.type !== "end-turn"))
      throw new RangeError("Invalid saved event");
    if (event.type === "dart") {
      if (!event.dart) throw new RangeError("Missing saved dart");
      validateDart(event.dart);
    }
  }
  return replay(config, events);
}

export function atcSummary(game: AtcGame) {
  return game.players.map((p, i) => {
    const turns = game.turns.filter((t) => t.playerIndex === i);
    const darts = turns.reduce((s, t) => s + t.darts.length + t.unthrown, 0);
    const hits = turns.reduce((s, t) => s + t.hits, 0);
    return {
      id: p.id,
      name: p.name,
      legs: p.legs,
      darts,
      hits,
      hitRate: darts ? hits / darts : 0,
    };
  });
}
```

- [ ] **Step 4: Run the tests and type checks**

Run: `npx vitest run src/lib/atc-engine.test.ts && npx tsc --noEmit && npx eslint src/lib`
Expected: 28 tests pass, no type or lint errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/atc-engine.ts src/lib/atc-engine.test.ts
git commit -m "Add Around the Clock engine

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Saved-match union, store actions and persistence

**Files:**
- Modify: `src/lib/store.ts`
- Modify: `src/lib/persistence.ts`
- Create: `src/lib/atc-persistence.test.ts`
- Create: `src/lib/atc-store.test.ts`

**Interfaces:**
- Consumes: everything from Task 1.
- Produces (used by Tasks 3 to 6):
  - Type `AtcMatch = { id: string; startedAt: string; finishedAt?: string; mode: "atc"; atc: AtcGame }`; `AnyMatch = SavedMatch | CricketMatch | AtcMatch`.
  - From `store.ts`: `isAtc(m)`, `isX01(m)` (now false for both Cricket and ATC), `matchGame(m)` (the mode's game state; every game has `players`, `events`, `status`, `winner`), and the existing helpers `matchStatus`, `matchEventCount`, `matchPlayerNames`, `matchLabel` (ATC label `"Around the Clock"`), `matchWinnerName`.
  - Store actions `startAtc(config: AtcConfig)`, `atcDart(dart)`, `atcFinishTurn()`, `atcUndo(turn?: boolean)`. Existing `start`, `visit`, `dart`, `finishTurn`, `undo`, `startCricket`, `cricketDart`, `cricketFinishTurn`, `cricketUndo` keep their signatures and each acts only on its own mode. `rematch()` handles all three modes.

- [ ] **Step 1: Write the failing persistence tests**

Create `src/lib/atc-persistence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseBackup } from "./backup";
import { restorePersistedData } from "./persistence";
import {
  createAtcGame,
  makeAtcOrder,
  throwAtcDart,
  type AtcGame,
} from "./atc-engine";
import { createGame, type Dart } from "./engine";

const S = (value: number): Dart => ({ value, multiplier: 1 });
const D = (value: number): Dart => ({ value, multiplier: 2 });
const players = [
  { id: "a", name: "Ann" },
  { id: "b", name: "Ben" },
];
const settings = {
  startScore: 501,
  doubleOut: true,
  showCheckouts: true,
  entryMode: "total",
  keyboardMode: "keypad",
  keepAwake: false,
};
const order = makeAtcOrder("random", () => 0.3);
function fresh(): AtcGame {
  return createAtcGame({
    finish: "single-bull",
    field: "any",
    hitsPerTarget: 1,
    increase: false,
    orderMode: "random",
    order,
    legsToWin: 1,
    players: players.slice(0, 1),
  });
}
function finished(): AtcGame {
  let g = fresh();
  for (const n of order) g = throwAtcDart(g, S(n));
  return throwAtcDart(g, D(25));
}
const saved = (atc: AtcGame, id = "m1") => ({
  id,
  startedAt: "2026-10-15T10:00:00.000Z",
  finishedAt: "2026-10-15T10:20:00.000Z",
  mode: "atc",
  atc,
});
const state = (overrides: object) => ({
  current: null,
  history: [],
  profiles: [],
  settings,
  lastBackupAt: null,
  ...overrides,
});
const viaStorage = (value: unknown) => JSON.parse(JSON.stringify(value));

describe("saved matches with the atc mode", () => {
  it("still loads a save from before any mode as an x01 match", () => {
    const game = createGame({
      startScore: 501,
      doubleOut: true,
      legsToWin: 1,
      setsToWin: 1,
      players,
    });
    const restored = restorePersistedData(
      viaStorage(
        state({
          current: { id: "x1", startedAt: "2026-10-15T09:00:00.000Z", game },
        }),
      ),
    );
    expect(restored.current).toHaveProperty("game");
    expect(restored.current).not.toHaveProperty("mode");
  });

  it("round-trips an in-progress and a finished match with the same random order", () => {
    const partial = throwAtcDart(fresh(), S(order[0]));
    const restored = restorePersistedData(
      viaStorage(
        state({ current: saved(partial, "m2"), history: [saved(finished())] }),
      ),
    );
    expect(restored.history[0]).toMatchObject({ mode: "atc" });
    expect(
      "atc" in restored.history[0] && restored.history[0].atc.status,
    ).toBe("complete");
    const current = restored.current;
    expect(current && "atc" in current ? current.atc.turnDarts : []).toHaveLength(1);
    expect(current && "atc" in current ? current.atc.config.order : []).toEqual(order);
  });

  it("rejects an ATC match with a corrupted event list or order", () => {
    const broken = viaStorage(saved(finished()));
    broken.atc.events[0] = { type: "dart", dart: { value: 99, multiplier: 1 } };
    expect(() => restorePersistedData(state({ history: [broken] }))).toThrow();
    const badOrder = viaStorage(saved(finished()));
    badOrder.atc.config.order = [1, 1, 3];
    expect(() => restorePersistedData(state({ history: [badOrder] }))).toThrow();
  });

  it("rejects an unknown mode and an unfinished ATC match in history", () => {
    expect(() =>
      restorePersistedData(
        viaStorage(state({ history: [{ ...saved(finished()), mode: "golf" }] })),
      ),
    ).toThrow();
    expect(() =>
      restorePersistedData(
        viaStorage(state({ history: [saved(throwAtcDart(fresh(), S(order[0])))] })),
      ),
    ).toThrow(/Incomplete archived match/);
  });

  it("imports an ATC match from a backup file", () => {
    const raw = JSON.stringify({
      version: 1,
      ...state({ history: [saved(finished())] }),
    });
    expect(parseBackup(raw).history[0]).toMatchObject({ mode: "atc" });
  });
});
```

Create `src/lib/atc-store.test.ts`:

```ts
import { beforeEach, expect, it, vi } from "vitest";
import { makeAtcOrder, type AtcConfig } from "./atc-engine";
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
const config: AtcConfig = {
  finish: "single-bull",
  field: "any",
  hitsPerTarget: 1,
  increase: false,
  orderMode: "random",
  order: makeAtcOrder("random", () => 0.7),
  legsToWin: 1,
  players: [{ id: "alice", name: "Alice" }],
};

it("never treats an ATC match as x01 or Cricket", async () => {
  const { useGameStore, isX01, isAtc, isCricket, matchLabel } = await import("./store");
  useGameStore.getState().startAtc(config);
  const current = useGameStore.getState().current;
  expect(isAtc(current)).toBe(true);
  expect(isX01(current)).toBe(false);
  expect(isCricket(current)).toBe(false);
  expect(matchLabel(current!)).toBe("Around the Clock");
});

it("routes darts, undo and turn end to the ATC engine only", async () => {
  const { useGameStore, isAtc } = await import("./store");
  const store = useGameStore.getState();
  store.startAtc(config);
  // x01 and Cricket actions leave an ATC match alone.
  store.dart(S(20));
  store.cricketDart(S(20));
  store.visit(60);
  let current = useGameStore.getState().current;
  expect(isAtc(current) && current.atc.events).toHaveLength(0);
  store.atcDart(S(config.order[0]));
  current = useGameStore.getState().current;
  expect(isAtc(current) && current.atc.turnDarts).toHaveLength(1);
  store.atcFinishTurn();
  store.atcUndo();
  current = useGameStore.getState().current;
  expect(isAtc(current) && current.atc.events).toHaveLength(0);
});

it("archives a finished match and rematches with the same order and settings", async () => {
  const { useGameStore, isAtc } = await import("./store");
  const store = useGameStore.getState();
  store.startAtc(config);
  for (const n of config.order) store.atcDart(S(n));
  store.atcDart({ value: 25, multiplier: 1 });
  expect(useGameStore.getState().history).toHaveLength(1);
  const finished = useGameStore.getState().current!;
  store.rematch();
  const next = useGameStore.getState().current!;
  expect(next.id).not.toBe(finished.id);
  expect(isAtc(next) && next.atc.config).toEqual(isAtc(finished) && finished.atc.config);
  expect(isAtc(next) && next.atc.events).toEqual([]);
  expect(useGameStore.getState().history).toHaveLength(1);
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx vitest run src/lib/atc-persistence.test.ts src/lib/atc-store.test.ts`
Expected: FAIL (`startAtc` is not a function, ATC matches rejected as invalid).

- [ ] **Step 3: Update `src/lib/store.ts` types and helpers**

After the existing `} from "./cricket-engine";` line add:

```ts
import {
  createAtcGame,
  endAtcTurn,
  throwAtcDart,
  undoAtcDart,
  undoAtcTurn,
  type AtcConfig,
  type AtcGame,
} from "./atc-engine";
```

Replace this block:

```ts
export type AnyMatch = SavedMatch | CricketMatch;
export const isCricket = (m: AnyMatch | null | undefined): m is CricketMatch =>
  m?.mode === "cricket";
export const isX01 = (m: AnyMatch | null | undefined): m is SavedMatch =>
  !!m && m.mode !== "cricket";
const gameOf = (m: AnyMatch) => (isCricket(m) ? m.cricket : m.game);
```

with:

```ts
export type AtcMatch = {
  id: string;
  startedAt: string;
  finishedAt?: string;
  mode: "atc";
  atc: AtcGame;
};
export type AnyMatch = SavedMatch | CricketMatch | AtcMatch;
export const isCricket = (m: AnyMatch | null | undefined): m is CricketMatch =>
  m?.mode === "cricket";
export const isAtc = (m: AnyMatch | null | undefined): m is AtcMatch =>
  m?.mode === "atc";
export const isX01 = (m: AnyMatch | null | undefined): m is SavedMatch =>
  !!m && m.mode !== "cricket" && m.mode !== "atc";
/** The mode's game state. Every mode's game has players, events, status and winner. */
export const matchGame = (m: AnyMatch) =>
  isCricket(m) ? m.cricket : isAtc(m) ? m.atc : m.game;
```

Then replace every remaining `gameOf(` in the file with `matchGame(` (in `matchStatus`, `matchEventCount`, `matchPlayerNames`, `matchWinnerName`). Replace the `matchLabel` body:

```ts
export const matchLabel = (m: AnyMatch) =>
  isCricket(m)
    ? "Cricket"
    : isAtc(m)
      ? "Around the Clock"
      : String(m.game.config.startScore);
```

In the `Store` type add after `cricketUndo: (turn?: boolean) => void;`:

```ts
  startAtc: (config: AtcConfig) => void;
  atcDart: (dart: Dart) => void;
  atcFinishTurn: () => void;
  atcUndo: (turn?: boolean) => void;
```

- [ ] **Step 4: Update the store implementation**

Replace `if (!current || isCricket(current)) return;` (inside `updateGame`) with `if (!isX01(current)) return;`. Replace `return current && !isCricket(current) ? current.game : undefined;` (inside `x01Game`) with `return isX01(current) ? current.game : undefined;`.

After the `cricketGame` helper (the block ending `return isCricket(current) ? current.cricket : undefined;\n      };`) add:

```ts
      const updateAtc = (atc: AtcGame) => {
        const current = get().current;
        if (!isAtc(current)) return;
        commit(current, { ...current, atc }, atc.status === "complete");
      };
      const atcGame = () => {
        const current = get().current;
        return isAtc(current) ? current.atc : undefined;
      };
```

In `rematch` replace the two lines `if (isCricket(current)) get().startCricket(current.cricket.config);` and `else get().start(current.game.config);` with:

```ts
          if (isCricket(current)) get().startCricket(current.cricket.config);
          else if (isAtc(current)) get().startAtc(current.atc.config);
          else get().start(current.game.config);
```

After the `cricketUndo` action (it ends with `updateCricket(turn ? undoCricketTurn(game) : undoCricketDart(game));\n        },`) add:

```ts
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
```

- [ ] **Step 5: Update `src/lib/persistence.ts`**

After the `} from "./cricket-engine";` import add:

```ts
import {
  restoreAtcGame,
  type AtcConfig,
  type AtcEvent,
} from "./atc-engine";
```

In `match`, replace `if (v.mode !== undefined && v.mode !== "x01" && v.mode !== "cricket")` with:

```ts
  if (
    v.mode !== undefined &&
    v.mode !== "x01" &&
    v.mode !== "cricket" &&
    v.mode !== "atc"
  )
```

and directly before `  const g = record(v.game),` add:

```ts
  if (v.mode === "atc") {
    const a = record(v.atc),
      config = record(a.config);
    players(config);
    return {
      ...base,
      mode: "atc",
      atc: restoreAtcGame(config as AtcConfig, a.events as AtcEvent[]),
    };
  }
```

Replace the `status` helper in `restorePersistedData` with:

```ts
  const status = (m: AnyMatch) =>
    m.mode === "cricket"
      ? m.cricket.status
      : m.mode === "atc"
        ? m.atc.status
        : m.game.status;
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run`
Expected: every unit test passes, including the 8 new ones. `tsc` will still report errors in components that read `.game` from a possibly-ATC match; Task 3 fixes those. Do not run the browser suite yet.

- [ ] **Step 7: Commit**

```bash
git add src/lib/store.ts src/lib/persistence.ts src/lib/atc-persistence.test.ts src/lib/atc-store.test.ts
git commit -m "Store Around the Clock matches beside x01 and Cricket

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Guard x01-only code and show an ATC board

**Files:**
- Create: `src/components/atc-board.tsx`, `src/components/atc-match.tsx`
- Modify: `src/components/live-match.tsx`, `src/components/data-screens.tsx`
- Modify: `src/app/globals.css` (append)

**Interfaces:**
- Consumes: `AtcMatch`, `isAtc`, `isCricket`, `isX01`, `matchGame` from `@/lib/store`; `atcCurrent`, `atcStepLabel`, `AtcGame` from `@/lib/atc-engine`.
- Produces: `AtcBoard({ game })` and `AtcTrack({ game, playerIndex })` in `atc-board.tsx`; `AtcMatchView({ match })` and `atcSettingsLabel(config)` in `atc-match.tsx` (board and turn strip only; Task 5 adds input). Test ids `atc-target-{playerIndex}` (the current target label, or "Done") and `atc-progress-{playerIndex}`.

- [ ] **Step 1: Create the board**

Create `src/components/atc-board.tsx`:

```tsx
import { atcCurrent, atcStepLabel, type AtcGame } from "@/lib/atc-engine";

export function AtcBoard({ game }: { game: AtcGame }) {
  const total = game.steps.length;
  return (
    <section className="panel atc-board" aria-label="Around the Clock scoreboard">
      <ul className="atc-players">
        {game.players.map((p, i) => {
          const current = atcCurrent(game, i);
          const active = game.status === "playing" && i === game.activePlayer;
          return (
            <li key={p.id} className={active ? "is-active" : ""}>
              <div className="atc-player-head">
                <span className="atc-name">{p.name}</span>
                <small>
                  {p.legs} {p.legs === 1 ? "leg" : "legs"}
                </small>
              </div>
              <div className="atc-target">
                <span className="sr-only">Target </span>
                <strong data-testid={`atc-target-${i}`}>
                  {current ? atcStepLabel(current.step) : "Done"}
                </strong>
                {current && current.hitsLeft > 1 && (
                  <small>{current.hitsLeft} hits to go</small>
                )}
              </div>
              <div
                className="atc-bar"
                role="progressbar"
                aria-label={`${p.name} progress`}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={p.step}
              >
                <span style={{ width: `${Math.round((p.step / total) * 100)}%` }} />
              </div>
              <small data-testid={`atc-progress-${i}`}>
                {p.step} of {total} done
              </small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The active player's whole sequence, so the order (especially a random one) is visible. */
export function AtcTrack({
  game,
  playerIndex,
}: {
  game: AtcGame;
  playerIndex: number;
}) {
  const position = game.players[playerIndex].step;
  return (
    <ol className="atc-track" aria-label="Sequence">
      {game.steps.map((step, i) => (
        <li
          key={i}
          className={i < position ? "done" : i === position ? "now" : ""}
        >
          {atcStepLabel(step)}
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2: Create the match view (board and turn strip)**

Create `src/components/atc-match.tsx`:

```tsx
"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AtcBoard, AtcTrack } from "./atc-board";
import type { AtcConfig } from "@/lib/atc-engine";
import type { AtcMatch } from "@/lib/store";

const FINISH = { "single-bull": "Single bull", bullseye: "Bullseye", all: "All" };
const FIELD = { any: "Any", single: "Single", double: "Double", treble: "Treble" };
const ORDER = {
  "low-high": "Low to high",
  "high-low": "High to low",
  random: "Random",
};

/** One short line of the match settings, for the heading and history. */
export function atcSettingsLabel(config: AtcConfig) {
  const parts = [ORDER[config.orderMode], `Finish ${FINISH[config.finish]}`];
  if (config.field !== "any") parts.push(`${FIELD[config.field]} only`);
  if (config.hitsPerTarget > 1) parts.push(`${config.hitsPerTarget} hits`);
  if (config.increase) parts.push("Increase by segment");
  return parts.join(" · ");
}

export function AtcMatchView({ match }: { match: AtcMatch }) {
  const game = match.atc;
  const active = game.players[game.activePlayer];
  const last = game.turns.at(-1);
  const left = 3 - game.turnDarts.length;
  const message = game.notice
    ? `${game.notice}. Leg ${game.leg} starts now.`
    : last
      ? last.complete
        ? `${game.players[last.playerIndex].name} made ${last.hits} ${last.hits === 1 ? "hit" : "hits"}.`
        : `${last.hits} ${last.hits === 1 ? "hit" : "hits"} this turn, ${left} ${left === 1 ? "dart" : "darts"} left.`
      : "Hit the first number to start.";
  return (
    <div className="page-content match-page atc-page">
      <h1 className="sr-only">Live Around the Clock match</h1>
      <div className="match-heading">
        <Link href="/" className="back-link" aria-label="Back to overview">
          <ArrowLeft size={19} />
          <span>Overview</span>
        </Link>
        <div className="match-format">
          <strong>Around the Clock</strong>
          <span>
            Leg {game.leg} · first to {game.config.legsToWin}
          </span>
        </div>
        <span aria-hidden="true" />
      </div>
      <AtcBoard game={game} />
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="turn-feedback"
      >
        <h2 data-testid="active-player">{active.name} to throw</h2>
        <p>{message}</p>
      </div>
      <div className="atc-sequence panel">
        <small className="muted">{atcSettingsLabel(game.config)}</small>
        <AtcTrack game={game} playerIndex={game.activePlayer} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Append the board styles to `src/app/globals.css`**

```css
.atc-board {
  padding: 10px 12px;
  margin-bottom: 16px;
}
.atc-players {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
}
.atc-players li {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 10px 12px;
  background: var(--raised);
  font-variant-numeric: tabular-nums;
}
.atc-players li.is-active {
  border-color: var(--lime);
}
.atc-player-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: 14px;
}
.atc-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.atc-target {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 4px 0 6px;
}
.atc-target strong {
  font-size: 32px;
  line-height: 1.1;
  color: var(--text);
}
.atc-players li.is-active .atc-target strong {
  color: var(--lime);
}
.atc-target small,
.atc-players li > small {
  font-size: 12px;
  color: var(--muted);
}
.atc-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--line);
  overflow: hidden;
  margin-bottom: 6px;
}
.atc-bar > span {
  display: block;
  height: 100%;
  background: var(--lime);
}
.atc-sequence {
  display: grid;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 16px;
}
.atc-track {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.atc-track li {
  min-width: 30px;
  padding: 4px 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  font-size: 12px;
  text-align: center;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.atc-track li.done {
  border-color: transparent;
  color: var(--lime);
  opacity: 0.6;
}
.atc-track li.now {
  background: var(--lime);
  border-color: var(--lime);
  color: var(--bg);
  font-weight: 700;
}
@media (max-height: 500px) and (orientation: landscape) {
  .atc-page > .atc-board {
    grid-column: 1;
    align-self: start;
    margin-bottom: 8px;
    padding: 6px 8px;
  }
  .atc-players {
    grid-template-columns: 1fr;
  }
  .atc-page > .atc-sequence {
    display: none;
  }
}
```

- [ ] **Step 4: Dispatch ATC matches from `LiveMatch`**

In `src/components/live-match.tsx` add `import { AtcMatchView } from "./atc-match";` next to the `CricketMatchView` import, add `isAtc` to the `@/lib/store` import, and directly after `if (isCricket(current)) return <CricketMatchView match={current} />;` add:

```tsx
  if (isAtc(current)) return <AtcMatchView match={current} />;
```

- [ ] **Step 5: Fix the other consumers (types guide you)**

Run `npx tsc --noEmit` and fix each error with these exact changes:

- `data-screens.tsx`, players screen: replace
```tsx
                const game = (m: (typeof allMatches)[number]) =>
                  isCricket(m) ? m.cricket : m.game;
```
with `const game = matchGame;` and add `matchGame` to the `@/lib/store` import.
- `data-screens.tsx`, history list: the map currently ends with `) : ( <MatchRecord .../> )`. Change it to:
```tsx
              {allMatches.map((m) =>
                isCricket(m) ? (
                  <CricketRecord key={m.id} match={m} />
                ) : isX01(m) ? (
                  <MatchRecord key={m.id} match={m} />
                ) : null,
              )}
```
Task 6 replaces the `null` with an Around the Clock record.

Re-run `npx tsc --noEmit` until it is clean. If an error names another file, apply the same narrowing (`isX01`) or a helper from `store.ts`; do not add casts.

- [ ] **Step 6: Verify nothing regressed**

Run: `npx vitest run && npx eslint src tests scripts && npx playwright test --workers=2`
Expected: all existing unit and browser tests pass unchanged. (Around the Clock cannot be started from the UI yet.)

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "Guard x01-only screens and add the Around the Clock board

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Around the Clock setup

**Files:**
- Create: `src/components/atc-settings.tsx`
- Modify: `src/components/match-setup.tsx`
- Create: `tests/e2e/atc.spec.ts`

**Interfaces:**
- Consumes: `startAtc` from the store; `makeAtcOrder`, `AtcFinish`, `AtcField`, `AtcOrderMode` from `@/lib/atc-engine`.
- Produces: `AtcSettings` and the type `AtcSettingsValue = { finish: AtcFinish; field: AtcField; hitsPerTarget: number; increase: boolean; orderMode: AtcOrderMode }` from `atc-settings.tsx`; a setup screen that starts any of the three modes.

- [ ] **Step 1: Write the failing browser tests**

Create `tests/e2e/atc.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("Around the Clock setup hides x01 options, starts a match and survives a refresh", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await expect(page.getByText("STARTING SCORE")).toHaveCount(0);
  await expect(page.getByText("CHECKOUT RULE")).toHaveCount(0);
  await expect(page.getByLabel("Opponent", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.getByRole("button", { name: "Treble", exact: true }).click();
  await page.getByRole("button", { name: "Two", exact: true }).click();
  await page.getByRole("button", { name: "High to low", exact: true }).click();
  await page.getByLabel("Increase by segment").check();
  await page.getByLabel("Player 1 name").fill("Ann");
  await page.getByLabel("Player 2 name").fill("Ben");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page).toHaveURL(/\/match\/?$/);
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("20");
  await page.reload();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("20");
});

test("a random order is the same after a refresh", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await page.getByRole("button", { name: "Random", exact: true }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  const sequence = page.getByRole("list", { name: "Sequence" });
  const before = await sequence.innerText();
  expect(before.split("\n")).toHaveLength(21);
  await page.reload();
  await expect(sequence).toHaveText(before);
});

test("switching from DartBot to Around the Clock restores a normal second player", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByLabel("Player 2 name").fill("");
  await page.getByLabel("Opponent", { exact: true }).selectOption("bot");
  await expect(page.locator("strong", { hasText: "DartBot" })).toBeVisible();
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await expect(page.getByLabel("Player 2 name")).toHaveValue("Player 2");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Player 1 to throw");
  await expect(page.getByRole("region", { name: "DartBot controls" })).toHaveCount(0);
});

test("Around the Clock can be played solo", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await page.getByRole("button", { name: "Remove player 2", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Remove player/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Player 1 to throw");
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx playwright test tests/e2e/atc.spec.ts --project=chromium`
Expected: FAIL, no "Around the Clock" button.

- [ ] **Step 3: Create the settings component**

Create `src/components/atc-settings.tsx`:

```tsx
import type { AtcField, AtcFinish, AtcOrderMode } from "@/lib/atc-engine";

export type AtcSettingsValue = {
  finish: AtcFinish;
  field: AtcField;
  hitsPerTarget: number;
  increase: boolean;
  orderMode: AtcOrderMode;
};

function Choice<T extends string | number>({
  label,
  options,
  value,
  hint,
  onPick,
}: {
  label: string;
  options: { value: T; text: string }[];
  value: T;
  hint: string;
  onPick: (value: T) => void;
}) {
  return (
    <>
      <label className="field-label">{label}</label>
      <div className="segmented atc-options" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            type="button"
            key={String(o.value)}
            className={o.value === value ? "selected" : ""}
            aria-pressed={o.value === value}
            onClick={() => onPick(o.value)}
          >
            {o.text}
          </button>
        ))}
      </div>
      <p className="small muted atc-hint">{hint}</p>
    </>
  );
}

const FINISH_HINT = {
  "single-bull": "Finish by hitting the outer or inner bull.",
  bullseye: "Finish by hitting the inner bull.",
  all: "Finish by hitting the outer bull, then the inner bull.",
};
const FIELD_HINT = {
  any: "Any part of the number counts.",
  single: "Only single hits count.",
  double: "Only double hits count.",
  treble: "Only treble hits count.",
};
const ORDER_HINT = {
  "low-high": "Play from 1 to 20.",
  "high-low": "Play from 20 to 1.",
  random: "A random order, fixed for the whole match.",
};

export function AtcSettings({
  value,
  onChange,
  legs,
  onLegs,
}: {
  value: AtcSettingsValue;
  onChange: (value: AtcSettingsValue) => void;
  legs: number;
  onLegs: (legs: number) => void;
}) {
  const set = (patch: Partial<AtcSettingsValue>) =>
    onChange({ ...value, ...patch });
  return (
    <>
      <Choice
        label="FINISH"
        value={value.finish}
        hint={FINISH_HINT[value.finish]}
        onPick={(finish) => set({ finish })}
        options={[
          { value: "single-bull", text: "Single bull" },
          { value: "bullseye", text: "Bullseye" },
          { value: "all", text: "All" },
        ]}
      />
      <Choice
        label="TARGET FIELD"
        value={value.field}
        hint={FIELD_HINT[value.field]}
        onPick={(field) => set({ field })}
        options={[
          { value: "any", text: "Any" },
          { value: "single", text: "Single" },
          { value: "double", text: "Double" },
          { value: "treble", text: "Treble" },
        ]}
      />
      <Choice
        label="HITS PER NUMBER"
        value={value.hitsPerTarget}
        hint="How many times to hit each number."
        onPick={(hitsPerTarget) => set({ hitsPerTarget })}
        options={[
          { value: 1, text: "One" },
          { value: 2, text: "Two" },
          { value: 3, text: "Three" },
        ]}
      />
      <Choice
        label="ORDER"
        value={value.orderMode}
        hint={ORDER_HINT[value.orderMode]}
        onPick={(orderMode) => set({ orderMode })}
        options={[
          { value: "low-high", text: "Low to high" },
          { value: "high-low", text: "High to low" },
          { value: "random", text: "Random" },
        ]}
      />
      <label className="setting-toggle">
        <span>
          <strong>Increase by segment</strong>
          <small>A double moves you on two numbers, a treble three.</small>
        </span>
        <input
          type="checkbox"
          checked={value.increase}
          onChange={(e) => set({ increase: e.target.checked })}
        />
      </label>
      <div className="two-fields">
        <label className="field-label">
          LEGS TO WIN
          <select value={legs} onChange={(e) => onLegs(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                First to {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Wire it into `MatchSetup`**

In `src/components/match-setup.tsx`:

1. Imports: add `import { makeAtcOrder } from "@/lib/atc-engine";` and `import { AtcSettings, type AtcSettingsValue } from "./atc-settings";`. Add `startAtc` to the destructured store (`const { settings, profiles, current, start, startCricket, startAtc, readOnly } = useGameStore();`).
2. Replace `const [gameMode, setGameMode] = useState<"x01" | "cricket">("x01");` with:

```ts
  const [gameMode, setGameMode] = useState<"x01" | "cricket" | "atc">("x01");
  const [atc, setAtc] = useState<AtcSettingsValue>({
    finish: "bullseye",
    field: "any",
    hitsPerTarget: 1,
    increase: false,
    orderMode: "low-high",
  });
```
3. Replace the `chooseMode` head and bot reset so it covers both new modes. The function currently starts `function chooseMode(mode: "x01" | "cricket") {\n    setGameMode(mode);\n    if (mode !== "cricket") return;` and ends with the `if (names.length < 2) {...}` block. Change to:

```ts
  function chooseMode(mode: "x01" | "cricket" | "atc") {
    setGameMode(mode);
    if (mode === "x01") return;
    // Cricket and Around the Clock have no bot: turn a DartBot slot back into a normal player.
    if (opponent === "bot")
      setNames(
        names.map((n, i) => (i === names.length - 1 ? `Player ${i + 1}` : n)),
      );
    setOpponent("local");
    if (mode === "cricket" && names.length < 2) {
      setNames([...names, `Player ${names.length + 1}`]);
      setProfileIds([...profileIds, ""]);
    }
  }
```
(keep the existing body of the `if (names.length < 2)` block inside the new `if`).
4. In `begin()`, directly after the `if (gameMode === "cricket") { ... return; }` block add:

```ts
    if (gameMode === "atc") {
      startAtc({
        ...atc,
        order: makeAtcOrder(atc.orderMode, Math.random),
        legsToWin: legs,
        players,
      });
      router.push("/match");
      return;
    }
```
5. Game selector: in the `[{ mode: "x01", label: "x01" }, { mode: "cricket", label: "Cricket" }] as const` array add `{ mode: "atc", label: "Around the Clock" }`.
6. Settings branch: the settings area is `{gameMode === "x01" ? (<>...x01...</>) : (<>...cricket...</>)}`. Replace the exact text

```tsx
            ) : (
              <>
            <label className="field-label">SCORING STYLE</label>
```
with

```tsx
            ) : gameMode === "atc" ? (
              <AtcSettings
                value={atc}
                onChange={setAtc}
                legs={legs}
                onLegs={setLegs}
              />
            ) : (
              <>
            <label className="field-label">SCORING STYLE</label>
```
7. Lineup: the remove-button condition `names.length > (gameMode === "cricket" || opponent === "bot" ? 2 : 1)` already allows one player for Around the Clock. Leave it.
8. Summary: replace `{gameMode === "cricket" ? "20-15" : score}` with `{gameMode === "cricket" ? "20-15" : gameMode === "atc" ? "1-20" : score}` and the label expression `{gameMode === "cricket" ? "CRICKET / LOCAL" : "X01 / LOCAL"}` with `{gameMode === "cricket" ? "CRICKET / LOCAL" : gameMode === "atc" ? "AROUND THE CLOCK / LOCAL" : "X01 / LOCAL"}`. In the `<dl>`, replace `{gameMode === "cricket" ? (\n              <>\n                <div>\n                  <dt>Style</dt>` with:

```tsx
            {gameMode === "atc" ? (
              <>
                <div>
                  <dt>Finish</dt>
                  <dd>
                    {atc.finish === "single-bull"
                      ? "Single bull"
                      : atc.finish === "bullseye"
                        ? "Bullseye"
                        : "All"}
                  </dd>
                </div>
                <div>
                  <dt>Format</dt>
                  <dd>
                    First to {legs} {legs === 1 ? "leg" : "legs"}
                  </dd>
                </div>
              </>
            ) : gameMode === "cricket" ? (
              <>
                <div>
                  <dt>Style</dt>
```

- [ ] **Step 5: Run the browser tests, then the full suite**

Run: `npx playwright test tests/e2e/atc.spec.ts --workers=2` then `npx tsc --noEmit && npx eslint src tests scripts && npx playwright test --workers=2`
Expected: the four ATC tests and all existing tests pass in all three projects.

- [ ] **Step 6: Commit**

```bash
git add src/components/atc-settings.tsx src/components/match-setup.tsx tests/e2e/atc.spec.ts
git commit -m "Add Around the Clock to match setup

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Live input, completion and rematch

**Files:**
- Modify: `src/components/atc-match.tsx`
- Create: `src/components/atc-summary.tsx`
- Modify: `src/app/globals.css` (append)
- Modify: `tests/e2e/atc.spec.ts` (append)

**Interfaces:**
- Consumes: store actions `atcDart`, `atcFinishTurn`, `atcUndo`, `rematch`, `readOnly`; `atcSummary`, `atcCurrent`, `AtcGame` from the engine; `dartLabel` from `@/lib/engine`; `AtcBoard`, `AtcTrack`.
- Produces: `AtcSummary({ game })` in `atc-summary.tsx` (final board and per-player table, reused by history in Task 6); the playable screen.

- [ ] **Step 1: Write the failing browser tests**

Append to `tests/e2e/atc.spec.ts`:

```ts
import type { Page } from "@playwright/test";

async function startAtc(page: Page, legs = "1") {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await page.getByLabel("LEGS TO WIN").selectOption(legs);
  await page.getByLabel("Player 1 name").fill("Ann");
  await page.getByLabel("Player 2 name").fill("Ben");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
}
const hit = (page: Page, n: number) =>
  page.getByRole("button", { name: `Hit ${n}`, exact: true }).click();
async function hits(page: Page, numbers: number[]) {
  for (const n of numbers) await hit(page, n);
}
async function benMisses(page: Page) {
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Miss", exact: true }).click();
}
async function annWinsLeg(page: Page) {
  for (let from = 1; from <= 16; from += 3) {
    await hits(page, [from, from + 1, from + 2]);
    await benMisses(page);
  }
  await hits(page, [19, 20]);
  await page.getByRole("button", { name: "Inner bull", exact: true }).click();
}

test("plays a race with undo, a mid-turn refresh and a win", async ({ page }) => {
  await startAtc(page);
  await hits(page, [1, 2, 3]);
  await expect(page.getByTestId("active-player")).toHaveText("Ben to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("4");
  await page.getByRole("button", { name: "Undo turn", exact: true }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("1");
  await hits(page, [1, 2]);
  await page.reload();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("3");
  await expect(page.getByRole("status")).toContainText("1 dart left");
  await hit(page, 3);
  await benMisses(page);
  for (let from = 4; from <= 16; from += 3) {
    await hits(page, [from, from + 1, from + 2]);
    await benMisses(page);
  }
  await hits(page, [19, 20]);
  await page.getByRole("button", { name: "Inner bull", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ann wins!" })).toBeVisible();
  await page.getByRole("button", { name: "Undo winning dart" }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("Bullseye");
  await page.getByRole("button", { name: "Inner bull", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ann wins!" })).toBeVisible();
  await page.getByRole("button", { name: /Rematch/ }).click();
  await expect(page.getByTestId("active-player")).toHaveText("Ann to throw");
  await expect(page.getByTestId("atc-target-0")).toHaveText("1");
});

test("the target field and the order settings change what counts", async ({
  page,
}) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await page.getByRole("button", { name: "Double", exact: true }).click();
  await page.getByRole("button", { name: "High to low", exact: true }).click();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.getByTestId("atc-target-0")).toHaveText("20");
  await hit(page, 20);
  await expect(page.getByTestId("atc-target-0")).toHaveText("20");
  await page.getByRole("button", { name: "Double", exact: true }).click();
  await hit(page, 20);
  await expect(page.getByTestId("atc-target-0")).toHaveText("19");
});

test("increase by segment moves a treble three numbers on", async ({ page }) => {
  await page.goto("/new");
  await page.getByRole("button", { name: "Around the Clock", exact: true }).click();
  await page.getByLabel("Increase by segment").check();
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  await hit(page, 1);
  await expect(page.getByTestId("atc-target-0")).toHaveText("4");
});

test("the multiplier returns to single after every dart", async ({ page }) => {
  await startAtc(page);
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  await hit(page, 1);
  await expect(page.getByRole("button", { name: "Triple" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("landscape phone keeps the board and the keypad reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await startAtc(page);
  const miss = await page
    .getByRole("button", { name: "Miss", exact: true })
    .boundingBox();
  expect(miss!.y + miss!.height).toBeLessThanOrEqual(390);
  await expect(page.getByTestId("atc-target-0")).toBeInViewport();
});
```

- [ ] **Step 2: Run to see them fail**

Run: `npx playwright test tests/e2e/atc.spec.ts --project=chromium`
Expected: the five new tests FAIL (no keypad), the four setup tests still pass.

- [ ] **Step 3: Create the summary**

Create `src/components/atc-summary.tsx`:

```tsx
import { AtcBoard } from "./atc-board";
import { atcSummary, type AtcGame } from "@/lib/atc-engine";

export function AtcSummary({ game }: { game: AtcGame }) {
  const rows = atcSummary(game);
  return (
    <section aria-label="Around the Clock summary">
      <AtcBoard game={game} />
      <div className="table-scroll">
        <table className="cricket-results">
          <thead>
            <tr>
              <th>Player</th>
              <th>Legs</th>
              <th>Darts</th>
              <th>Hits</th>
              <th>Hit rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.legs}</td>
                <td>{r.darts}</td>
                <td>{r.hits}</td>
                <td>{Math.round(r.hitRate * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Hit rate is the share of darts that moved a player forward. Darts left
        unthrown when a turn is ended early count as misses.
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Replace `atc-match.tsx` with the full screen**

Replace the whole file with the version below. It keeps `atcSettingsLabel` (and its three label maps) exactly as in Task 3 and adds the keypad and the completion screen.

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Target,
  Trophy,
  Undo2,
} from "lucide-react";
import { Button } from "./ui/button";
import { AtcBoard, AtcTrack } from "./atc-board";
import { AtcSummary } from "./atc-summary";
import type { AtcConfig } from "@/lib/atc-engine";
import { dartLabel } from "@/lib/engine";
import { useGameStore, type AtcMatch } from "@/lib/store";

const FINISH = { "single-bull": "Single bull", bullseye: "Bullseye", all: "All" };
const FIELD = { any: "Any", single: "Single", double: "Double", treble: "Treble" };
const ORDER = {
  "low-high": "Low to high",
  "high-low": "High to low",
  random: "Random",
};

/** One short line of the match settings, for the heading and history. */
export function atcSettingsLabel(config: AtcConfig) {
  const parts = [ORDER[config.orderMode], `Finish ${FINISH[config.finish]}`];
  if (config.field !== "any") parts.push(`${FIELD[config.field]} only`);
  if (config.hitsPerTarget > 1) parts.push(`${config.hitsPerTarget} hits`);
  if (config.increase) parts.push("Increase by segment");
  return parts.join(" · ");
}

export function AtcMatchView({ match }: { match: AtcMatch }) {
  const { atcDart, atcFinishTurn, atcUndo, rematch, readOnly } = useGameStore();
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const game = match.atc;
  const active = game.players[game.activePlayer];

  function hit(value: number, mult: 1 | 2 | 3 = multiplier) {
    atcDart({ value, multiplier: mult });
    // A treble is rarely repeated: every dart starts as a single.
    setMultiplier(1);
  }
  function endTurn() {
    if (!game.turnDarts.length) {
      for (let i = 0; i < 3; i++)
        useGameStore.getState().atcDart({ value: 0, multiplier: 1 });
    } else atcFinishTurn();
    setMultiplier(1);
  }

  if (game.status === "complete") {
    const winner = game.players[game.winner ?? 0];
    return (
      <div className="page-content">
        <section className="completion panel">
          <span className="winner-icon">
            <Trophy size={40} />
          </span>
          <div className="eyebrow">ROUND THE CLOCK. DONE.</div>
          <h1>{winner.name} wins!</h1>
          <p>
            Around the Clock · {game.leg} {game.leg === 1 ? "leg" : "legs"} played
          </p>
          <div className="action-row">
            <Button disabled={readOnly} onClick={() => rematch()}>
              Rematch with these players <ArrowRight size={17} />
            </Button>
            <Button asChild variant="outline">
              <Link href="/new">Change match setup</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/history">View match history</Link>
            </Button>
          </div>
          <Button
            variant="ghost"
            disabled={readOnly}
            onClick={() => atcUndo()}
          >
            <Undo2 size={16} /> Undo winning dart
          </Button>
          <AtcSummary game={game} />
        </section>
      </div>
    );
  }

  const last = game.turns.at(-1);
  const left = 3 - game.turnDarts.length;
  const message = game.notice
    ? `${game.notice}. Leg ${game.leg} starts now.`
    : last
      ? last.complete
        ? `${game.players[last.playerIndex].name} made ${last.hits} ${last.hits === 1 ? "hit" : "hits"}.`
        : `${last.hits} ${last.hits === 1 ? "hit" : "hits"} this turn, ${left} ${left === 1 ? "dart" : "darts"} left.`
      : "Hit the first number to start.";

  return (
    <div className="page-content match-page atc-page">
      <h1 className="sr-only">Live Around the Clock match</h1>
      <div className="match-heading">
        <Link href="/" className="back-link" aria-label="Back to overview">
          <ArrowLeft size={19} />
          <span>Overview</span>
        </Link>
        <div className="match-format">
          <strong>Around the Clock</strong>
          <span>
            Leg {game.leg} · first to {game.config.legsToWin}
          </span>
        </div>
        <span aria-hidden="true" />
      </div>
      <AtcBoard game={game} />
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="turn-feedback"
      >
        <h2 data-testid="active-player">{active.name} to throw</h2>
        <p>{message}</p>
      </div>
      <div className="atc-sequence panel">
        <small className="muted">{atcSettingsLabel(game.config)}</small>
        <AtcTrack game={game} playerIndex={game.activePlayer} />
      </div>
      <fieldset disabled={readOnly} className="panel scoring-panel atc-input">
        <legend className="sr-only">Scoring controls</legend>
        <div className="dart-slots">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`dart-slot ${game.turnDarts[i] ? "filled" : ""}`}
            >
              <span>DART {i + 1}</span>
              <strong>
                {game.turnDarts[i] ? (
                  dartLabel(game.turnDarts[i])
                ) : (
                  <span className="slot-line" />
                )}
              </strong>
            </div>
          ))}
        </div>
        <div className="segmented multiplier-options">
          {(
            [
              { label: "Single", value: 1 },
              { label: "Double", value: 2 },
              { label: "Triple", value: 3 },
            ] as const
          ).map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={multiplier === m.value}
              className={multiplier === m.value ? "selected" : ""}
              onClick={() => setMultiplier(m.value)}
            >
              {m.label}
              <span aria-hidden="true">×{m.value}</span>
            </button>
          ))}
        </div>
        <div className="keypad atc-keypad">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Hit ${n}`}
              onClick={() => hit(n)}
            >
              <span className="hit-multiplier">
                {multiplier === 1 ? "" : multiplier === 2 ? "D" : "T"}
              </span>
              {n}
            </button>
          ))}
        </div>
        <div className="bull-row">
          <button
            type="button"
            aria-label="Miss"
            onClick={() => hit(0, 1)}
            className="miss-button"
          >
            MISS <span>0</span>
          </button>
          <button
            type="button"
            aria-label="Outer bull"
            onClick={() => hit(25, 1)}
          >
            OUTER BULL <span>25</span>
          </button>
          <button
            type="button"
            aria-label="Inner bull"
            onClick={() => hit(25, 2)}
            className="bull-button"
          >
            <Target size={17} /> BULL <span>50</span>
          </button>
        </div>
        <div className="scoring-actions">
          <Button
            type="button"
            variant="ghost"
            disabled={!game.events.length}
            onClick={() => atcUndo()}
            aria-label="Undo dart"
          >
            <Undo2 size={17} /> Undo dart
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={!game.events.length}
            onClick={() => atcUndo(true)}
            aria-label="Undo turn"
          >
            <RotateCcw size={16} /> Undo turn
          </Button>
          <Button type="button" variant="outline" onClick={endTurn}>
            End turn <ArrowRight size={16} />
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
```

- [ ] **Step 5: Append the input styles to `src/app/globals.css`**

```css
.atc-input {
  margin-bottom: 16px;
}
.keypad.atc-keypad {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
.atc-input .bull-row button {
  flex-direction: column;
  gap: 0;
  line-height: 1.25;
  text-align: center;
}
@media (min-width: 1000px) and (min-height: 501px) {
  .atc-page {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    column-gap: 24px;
    align-content: start;
  }
  .atc-page > .match-heading {
    grid-column: 1 / -1;
  }
  .atc-page > .atc-board {
    grid-column: 1;
    grid-row: 2;
    align-self: start;
  }
  .atc-page > .atc-sequence {
    grid-column: 1;
    grid-row: 3;
    align-self: start;
  }
  .atc-page > .turn-feedback {
    grid-column: 2;
    grid-row: 2;
    align-self: start;
  }
  .atc-page > .atc-input {
    grid-column: 2;
    grid-row: 3 / span 2;
    align-self: start;
  }
}
@media (max-height: 500px) and (orientation: landscape) {
  .atc-page > .atc-input {
    grid-column: 2;
    grid-row: 2 / span 2;
    margin-bottom: 0;
    padding: 8px;
  }
  .keypad.atc-keypad {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
  .keypad.atc-keypad button {
    min-height: 44px;
  }
  .atc-input .dart-slot {
    min-height: 0;
    padding: 4px 6px;
  }
  .atc-input .dart-slot > span:first-child {
    display: none;
  }
  .atc-input .dart-slots,
  .atc-input .multiplier-options {
    margin-bottom: 6px;
  }
  .atc-input .scoring-actions {
    margin-top: 6px;
  }
  .atc-page > .turn-feedback {
    padding: 6px 12px;
  }
}
@media (max-width: 700px) and (min-height: 501px) {
  .atc-board,
  .atc-sequence {
    margin-bottom: 10px;
  }
}
```

- [ ] **Step 6: Run the ATC tests**

Run: `npx playwright test tests/e2e/atc.spec.ts --workers=2`
Expected: all nine ATC tests pass in Chromium, mobile Chromium and mobile WebKit. If only the landscape test fails on layout, leave it: Task 6's visual pass fixes layout in one batch. Any other failure is a real defect, fix it now.

- [ ] **Step 7: Full regression and commit**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src tests scripts && npx playwright test --workers=2`
Expected: everything passes except, at most, the landscape layout test noted above.

```bash
git add src tests
git commit -m "Play Around the Clock: keypad, undo, completion and rematch

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: History, dashboard, statistics note, backup, docs and visual pass

**Files:**
- Modify: `src/components/data-screens.tsx`, `src/components/dashboard.tsx`
- Modify: `tests/e2e/atc.spec.ts` (append), `tests/e2e/cricket.spec.ts` (one regex)
- Modify: `README.md`, `docs/ARCHITECTURE.md`, `docs/FEATURES.md`, `docs/PROGRESS.md`
- Modify: `src/app/globals.css` only for fixes found in the visual pass

**Interfaces:**
- Consumes: `AtcMatch`, `isAtc` from the store; `AtcSummary`; `atcSettingsLabel`.
- Produces: the finished feature.

- [ ] **Step 1: Write the failing browser test**

Append to `tests/e2e/atc.spec.ts` (it already defines `startAtc`, `hits`, `benMisses`, `annWinsLeg`):

```ts
test("history lists x01, Cricket and Around the Clock together, statistics stay x01 only, backup round-trips", async ({
  page,
}) => {
  await startAtc(page);
  await annWinsLeg(page);
  await expect(page.getByRole("heading", { name: "Ann wins!" })).toBeVisible();

  // One Cricket leg, won by Ann.
  await page.goto("/new");
  await page.getByRole("button", { name: "Cricket", exact: true }).click();
  await page.getByLabel("Player 1 name").fill("Ann");
  await page.getByLabel("Player 2 name").fill("Ben");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  const triples = async (numbers: number[]) => {
    for (const n of numbers) {
      await page.getByRole("button", { name: "Triple", exact: true }).click();
      await hit(page, n);
    }
  };
  await triples([20, 19, 18]);
  await benMisses(page);
  await triples([17, 16, 15]);
  await benMisses(page);
  await page.getByRole("button", { name: "Outer bull", exact: true }).click();
  await page.getByRole("button", { name: "Inner bull", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ann wins!" })).toBeVisible();

  // One solo single-out 301 match for the x01 side.
  await page.goto("/new");
  await page.getByRole("button", { name: "301", exact: true }).click();
  await page.getByRole("button", { name: "Single out", exact: false }).click();
  await page.getByRole("button", { name: "Remove player 2", exact: true }).click();
  await page.getByLabel("Player 1 name").fill("Antun");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.getByRole("button", { name: "Dart-by-dart", exact: true }).click();
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  for (let i = 0; i < 3; i++) await hit(page, 20);
  await page.getByRole("button", { name: "Triple", exact: true }).click();
  for (let i = 0; i < 2; i++) await hit(page, 20);
  await page.getByRole("button", { name: "Single", exact: true }).click();
  await hit(page, 1);
  await expect(page.getByRole("heading", { name: "Match complete!" })).toBeVisible();

  await page.goto("/history");
  await expect(page.locator(".history-record")).toHaveCount(3);
  await expect(page.getByText("AROUND THE CLOCK / LOW TO HIGH")).toBeVisible();
  await expect(page.getByText("CRICKET / STANDARD")).toBeVisible();

  await page.goto("/statistics");
  await expect(
    page.getByText(/Cricket and Around the Clock are not tracked yet/),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);

  await page.goto("/");
  await expect(page.getByText("LAST MATCH")).toBeVisible();

  await page.goto("/settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data as JSON" }).click();
  const file = await (await download).path();
  await page.getByLabel("Import Oche backup").setInputFiles(file!);
  await expect(page.getByText(/3 completed matches/)).toBeVisible();
});
```

In `tests/e2e/cricket.spec.ts` change the one assertion `page.getByText(/Cricket is not tracked yet/)` to `page.getByText(/Cricket and Around the Clock are not tracked yet/)` (the note now names both modes; this is an intended text change, not a behavior change).

- [ ] **Step 2: Run to see it fail**

Run: `npx playwright test tests/e2e/atc.spec.ts -g "history lists" --project=chromium`
Expected: FAIL (history shows two records; the statistics note still names only Cricket).

- [ ] **Step 3: History record and the statistics note**

In `data-screens.tsx`: add `isAtc` and `type AtcMatch` to the `@/lib/store` import, `import { AtcSummary } from "./atc-summary";` and `import { atcSettingsLabel } from "./atc-match";`. Add next to `CricketRecord`:

```tsx
function AtcRecord({ match }: { match: AtcMatch }) {
  const g = match.atc;
  return (
    <details className="panel history-record">
      <summary>
        <span className="history-trophy">
          <Trophy size={21} />
        </span>
        <span>
          <strong>{g.players[g.winner ?? 0].name} wins</strong>
          <small>
            {g.players.map((p) => p.name).join(" vs ")} ·{" "}
            {new Date(match.startedAt).toLocaleDateString("en-GB")}
          </small>
        </span>
        <span className="outline-tag">
          AROUND THE CLOCK / {g.config.orderMode.replace("-", " TO ").toUpperCase()}
        </span>
        <Plus size={18} />
      </summary>
      <p className="small muted">{atcSettingsLabel(g.config)}</p>
      <AtcSummary game={g} />
    </details>
  );
}
```

In the history list replace the `) : null,` branch from Task 3 so the map reads:

```tsx
              {allMatches.map((m) =>
                isCricket(m) ? (
                  <CricketRecord key={m.id} match={m} />
                ) : isAtc(m) ? (
                  <AtcRecord key={m.id} match={m} />
                ) : (
                  <MatchRecord key={m.id} match={m} />
                ),
              )}
```
(`isX01` is no longer needed in that map; keep its other uses.) Change the statistics hint text `Completed x01 matches only. Cricket is not tracked yet.` to `Completed x01 matches only. Cricket and Around the Clock are not tracked yet.`

- [ ] **Step 4: Dashboard card**

In `dashboard.tsx` import `Clock` from `lucide-react` and, after the Cricket `mode-card` link, add:

```tsx
          <Link href="/new" className="mode-card">
            <span className="mode-icon">
              <Clock size={29} />
            </span>
            <div>
              <div className="mode-title">
                Around the Clock <span className="pill">NEW</span>
              </div>
              <p>Hit every number in order, then the bull.</p>
              <span className="mode-meta">
                Many ways to play <span>·</span> 1-4 players <span>·</span>{" "}
                Legs
              </span>
            </div>
            <ArrowUpRight size={23} />
          </Link>
```

- [ ] **Step 5: Run the new test, then the whole suite and the production export**

Run: `npx playwright test tests/e2e/atc.spec.ts tests/e2e/cricket.spec.ts --workers=2` then `npx vitest run && npx tsc --noEmit && npx eslint src tests scripts && npx playwright test --workers=2`
Expected: all pass.

Then: `GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH=/oche npm run build && NEXT_PUBLIC_BASE_PATH=/oche node scripts/verify-offline.mjs`
Expected: build succeeds and the offline script prints its Chromium pass line.

- [ ] **Step 6: Documentation**

- `README.md`: add Around the Clock under the Cricket paragraph (finish, target field, hits per number, order, increase by segment, 1 to 4 players, first to N legs, no bot yet) and drop it from "Next milestones" if listed.
- `docs/ARCHITECTURE.md`: add a `src/lib/atc-engine.ts` bullet under "Boundaries" (pure, event-sourced, random order resolved at setup and stored in the config), a short Around the Clock paragraph under "Scoring decisions" (the sequence, the field rule, hits per number, the increase-by-segment carry that stops at the bull steps, the three finish options), a sentence that saved matches may carry `mode: "atc"`, and update "Current limits": Around the Clock has no bot, statistics or speech.
- `docs/FEATURES.md`: Around the Clock entry with the cut list from the spec.
- `docs/PROGRESS.md`: add a dated section with the verification counts and the "not claimed" list (physical iPhone, VoiceOver, real audio and wake lock).
No em dashes in any of these.

- [ ] **Step 7: One batched visual round**

Take screenshots with a throwaway Playwright script against the dev server at 1440x900, 390x844 and 844x390 of: dashboard, setup with Around the Clock selected (every control visible), the live screen mid-leg with a hit or two on the board, the completion screen, and the history record opened. Wait 600ms after navigation before each shot so the fade-in animation has finished. Confirm: no horizontal overflow, text at least 12px, touch targets at least 44px on mobile, the three-option game selector fits at 390px, the keypad and the Miss row fit the landscape viewport without scrolling, the active player's card reads as lime, the sequence chips wrap cleanly. Fix everything found in ONE pass in `globals.css` (and the component if needed), then take ONE confirmation round of the screens you changed. Then stop.

- [ ] **Step 8: Final regression and commit**

Run: `npx vitest run && npx tsc --noEmit && npx eslint src tests scripts && npx playwright test --workers=2`
Expected: everything passes, including the landscape test from Task 5.

```bash
git add src tests README.md docs
git commit -m "Show Around the Clock in history, dashboard and backups; document the mode

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Plan self-review

**Spec coverage:** Rules and engine, including every setting, carry, bull steps, early end misses, rotation and undo (Task 1 tests). Config validation including a bad `order` (Task 1). Storage union, old-save and Cricket compatibility, replay validation on restore and import, stored random order (Task 2). `isX01` hazard and mode-safe x01 and Cricket actions (Task 2 tests). x01-only guards (Task 3). Setup with all controls, solo, no bot, DartBot reset (Task 4). Live board, sequence, keypad, undo dart and turn, end turn, completion, rematch, landscape and mobile (Task 5). History, dashboard, honest statistics note, backup round trip, docs, production export (Task 6). Testing and rollout order match the spec.

**Placeholder scan:** none. Task 3 Step 5 and Task 6 Step 7 give exact changes or a bounded visual check.

**Type consistency:** `AtcMatch.atc`, `startAtc`, `atcDart`, `atcFinishTurn`, `atcUndo`, `AtcBoard`, `AtcTrack`, `AtcSummary`, `atcSettingsLabel`, `AtcSettingsValue`, `matchGame`, `isAtc` are defined once (Tasks 1 to 4) and used with those exact names later. Test ids `atc-target-{i}` and `atc-progress-{i}` match between the board (Task 3) and the browser tests (Tasks 4 to 6). Button names `Miss`, `Outer bull`, `Inner bull`, `Hit N`, `Undo dart`, `Undo turn`, `Undo winning dart` match between the component and tests. The `AtcSettingsValue` keys match the `AtcConfig` fields spread into `startAtc`.

**Review Focus coverage:** `isX01` hazard (Task 2 store test), old saves (Task 2 persistence test), stable random order (Task 2 persistence test, Task 4 e2e), carry stops at the bull and winning-dart undo (Task 1 tests, Task 5 e2e), mid-turn refresh (Task 5 e2e), DartBot slot reset (Task 4 e2e), mixed history, statistics and backup (Task 6 e2e).
