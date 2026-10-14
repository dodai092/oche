# Oche architecture

## Design and scope

An original, local-first darts room. Charcoal surfaces, lime active states, oversized tabular scores, a narrow desktop rail and a mobile navigation strip. No copied DartCounter assets or code. This is a personal project under Private/, which the workspace dashboard explicitly excludes.

The first milestone is x01 scoring, not online infrastructure. A backend now would add deployment and account dependencies without improving local scoring. All seven local screens operate on real local data; empty states never invent statistics.

## Boundaries

- src/lib/engine.ts: pure deterministic state transitions, legal darts, checkout search, event replay and statistics. No browser, React, clock or randomness.
- src/lib/store.ts: Zustand persistence, match identity/timestamps, player profiles, settings and archived match references. Hydration occurs after mount to prevent server/client mismatch.
- src/components: responsive application shell and screen components. Scoring uses the engine API only. Buttons commit a real action or navigate to a working screen.
- src/app: Next.js App Router layout, routes and styling.
- Vitest validates the scoring engine; Playwright exercises actual browser interaction, persistence and mobile layouts.

## Scoring decisions

Support 301/501/701, 1-4 local players, single or double out, first-to legs per set and first-to sets. Starters rotate by leg. Each dart updates immediately. Bust reverts the visit score and ends the turn. Third dart switches players automatically. Early end-turn is explicit: partial visits count entered darts; an empty-visit pass records three misses. Multipliers reset at visit boundaries. Match completion is undoable.

Dart events are the source of truth. Undo and derived statistics replay retained events, which also avoids stale counters after a correction. Checkout recommendations search legal sequences using the current darts remaining. Inner bull counts as a double; triple bull is invalid.

See engine documentation for counting conventions, including inferred checkout opportunities. The keypad cannot know whether a missed dart was intended at a double.

## Persistence and failure modes

Versioned localStorage stores a bounded archive and current match. Data stays in this browser, is not cloud-synced and can be exported as JSON from Settings. Hydration validates the save envelope and reconstructs derived state from legal events. Storage failures latch into read-only mode before reporting an error. Unreadable raw values are preserved for download; only an explicit reset permits replacement. Hydration and storage errors are shown in the UI. Replacing an in-progress match requires a visible confirmation. No account or private API is involved.

## Implementation sequence and verification

1. Scoring contract and tests, including bust, finish, undo and set progression.
2. Setup, scoreboard, keypad and persistence against that contract.
3. Local profiles/history/statistics/settings backed by saved matches.
4. TypeScript, ESLint, Vitest, Playwright desktop/mobile and production build.
5. Leave dev server running, document exact restart commands.

## Future online boundary

Supabase would hold profiles, match membership, authoritative turn events and row-level security. Clients must submit expected revision numbers; server transactions validate darts and advance turn ownership. Realtime is delivery, not an authority. Offline play remains independent. Bot and Cricket need their own tested rules before adding them to setup.

## Current limits

Use one scoring tab per device: localStorage has no cross-tab transaction or conflict resolution. History is capped at 100 matches. Checkout attempts infer opportunities, not player intent. JSON export has no import flow yet. No server authority, authentication or online synchronization is claimed in this local milestone.
