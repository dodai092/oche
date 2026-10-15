# Around the Clock design

Status: design approved in conversation 2026-10-15, awaiting written-spec review. First of two cycles; 121 Checkout gets its own spec and plan after this ships.

## Intent

Add Around the Clock as a third game mode beside x01 and Cricket, with every setting from the reference screenshot. Follow the Cricket pattern: a pure event-sourced engine, a new `mode` in the saved-match union, shared history, backup, tab lock, offline cache and profiles. Keep the charcoal/lime identity and existing tokens. Entry is dart by dart.

## Scope

In: finish (single bull, bullseye, all), target field (any, single, double, treble), hits per target (1 to 3), order (low to high, high to low, random), increase by segment, first to N legs, 1 to 4 local players (solo is a drill), setup, live screen, completion, history, rematch, backup/import, dashboard entry.

Out of this version: bot, speech, statistics for this mode, round limits, sets, 121 Checkout.

## Rules

- Sequence: the 20 numbers in the chosen order, then the bull step or steps. Low to high is 1 to 20, high to low is 20 to 1. Random is a shuffle of 1 to 20 made once at setup and stored in the config, so replay stays deterministic.
- Each player has their own position in the sequence. All players run the same sequence.
- A dart qualifies when it lands on the player's current number and its multiplier fits the field: any (single, double or treble), single only, double only, treble only. Anything else is a miss for progress.
- Hits per target is H (1 to 3). A qualifying dart gives 1 hit. The number is done after H hits. Hits on a number persist across turns until the number is done.
- Increase by segment: a qualifying dart of multiplier m gives m hits instead of 1. Surplus hits roll on to the next number and so on (with H = 1 a double clears two numbers, a treble three). Rolling on stops at the bull steps: only a bull dart completes a bull step. Past the last number the surplus is dropped.
- Bull steps by finish setting:
  - Single bull: one step, completed by the outer or inner bull.
  - Bullseye: one step, completed only by the inner bull.
  - All: two steps. First the outer bull (inner does not count), then the inner bull.
  - The field setting does not apply to bull steps. Triple bull stays invalid.
- A player who completes the last step wins the leg immediately, even mid-turn. The match is first to N legs. The starting player rotates each leg, and every player's position resets for the new leg.
- Three darts per turn, automatic switch, early end of turn records the unthrown darts as misses (same rule as Cricket). Undo dart and undo turn replay retained events.

## Engine

`src/lib/atc-engine.ts`: pure and deterministic, no browser, React, clock or randomness, depends only on `Dart` and `validateDart` from `engine.ts`. State is derived from events (`dart`, `end-turn`) by replay, as in `cricket-engine.ts`. The config holds the resolved `order` array (20 numbers), so the engine never shuffles. Per player it derives step index, hits on the current step, darts used, qualifying hits and legs won. Public API mirrors Cricket: `createAtcGame`, `throwAtcDart`, `endAtcTurn`, `undoAtcDart`, `undoAtcTurn`, `restoreAtcGame`, `atcSummary`.

Config validation rejects: 0 or more than 4 players, duplicate player ids, an `order` that is not a permutation of 1 to 20, unknown finish or field values, hits outside 1 to 3, legs below 1.

## Storage and compatibility

`AnyMatch` gains `AtcMatch = { id, startedAt, finishedAt?, mode: "atc", atc: AtcGame }`. A missing `mode` still means x01, `"cricket"` is unchanged. Restore and import rebuild every ATC match by replaying events through the ATC engine. A malformed ATC match is rejected without touching other matches. The 100-match cap, export, tab lock and offline cache are shared. Store actions: `startAtc`, `atcDart`, `atcFinishTurn`, `atcUndo`. `rematch` keeps mode and settings. The store helpers (`matchStatus`, `matchEventCount`, `matchPlayerNames`, `matchLabel`, `matchWinnerName`) learn the new mode so screens that use them need no new branch.

## Screens

- Setup: the game selector gains Around the Clock. It shows the finish, field, hits, order segmented controls, an Increase by segment toggle with a one-line explanation, legs to win, and 1 to 4 players with the saved-player picker. No bot, starting score or checkout rule. Switching from DartBot resets the bot slot to a normal player, as for Cricket.
- Live: a progress track per player (numbers done, current target large, hits remaining), active player card and turn strip, keypad of 1 to 20 with Bull, Miss and the existing multiplier buttons, Undo dart, Undo turn, End turn. Landscape and mobile follow the existing adaptations.
- Completion: winner, leg summary (darts, qualifying hits, hit rate per player), Rematch.
- History: all modes listed with a mode label, detail shows the ATC result. Statistics stays x01 only and says other modes are not tracked yet.
- Dashboard: "Choose your game" lists Around the Clock.

## Testing

- Unit, failing first: sequence per order and finish; field rules; hits per target; increase by segment with carry, with the stop at the bull steps and the drop past the last step; each finish option; win mid-turn; leg rotation and match end; early end records misses; undo by replay at every event, including the winning dart; config validation including a bad `order`.
- Persistence: old saves load as x01; an ATC match round-trips through backup/import; a corrupted ATC event list is rejected without affecting other matches; Cricket saves still load.
- Browser (desktop, mobile, mobile WebKit): setup with every control, a full 2-player race with undo and a refresh mid-turn, a solo run, history and rematch, mixed x01, Cricket and ATC history.
- The existing x01 and Cricket suites stay green unchanged.

## Rollout

Stages, one commit each: engine with tests, storage and validation, setup, live screen, history and dashboard. Push only when asked. README, ARCHITECTURE, FEATURES and PROGRESS gain notes.

## Risks

The union grows again, so every `isX01` or `isCricket` branch needs a decision for ATC. History detail, statistics and dashboard are the likeliest to miss one. The increase by segment carry rule is our reading of an unexplained toggle in the reference app, so it is isolated in one function. Random order must never be generated inside the engine or at render time.
