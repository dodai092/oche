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

- [x] DartBot difficulty levels.
- [x] Cricket (Standard and Cut-throat, 2 to 4 players).
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
- Browser-local persistence has a 100-match archive cap, JSON export/import and original-save recovery. One writer tab is enforced through Web Locks. Import replaces rather than merges data; there is no cloud sync.
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

## Reliability and solo play

Approved scope: implement the six follow-up priorities. See RELIABILITY-PLAN.md for the ownership ledger.

- [x] Short portrait/landscape and enlarged-text checks, safe-area padding and explicit drawer focus restoration for WebKit.
- [x] Versioned offline export, manifest and icons; cold HTML/RSC navigation, scoring and refresh offline.
- [x] Atomic failed-download handling, waiting updates, explicit update after completion, and recovery after cache eviction.
- [x] Validated JSON backup import with preview and explicit replacement; failed writes preserve current state.
- [x] Last export request timestamp and one-writer Web Lock with read-only following tabs and explicit handover.
- [x] Reusable match comparison and per-leg summaries in completion/history; typed-total uncertainty is explained.
- [x] DartBot Easy/Medium/Hard, real segment events, cancellable darts, pause and bot-turn undo, hidden-page suspension.
- [x] Opt-in screen wake lock and spoken scores with lifecycle cleanup and capability/error feedback.
- [x] Complete final checks and publish.

Focused unit coverage includes backup validation, read-only mutation guards, failed restore writes, bot configuration and difficulty ordering, timer cancellation, announcements and multi-set summaries. Browser checks exercise backup preview/restore, two-tab handover, bot turns, short/landscape layouts, enlarged text, dialog focus and mocked wake/speech APIs. A full run found WebKit's native dialog did not restore focus to a mouse-clicked button; an explicit onClose focus restoration fixed the targeted WebKit test.

Offline verification passed in Chromium and WebKit: initial download, offline scoring/undo/reload, never-visited routes, interrupted update preserving the active cache, waiting update, real Update button disabled mid-match and enabled after completion, explicit reload preserving the scorebook, and evicted-cache repair. Desktop/mobile screenshots were inspected as one batch with one summary-text correction and confirmation.

Physical iPhone, VoiceOver, real spoken audio and device wake behavior are not claimed as tested. Browser mocks verify API requests and cleanup, not hardware behavior. Browser-supplied speech voices can require a connection. Unsupported Web Locks browsers remain read-only. Import replaces the bounded dataset; cloud sync and archive merging remain planned.

Final local checks: 66 unit tests passed across nine files; full browser suite passed 65 checks with one intentional desktop skip, using desktop Chromium, mobile Chromium and mobile WebKit. The final bot-lineup constraint also passed three targeted browser checks. TypeScript, ESLint and Pages production export passed. The final export's offline/update/repair script passed in both Chromium and WebKit. No new dependencies were added.

Release commit 9d0980f deployed successfully in https://github.com/dodai092/oche/actions/runs/38638051948. The published Chromium check passed scoring, completion, undo, refresh, all routes/assets and complete offline readiness. Existing local session summaries remain outside the feature commit.

## Review batch: 2026-10-14

Impeccable critique/audit (design 7/10, heuristics 28/40, audit 15/20). Implemented, not yet committed or published:

- [x] DartBot levels 1-20 (slider with expected 3-dart average and checkout range). Spread per level calibrated by seeded 501 simulation, about 13 + 4 * level average, level 20 about 98. Named Easy/Medium/Hard saves still replay unchanged.
- [x] Human can undo their own visit while DartBot is idle or paused.
- [x] No "Update available" on first install.
- [x] Leg table caption outside the scroller, methodology note behind a disclosure.
- [x] 12px text floor, five failing grey tones raised to the muted token, 44px mobile nav and back link.

Verification: 68 unit tests, 68 browser checks (one intentional skip), TypeScript and ESLint clean. Not yet verified: production export, offline script, physical iPhone.

Adapt pass (same day): landscape phones (max-height 500px) use two columns, scores left and entry right, so Submit, presets and the turn strip stay in view at 844x390 and 667x375. The mobile tab strip fades its cut-off edge and scrolls the current tab into view. Uncommitted. Physical iPhone landscape not tested.

Layout pass (setup): on screens up to 900px the match summary collapses into a sticky bottom bar so Start match is always reachable; lineup rows show the name field first with the saved-player select under it, and the remove button is 44px. Committed locally. Release f69f3af is live and verified (bot levels and landscape Submit in view on the public site).

Distill pass (live entry): after a typed total only one Undo score shows (Undo turn appears only after dart-by-dart input), the keypad hint is screen-reader-only, and the desktop scoreboard is compacted on screens up to 960px tall. Committed locally, not pushed.

Clarify pass: plurals ("1 leg", "1 set"), solo completion reads "Match complete!", "Darts / attempts" became "Visit details" with a plain definition of a checkout attempt, backup import separates "not an Oche backup" from "different version", and Settings dates use the same en-GB format as History. Committed locally, not pushed.

Harden pass: offline unknown routes serve the app's own 404 page (checked in verify-offline), skip link, named details dialog and an sr-only h1 on the live match page, manifest theme color matches the meta tag, explicit favicon link, apple-touch icon flattened onto the charcoal background, and Statistics groups same-name guests with a Date column. Not done: maskable manifest icon (needs a padded asset). Committed locally, not pushed.

Polish pass: removed the blank band above the leg table (global table margin), spacing between the completion summary line and buttons, a chevron on "How these are calculated", and the unused `.score-progress` styles (which was the only detector finding). Committed locally.

## Cricket: 2026-10-15

Added Cricket beside x01 on branch `cricket`: pure event-sourced engine, saved-match union tagged by `mode` (missing means x01), setup with game selector, dart-by-dart live screen with undo, completion with rematch, mixed history, dashboard entry and backup round trip. Statistics stay x01 only and say so. Out of scope: DartBot Cricket, No-score, solo, sets, Cricket statistics, speech for Cricket.

Verification: 96 unit tests, 98 browser checks passed with one intentional skip (Chromium, mobile Chromium, mobile WebKit), TypeScript and ESLint clean, Pages export and offline script passed in Chromium. Not claimed: physical iPhone, VoiceOver, real audio and wake lock.

## Around the Clock: 2026-10-15

Added Around the Clock as a third mode on branch `around-the-clock`: pure event-sourced engine, `mode: "atc"` in the saved-match union (missing mode still means x01), setup with every control, dart-by-dart live screen with a sequence track, undo, completion with rematch, mixed history, dashboard entry and backup round trip. Statistics stay x01 only and say so. Out of scope: bot, speech, statistics for this mode, round limits, sets, 121 Checkout.

Verification: 133 unit tests, 128 browser checks passed with one intentional skip (Chromium, mobile Chromium, mobile WebKit), TypeScript and ESLint clean, Pages export and offline script passed in Chromium. Not claimed: physical iPhone, VoiceOver, real audio and wake lock.

## 121 Checkout: 2026-10-15

Added 121 Checkout as a fourth mode on branch `checkout-121`: pure event-sourced engine, `mode: "checkout"` in the saved-match union (missing mode still means x01), setup with start target (121 or custom), darts per attempt (3, 6, 9, 12, 15), rounds (10, custom or infinite) and the safehouse rule, 1 to 4 local players sharing one run, dart-by-dart live screen with undo dart, undo turn, end turn, end run and resume run, a completion screen with rematch, mixed history, dashboard entry and backup round trip. The mode has no winner: the result is the best target cleared, and winner helpers are not called for it. Statistics stay x01 only and say so. Out of scope: bot, speech, statistics for this mode, single out, a choice of increase step, sets, legs, skipping uncheckable targets.

Verification: 182 unit tests, 164 browser checks passed with one intentional skip (Chromium, mobile Chromium, mobile WebKit), TypeScript and ESLint clean, Pages export and offline script passed in Chromium. Not claimed: physical iPhone, VoiceOver, real audio and wake lock.
