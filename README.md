# Oche

A playable local darts scorer with an original charcoal-and-lime interface. Built with Next.js App Router, TypeScript, Tailwind CSS, a themed shadcn/ui Button, Lucide and Zustand. Rules live in a deterministic engine independent of the UI.

## Test on iPhone

Open https://dodai092.github.io/oche/ in Safari. Match data stays in that browser. Localhost data does not transfer to the published site. Safari Share > Add to Home Screen can keep a shortcut to the app; this is not an offline installation.

Repository: https://github.com/dodai092/oche

GitHub Actions publishes pushes to main. CI enables `GITHUB_PAGES=true` and `NEXT_PUBLIC_BASE_PATH=/oche`, producing static HTML for every screen in out/. Ordinary local builds still support `npm start`. See [deployment notes](docs/DEPLOYMENT.md).

## Start

Verified environment: macOS, Node 26.7.0, npm 11.19.0, Git 2.54.0. Exact dependency versions are pinned in package.json and package-lock.json.

```sh
cd /Users/antunzebec/Work/Private/oche
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Dependencies are already installed. For the next launch, only `npm run dev` is needed from this folder. Stop the server with Ctrl+C.

Production:

```sh
npm run build
npm start
```

The production build uses Next.js's supported webpack compiler. Turbopack's production PostCSS subprocess hit a local port restriction in this managed environment, including after escalation. The webpack build succeeded. The development server uses the default Next compiler.

## Play

Choose a starting score, checkout rule, first-to legs and sets, and one to four players. Select saved players from each profile picker or enter guest names. Unsaved guests have unique match identities.

Visit total is the default. Use the touch keypad or choose Use keyboard to type and press Enter. Common-score presets fill the entry for submission. The app remembers your input mode and keyboard choice. Use the expandable darts and checkout controls to report a shorter visit or darts thrown at a finish. Double-out checkouts require confirmation. Undo score removes the entire submitted visit. Totals are saved without inventing individual segment hits.

During mobile play, scores and controls fill the screen. Open More match details for statistics, checkout routes and recent visits. Turn feedback reports the last score or bust immediately. After completion, Rematch with these players starts a fresh match with the same lineup and rules while keeping the previous result in history.

Switch to Dart-by-dart for individual throws. Select Single, Double or Triple, then tap a numbered segment. Multiplier selection stays active within the visit and resets when the visit ends. Dedicated bull buttons always score 25 or 50. Miss scores zero. The third dart changes turns automatically. Bust restores the entire visit score.

End turn closes a partial visit using only the darts entered. On an empty visit it records three misses and passes play. Undo dart reopens the previous dart, even after a bust or winning checkout. Undo turn removes the current partial visit, or the most recent completed visit when no darts have been entered.

Scores and settings save after each change. Completing a match adds it to history. Undoing the winning dart removes that result until the match finishes again. Starting a new match over an unfinished one requires an explicit replacement click.

## Included

- Dashboard, match setup, live match, completion, players, statistics, history and settings.
- 301/501/701; single and double out; solo or up to four local players.
- Legal board segments, bust rules, automatic player rotation, legs and sets, rotating leg starters.
- Dart and turn undo, adaptive checkout suggestions, averages, first-nine averages, 180s and checkout opportunities.
- Local profiles, saved results with visit logs, player filtering and JSON export.
- Refresh-safe localStorage with malformed-save preservation, original-save download and explicit recovery. Storage failures keep play usable in memory and show a warning.
- Desktop, tablet and mobile CSS; keyboard focus states and reduced-motion support.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npx playwright install chromium
npm run test:e2e -- --workers=2
npm run build
```

Browser tests use desktop Chromium and a mobile viewport with Chromium. They do not establish Safari or real-device compatibility. Playwright starts the dev server if needed, or reuses a server already on port 3000. Run one Playwright command at a time because test artifacts share a directory.

For fresh preview images while the dev server is running:

```sh
node scripts/capture.mjs
```

Images are saved to docs/screenshots. No external fonts or proprietary DartCounter assets are needed.

## Counting conventions and limits

Bust visits count three statistical darts and zero points. Early-ended partial visits count actual entered darts. First-nine averages pool the first nine statistical darts in each leg. For total entry, checkout attempts are reported by the player (default zero). For individual-dart entry, attempts are inferred whenever a one-dart finish was available; keypad input cannot reveal the intended target of a miss. The UI labels this convention. If a reported total crosses the first-nine boundary during mixed input, first-nine is shown as unavailable, since individual hits are unknown.

Checkout suggestions are the shortest legal route, with higher scoring darts preferred. They are deterministic recommendations, not a copy of DartCounter's algorithm or a promise of professional tactical choice.

All data is stored in this browser. No cloud sync or import is implemented. The most recent 100 completed matches are retained. Export JSON for a longer record. Saved data is shared across tabs without conflict resolution; use one scoring tab per device.

The production dependency audit returned zero vulnerabilities. The full audit reports five high development-only findings in Next's lint tooling chain, ending in braces 3.0.3. No patched braces release was available from the registry at inspection. Details are in docs/PROGRESS.md.

## Next milestones

DartBot difficulty levels, Cricket, richer player analytics, tournaments and Supabase online play remain planned. No simulated online features or bot controls are exposed in this milestone.

## Documents

- [Features and research](docs/FEATURES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Progress and verification](docs/PROGRESS.md)
- [REA inspection and connection instructions](docs/REA.md)

REA CLI diagnostics work, but REA is not registered in the current Codex session. See docs/REA.md for the verified registration command and analysis limits. No global MCP configuration was modified.
