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

Dependencies are installed. `npm ci` reproduces the pinned install on a fresh checkout. This initial milestone preceded publication. The app is now committed and published as recorded in the deployment section. No global MCP configuration was changed.

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
- [x] Create repository, push and enable GitHub Pages.
- [x] Verify the published mobile site in Chromium; record the public WebKit connection limitation.

User explicitly authorized GitHub push and GitHub Pages publication. Target repository is public dodai092/oche. Raw research cache, local match data, dependencies and build outputs are excluded.

Pages pre-push verification: all routes exported, 39 unit tests passed, lint passed, and mobile Chromium/WebKit checks completed a 501 match, undo, refresh and direct-route/asset checks. Public repository and Pages workflow source are configured; publishing verification follows the push.

Published site: https://dodai092.github.io/oche/

Repository: https://github.com/dodai092/oche

Deployment run: https://github.com/dodai092/oche/actions/runs/38629214472, successful build and Pages deployment from app commit 2fe7b67. Public HTTP returned 200. The live mobile Chromium check passed scoring, completion, undo, refresh, every screen and asset checks. WebKit passed the same local static export but could not complete the public-site connection, reporting "The network connection was lost" on retry, including after the user's request to ask for access again. No physical iPhone test is claimed.

A fresh explicit WebKit access request was approved after the initial retries. The public WebKit test still returned the same network-connection error after approval, so it is not reported as a permission denial or a passing test.

## Match usability improvements 1-5

User authorized implementing the five review priorities. Preserve the original charcoal/lime identity and scoring rules; keep the Dodai bar removed.

- [x] Add backward-compatible persisted input preferences and safe completed-match rematch.
- [x] Add a proper saved-player selector to each lineup slot, preserving identity and duplicate validation.
- [x] Fit standard mobile scoring controls into the viewport and move secondary details into a drawer.
- [x] Improve useful labels and contrast; remove live dashboard chrome.
- [x] Provide one active mobile keyboard and common-score presets.
- [x] Show immediate last-score, turn and bust feedback with visible undo.
- [x] Test rematch, profile selection, both entry modes, storage compatibility and mobile layout.
- [x] Publish verified changes to GitHub Pages.

Work ledger: parent implements live layout, feedback, preferences and rematch; parallel saved-player picker task completed and reviewed. Review fixes reset Guest selection to a guest name and accept trailing-slash URLs in tests. No additional task dispatch is required.

Verification: 43 unit tests passed; 33 desktop/mobile browser tests passed with one intentional desktop skip for the mobile-only layout case. TypeScript and ESLint passed with no errors or warnings. Pages production export passed. Updated desktop and mobile scoring screenshots were inspected. Mobile tests cover control bounds, keyboard exclusivity, presets, persisted preferences and the details drawer. The exported site passed mobile Chromium scoring, completion, undo, refresh, routes and asset checks.

WebKit export verification passed on retry. Its first run completed gameplay but reported an access-control error for a Next route-data request during navigation. The unchanged retry passed all assertions; this intermittent navigation error remains recorded rather than being treated as a code fix or physical Safari verification.

Published app commit d00c9a3. GitHub Pages run https://github.com/dodai092/oche/actions/runs/38634943538 completed successfully. The published mobile Chromium check passed scoring, completion, undo, refresh, all routes and assets. Physical iPhone verification remains outstanding.
