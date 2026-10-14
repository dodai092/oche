# Implementation progress

First milestone: a refresh-safe, playable local x01 match. Later modes remain planned until this milestone is verified.

- [x] Inspect shared workspace without overwriting projects.
- [x] Verify Node, npm, Git and REA installation.
- [x] Research public DartCounter documentation.
- [x] Choose original Oche identity and local-first architecture.
- [x] Implement and test deterministic scoring engine.
- [x] Build dashboard, setup, live match and completion.
- [x] Persist active match, settings, profiles and history.
- [x] Build real local player, statistics, history and settings screens.
- [x] Verify typecheck, lint, unit tests, browser tests and production build.
- [x] Launch local server.

## Work ledger

- REA inspection: read-only parallel task completed; no global config changed.
- Scoring engine: implemented independently, reviewed against contract and unit-tested. Leg/set and completion undo reviewed without additional defects.
- Application and persistence: reviewed independently. Fixed five findings with regression coverage: recursive storage writes, unreadable-save overwrite, invalid state hydration, guest identity collisions and duplicate saved profile selection. Follow-up review found two additional recovery edge cases: invalid outer envelopes and failed resets discarding raw data. Both fixed; regression tests verify preservation across reload and reset failure.

## Later priorities

- [ ] DartBot difficulty levels.
- [ ] Cricket.
- [ ] Advanced statistics and player analytics.
- [ ] Tournaments.
- [ ] Supabase authentication and server-authoritative online multiplayer.

## Final verification: 2026-10-14

| Check            | Command                           | Result                                                  |
| ---------------- | --------------------------------- | ------------------------------------------------------- |
| TypeScript       | `npm run typecheck`               | Pass, zero errors                                       |
| ESLint           | `npm run lint`                    | Pass, zero warnings/errors                              |
| Unit tests       | `npm test`                        | 39 passed across three files                            |
| Browser tests    | `npx playwright test --workers=2` | 26 passed in 21.3s                                      |
| Production build | `npm run build`                   | Pass, Next.js 16.4.1 webpack                            |
| Production audit | `npm audit --omit=dev --json`     | Zero vulnerabilities                                    |
| Visual review    | `node scripts/capture.mjs`        | Desktop and mobile dashboard/live screenshots inspected |

Browser coverage includes two-player 501, immediate scoring, turn ownership, visit multiplier reset, dart/turn undo, refresh persistence, a full 501 double-out finish, winning-dart undo, history, profile creation, bust recovery, four-player 701, fixed bull values, single-out solo legs, settings persistence, duplicate saved-player rejection, storage quota failures, corrupted state/envelopes and original-save recovery. All seven screens were checked for exceptions and horizontal overflow. Mobile tests emulate an iPhone viewport in Chromium; physical devices and Safari were not tested.

## Running application

Development server: http://127.0.0.1:3000

```sh
cd /Users/antunzebec/Work/Private/oche
npm run dev
```

Dependencies are installed. `npm ci` reproduces the pinned install on a fresh checkout. No deployment, push, merge or global MCP configuration change was performed. Git was initialized for this project; files remain uncommitted for review.

## Known observations

- Next.js Turbopack production compilation hit a subprocess port restriction even after escalation. The supported webpack compiler passes; `npm run build` uses `next build --webpack`. Development uses Next's default compiler.
- Full dependency audit: five high development-only findings in `eslint-config-next -> fast-glob -> micromatch -> braces`. Registry reports braces 3.0.3 as latest and the advisory includes it. No forced framework downgrade applied. Production audit is clean.
- Checkout attempts infer one-dart opportunities, not intended targets. Busts count three statistical darts. These conventions appear in the engine, tests and statistics screen.
- Browser-local persistence has a 100-match archive cap, JSON export and original-save recovery. Backup import and cross-tab conflict handling remain unimplemented. Use one scoring tab per device.
- REA CLI/MCP health probe passed, but REA is not registered in this Codex session. Exact reconnect commands and analysis limits are in REA.md. No app binary was analyzed.

## Typed visit score entry

User supplied two DartCounter screenshots showing a numeric visit-total entry field, Submit and a touch keypad. Implementing an original equivalent alongside the existing segment input.

- [x] Add tested, atomic visit-total events without invented segment data.
- [x] Validate legal totals, dart counts, busts, double-out confirmation and undo.
- [x] Add keyboard entry, Enter submission, numeric keypad and entry-mode switch.
- [x] Preserve existing saved dart events and display total visits honestly in logs.
- [x] Complete browser regression, visual review, lint/typecheck and production build.

Counting: total visits use the reported dart count and checkout attempts (defaults three and zero). Successful finishes require at least one reported attempt. If a mixed-input total crosses the first-nine boundary, first-nine is unavailable because individual segment scores were not entered.

Typed-entry verification complete: 39 unit tests, 26 desktop/mobile Chromium checks, TypeScript, lint and production build passed. Numeric entry, Enter/Submit, touch digits, undo, refresh, invalid sums, bust and double-out confirmation were exercised in the browser. Desktop and mobile total-entry screenshots were inspected. Review found and resolved first-nine uncertainty and trailing malformed events after completion, both with failing-then-passing regression tests.

## Branding bar removal

- [x] Removed the Dodai co-brand bar, scroll listener and unused bar styles at the user's request. Oche navigation remains.

## GitHub Pages deployment

- [x] Verify GitHub authentication and available repository name.
- [x] Add static screen generation and optional Pages export with /oche base path.
- [x] Add GitHub Actions build, checks and Pages deployment workflow.
- [x] Verify the exported site under /oche, including refresh and scoring (Chromium and WebKit).
- [ ] Create repository, push and enable GitHub Pages.
- [ ] Verify the published mobile site.

User explicitly authorized GitHub push and GitHub Pages publication. Target repository is public dodai092/oche. Raw research cache, local match data, dependencies and build outputs are excluded.

Pages pre-push verification: all routes exported, 39 unit tests passed, lint passed, and mobile Chromium/WebKit checks completed a 501 match, undo, refresh and direct-route/asset checks. Public repository and Pages workflow source are configured; publishing verification follows the push.
