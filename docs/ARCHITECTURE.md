# Oche architecture

## Design and scope

An original, local-first darts room. Charcoal surfaces, lime active states, oversized tabular scores, a narrow desktop rail and a mobile navigation strip. No copied DartCounter assets or code. This is a personal project under Private/, which the workspace dashboard explicitly excludes.

The first milestone is x01 scoring, not online infrastructure. A backend now would add deployment and account dependencies without improving local scoring. All seven local screens operate on real local data; empty states never invent statistics.

## Boundaries

- src/lib/engine.ts: pure deterministic state transitions, legal darts, checkout search, event replay and statistics. No browser, React, clock or randomness.
- src/lib/checkout-engine.ts: pure, event-sourced 121 Checkout rules (dart, end-turn and end-run events replayed from scratch). Depends only on `Dart`, `validateDart` and `checkoutSuggestions` from engine.ts. No browser, React, clock or randomness. The target and safehouse rules live in `nextTarget` and `endAttempt`.
- src/lib/atc-engine.ts: pure, event-sourced Around the Clock rules (dart and end-turn events replayed from scratch). Depends only on `Dart` and `validateDart` from engine.ts. No browser, React, clock or randomness. A random order is resolved once at setup and stored in the config, so replay stays deterministic.
- src/lib/cricket-engine.ts: pure, event-sourced Cricket rules (dart and end-turn events replayed from scratch). Depends only on `Dart` and `validateDart` from engine.ts. No browser, React, clock or randomness.
- src/lib/store.ts: Zustand persistence, match identity/timestamps, player profiles, settings and archived match references. Hydration occurs after mount to prevent server/client mismatch.
- src/lib/tab-session.ts: exclusive Web Lock held for the document lifetime. Hydrate before enabling writes; secondary tabs suppress persisted writes and refresh on storage events. Page hide releases access; returning reacquires and hydrates before editing.
- src/lib/backup.ts: bounded JSON parsing and event-replay validation. Restore previews counts and requires replacement confirmation; failed writes keep current in-memory data.
- src/lib/bot.ts: segment selection with injectable randomness and a cancellable timer. Board landing errors provide relative strengths. The engine stays deterministic.
- src/lib/match-summary.ts: comparisons and set/leg aggregates derived from actual turns.
- scripts/build-offline.mjs: static file inventory, content-versioned worker and route aliases. Install caches every file atomically; updates wait for explicit application outside a match. No automatic reload. Evicted files can be downloaded again.
- src/components: responsive application shell and screen components. Scoring uses the engine API only. Match-day hooks release screen wake locks and cancel speech when leaving play.
- src/app: Next.js App Router layout, routes and styling.
- Vitest validates the scoring engine; Playwright exercises actual browser interaction, persistence and mobile layouts.

## Scoring decisions

Support 301/501/701, 1-4 local players, single or double out, first-to legs per set and first-to sets. Starters rotate by leg. Each dart updates immediately. Bust reverts the visit score and ends the turn. Third dart switches players automatically. Early end-turn is explicit: partial visits count entered darts; an empty-visit pass records three misses. Multipliers reset at visit boundaries. Match completion is undoable.

Cricket (Standard and Cut-throat, 2 to 4 players, first to N legs) uses marks on 20 to 15 and the bull. A number closes at three marks. Marks beyond the third score its value while an opponent has it open (Standard) or give points to every opponent that has it open (Cut-throat). A player wins the leg by closing all seven numbers with a score equal or better than every opponent. If every player has closed everything, the best score wins and a tie goes to whoever closed their last number first; this stall rule is ours, not official. Starters rotate each leg.

Around the Clock (1 to 4 players, first to N legs) runs each player through the 20 numbers in the chosen order, then the bull step or steps. A dart qualifies when it lands on the player's current number with a multiplier the target field allows (any, single, double or treble). A number is done after the chosen hits per number (1 to 3), and hits persist across turns. With Increase by segment a qualifying dart gives its multiplier in hits, surplus hits roll on to the next numbers, stop at the bull steps and are dropped past the last step; this carry is our reading of the reference app and lives in one function. Finish options: single bull (outer or inner), bullseye (inner only) or all (outer bull, then inner bull). The field setting does not apply to the bull. A player who completes the last step wins the leg mid-turn. An early end of turn records unthrown darts as misses. Starters rotate each leg.

121 Checkout (1 to 4 players sharing one run) gives each attempt a target and a dart budget. Players alternate turns of up to three darts on one remaining score. The target must be checked out exactly, finishing on a double (the bullseye counts). Going below zero, landing on 1 or reaching zero without a double is a bust: the remaining score returns to the start of the turn, the turn ends and its unthrown darts still burn the budget, as does an early end of turn. A checkout ends the attempt at once and raises the target by 1, never skipping. A checkout in 3 darts or fewer moves the safehouse to that target. A spent budget is a miss and the target falls back to the safehouse. Totals that cannot be checked out in one turn (159, 162, 163, 165, 166, 168, 169) cannot be cleared with 3 darts per attempt, so a 3-dart run tops out at 158. Clearing 170 ends the run. The run ends after the chosen rounds, at 170, or when the players end it; a partly played attempt is then not counted. There is no winner: the result is the highest target cleared. The next attempt starts with the player after the last thrower. The safehouse rule is our reading of the reference app.

Dart events are the source of truth. Undo and derived statistics replay retained events, which also avoids stale counters after a correction. Checkout recommendations search legal sequences using the current darts remaining. Inner bull counts as a double; triple bull is invalid.

See engine documentation for counting conventions, including inferred checkout opportunities. The keypad cannot know whether a missed dart was intended at a double.

## Persistence and failure modes

Versioned localStorage stores a bounded archive and current match. Saved matches carry an optional `mode` (`"cricket"`, `"atc"` or `"checkout"`); a missing value means x01, so saves from before Cricket load unchanged, and Cricket, Around the Clock and 121 Checkout matches are rebuilt by replaying their events on hydrate and import. Data stays in this browser, is not cloud-synced and can be exported as JSON from Settings. Hydration validates the save envelope and reconstructs derived state from legal events. Storage failures latch into read-only mode before reporting an error. Unreadable raw values are preserved for download; only an explicit reset permits replacement. Hydration and storage errors are shown in the UI. Replacing an in-progress match requires a visible confirmation. No account or private API is involved.

## Implementation sequence and verification

1. Scoring contract and tests, including bust, finish, undo and set progression.
2. Setup, scoreboard, keypad and persistence against that contract.
3. Local profiles/history/statistics/settings backed by saved matches.
4. TypeScript, ESLint, Vitest, Playwright desktop/mobile and production build.
5. Leave dev server running, document exact restart commands.

## Future online boundary

Supabase would hold profiles, match membership, authoritative turn events and row-level security. Clients must submit expected revision numbers; server transactions validate darts and advance turn ownership. Realtime is delivery, not an authority. Offline play remains independent. DartBot uses the x01 engine; Cricket, Around the Clock and 121 Checkout each have their own tested engine.

## Current limits

Cricket, Around the Clock and 121 Checkout have no bot, statistics or speech. Statistics count x01 matches only. One writer tab is enforced with Web Locks. Unsupported browsers are read-only; there is no unsafe localStorage lease fallback. History is capped at 100 matches. Checkout attempts infer opportunities, not player intent. JSON import replaces rather than merges a validated scorebook. Offline caching does not back up match data. No server authority, authentication or online synchronization is claimed.

Browser API references: [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API), [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API), [Speech synthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis). Physical-device behavior remains a separate verification step.
