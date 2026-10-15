# 121 Checkout design

Status: rules agreed in conversation 2026-10-15, awaiting written-spec review. Second of two cycles after Around the Clock. Built on the `around-the-clock` branch pattern, so it starts after that branch is merged.

## Intent

Add 121 Checkout as a fourth game mode: a checkout practice run. The players (or the one player) get a target score and a fixed dart budget to check it out. Clearing it raises the target, failing it drops the target back to a safe level. The result is the highest target cleared, not a win or a loss. Follow the Cricket and Around the Clock pattern: a pure event-sourced engine, a new `mode` in the saved-match union, shared history, backup, tab lock, offline cache and profiles. Entry is dart by dart. Keep the charcoal/lime identity and existing tokens.

## Scope

In: start target (121 or custom), darts per attempt, number of attempts, the safehouse rule, 1 to 4 local players sharing one run, setup, live screen, run summary, history, rematch, backup/import, dashboard entry.

Out of this version: bot, speech, statistics for this mode, single-out finishing, a choice of increase step, sets and legs, skipping uncheckable targets.

## Terms

- Attempt: one try at one target, with a dart budget. An attempt ends when the target is checked out or the budget is spent.
- Target: the score the players must reduce to exactly zero, finishing on a double.
- Remaining: the target minus points scored so far in this attempt.
- Safehouse: the fall-back target. It starts as the start target. It moves up to a target the moment that target is checked out using 3 darts or fewer in that attempt.
- Run: the whole session, from the first attempt to the end.

## Rules

- The start target is 121 by default. A custom start is any whole number from 2 to 170 that can be checked out with three darts and a double (the existing `checkoutSuggestions(score, 3, true)` returns a route). Other values are rejected.
- Darts per attempt: 3, 6, 9, 12 or 15. Rounds: 10, a custom whole number from 1 to 99, or infinite. Setup defaults: start 121, 9 darts per attempt, 10 rounds.
- Finish: double out only. A dart on the bullseye counts as a double. Reaching exactly zero with anything other than a double, reaching 1, or going below zero is a bust.
- A bust puts remaining back to where it was at the start of the current three-dart turn and ends that turn. Darts thrown and darts left unthrown in that turn both count against the attempt budget ("the budget keeps burning"). The attempt is still alive if budget is left.
- Turns are up to three darts. With more than one player, players alternate turns on one shared remaining score and one shared budget. Turn order carries across attempts: the next attempt starts with the player after the one who threw the last turn. An early end of turn counts the unthrown darts against the budget, as in Cricket.
- Success: remaining reaches zero on a double. The attempt ends immediately, even mid-turn. The target rises by 1 for the next attempt. The darts used in this attempt decide the safehouse: 3 or fewer, the cleared target becomes the new safehouse; more than 3, the safehouse does not move.
- Failure: the budget is spent without a checkout. The target falls back to the safehouse for the next attempt.
- Targets rise by exactly 1 and are never skipped. Some totals cannot be checked out in one turn of three darts (159, 162, 163, 165, 166, 168, 169). With 3 darts per attempt such a target cannot succeed and falls back to the safehouse, so a 3-dart run tops out at 158. With 6 or more darts per attempt it can still be cleared over two turns. This follows the agreed rule and is isolated in one function (`nextTarget`) so skipping can be added later.
- Clearing 170 ends the run immediately as a perfect result.
- The run ends when the last attempt is finished (finite rounds), when 170 is cleared, or when the players end it (infinite rounds, and also available at any time as "End run"). Ending the run mid-attempt discards that partial attempt from the results but keeps its events.
- Result: the highest target cleared. Alongside it: attempts played, attempts cleared, darts thrown, and per player the darts thrown and the checkouts they finished. No winner. Ties on the result are not broken.

## Engine

`src/lib/checkout-engine.ts`: pure and deterministic, no browser, React, clock or randomness. It depends only on `Dart`, `validateDart` and `checkoutSuggestions` from `engine.ts`. State is derived from events (`dart`, `end-turn`, `end-run`) by replay, as in `cricket-engine.ts` and `atc-engine.ts`. Per attempt it derives target, remaining, turn-start remaining, darts used, the active player and the outcome. Per run it derives safehouse, best target cleared, attempts played and cleared.

Public API mirrors the other engines: `createCheckoutGame`, `throwCheckoutDart`, `endCheckoutTurn`, `endCheckoutRun`, `undoCheckoutDart`, `undoCheckoutTurn`, `restoreCheckoutGame`, `checkoutSummary`. `isCheckable(score)` and `nextTarget` hold the target rules.

Config validation rejects: 0 or more than 4 players, duplicate player ids, a start target that is out of range or not checkable, darts per attempt outside 3, 6, 9, 12, 15, rounds that are neither `"infinite"` nor a whole number from 1 to 99.

## Storage and compatibility

`AnyMatch` gains `CheckoutMatch = { id, startedAt, finishedAt?, mode: "checkout", checkout: CheckoutGame }`. A missing `mode` still means x01, `"cricket"` and `"atc"` are unchanged. Restore and import rebuild every checkout match by replaying events through its engine. A malformed match is rejected without touching other matches. The 100-match cap, export, tab lock and offline cache are shared. Store actions: `startCheckout`, `checkoutDart`, `checkoutFinishTurn`, `checkoutEndRun`, `checkoutUndo`. `rematch` keeps mode and settings. `matchGame` and the helpers (`matchStatus`, `matchEventCount`, `matchPlayerNames`, `matchLabel`) learn the new mode. `matchWinnerName` has no meaning here (no winner), so completion and history render their own result line and never call it for this mode. `isX01` must stay false for this mode.

## Screens

- Setup: the game selector gains 121 Checkout. Controls: start target (121 or a custom field with validation and an inline hint when the number cannot be checked out), darts per attempt, rounds (10, custom, infinite), with a one-line explanation of the safehouse. 1 to 4 players with the saved-player picker. No bot, scoring style or legs. Switching from DartBot resets the bot slot, as for Cricket and Around the Clock.
- Live: the target and remaining, large. Darts left in the attempt and the attempt number (of N, or just a count for infinite). The safehouse. The active player and the turn strip. A keypad of 1 to 20 with Bull, Miss and the multiplier buttons, Undo dart, Undo turn, End turn (disabled until the first dart of a turn is thrown; Miss passes a dart), End run. After a run ends, a Resume run button undoes the end. The existing checkout route hint is shown for the remaining score when three darts or fewer are left in the turn. Landscape and mobile follow the existing adaptations.
- Between attempts: a short notice ("Cleared 121 in 5 darts. Next target 122." or "Missed 130. Back to 121.") announced to screen readers.
- Completion: the highest target cleared, attempts cleared of played, darts thrown, per-player darts and checkouts, Rematch.
- History: all modes listed with a mode label, the detail shows the result and the attempt list (target, darts used, cleared or missed). Statistics stays x01 only and says other modes are not tracked yet.
- Dashboard: "Choose your game" lists 121 Checkout.

## Testing

- Unit, failing first: checkable targets (every total from 2 to 170 against known uncheckable list); start target validation; single-player success and failure; double-out rule (single finish, reaching 1, below zero are busts); bust restores turn-start remaining and burns the unthrown darts; budget exhaustion and fall-back; safehouse moves only on 3 darts or fewer and not on 4 or more; target rises by 1; an uncheckable target fails and falls back; clearing 170 ends the run; finite rounds end the run, infinite does not; end run mid-attempt; early end of turn burns unthrown darts; multi-player alternation and the starter carrying across attempts; undo dart and undo turn by replay at every event, including a checkout dart, a bust and an end-run; config validation; summary numbers.
- Persistence: old saves load as x01; Cricket and Around the Clock saves still load; a checkout match round-trips through backup/import; a corrupted event list or a bad config is rejected without affecting other matches.
- Browser (desktop, mobile, mobile WebKit): setup with every control and the custom-target validation, a solo run with a clear, a miss and the fall-back, a two-player run with undo and a refresh mid-turn, End run, history and rematch, mixed x01, Cricket, Around the Clock and 121 history.
- The existing x01, Cricket and Around the Clock suites stay green unchanged.

## Rollout

Stages, one commit each: engine with tests, storage and validation, setup, live screen, history and dashboard. Push only when asked. README, ARCHITECTURE, FEATURES and PROGRESS gain notes.

## Risks

- The union grows a fourth time, so every `isX01`, `isCricket` and `isAtc` branch needs a decision. History detail, statistics and the dashboard are the likeliest to miss one.
- "No winner" breaks the assumption in `matchWinnerName` and in completion screens that every finished match has a winner. Every consumer of a finished match must be checked.
- With +1 and no skipping, a 3-dart run tops out at 158 because 159 cannot be checked out in one turn. If that feels wrong in play, the fix is one function (`nextTarget`).
- The safehouse and the "3 darts or fewer" rule are our reading of the reference app. They are isolated in one function.
- A bust burning the rest of the turn from the attempt budget is a harsh reading; it follows the agreed rule that the budget keeps burning.
