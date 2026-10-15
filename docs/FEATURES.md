# Reference research and feature scope

Researched 2026-10-14. Public material only. No native app was installed or instrumented. REA cannot reconstruct native behavior from a store URL.

## Confirmed public behavior

Sources: [Apple listing](https://apps.apple.com/hr/app/dartcounter/id999533915) and [official DartCounter site](https://dartcounter.net/). A locally saved official-site scrape is in .firecrawl/dartcounter.md.

| Area               | Public evidence                                                                                                             | Confidence                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Core modes         | x01, Cricket, Around the Clock and training games                                                                           | Confirmed, Apple description                |
| Opponent           | DartBot computer opponent; release notes mention improvements and Mirror Match                                              | Confirmed, Apple                            |
| Multiplayer        | Local matches and online play; account-linked game saving                                                                   | Confirmed, Apple                            |
| Profiles           | Public site shows player identity, country and average                                                                      | Confirmed, official screenshot description  |
| Navigation         | Official artwork shows local and online entry points; release notes refer to statistics navigation and online lobby filters | Confirmed surfaces, exact hierarchy unknown |
| Input              | Public scoreboard artwork shows two 501 scores and a visit-total field with submit                                          | Confirmed, official screenshot description  |
| Statistics/history | Basic statistics and previous-game access; expanded statistics in paid tier                                                 | Confirmed, official site                    |
| Tournaments        | Local and online tournaments, group stages and round robin mentioned in release notes                                       | Confirmed, Apple                            |

## Unverified details and our decisions

- Exact setup steps, 301/701 options, checkout suggestion algorithm, dart-by-dart manual entry and leg/set controls were not established from these pages. Oche implements the user's requested behavior independently.
- Main screens in Oche: dashboard, setup, live match, players, statistics, history and settings. This is our information architecture, not a claimed copy of native navigation.
- No claim is made about DartCounter's internal scoring, data model, bot algorithm, networking or proprietary APIs.
- Oche uses lime on charcoal and its own typographic scoreboard. DartCounter screenshots, branding, voice, assets and source are not reused.

## Oche milestone

Working local x01: 301/501/701, single/double out, up to four players, legal single/double/triple hits, bulls, miss, three darts, immediate score updates, bust, undo dart/turn, checkout routes, legs/sets, completion, persisted matches and local statistics. Profiles and history operate only on this browser's data.

Implemented after the core: DartBot with three difficulty levels, richer per-match summaries, offline play, validated backup import, one-writer tab protection and optional match-day controls. Cricket (Standard and Cut-throat, 2 to 4 players, first to N legs, dart-by-dart entry, history and backup) is implemented. Not in this version: DartBot Cricket, No-score, solo, sets, Cricket statistics and speech for Cricket. Around the Clock is implemented with finish (single bull, bullseye, all), target field (any, single, double, treble), hits per number (1 to 3), order (low to high, high to low, random), Increase by segment, first to N legs, 1 to 4 local players (solo is a drill), dart-by-dart entry, history, rematch and backup. Not in this version: Around the Clock bot, speech, statistics, round limits and sets. 121 Checkout is implemented with a start target (121 or custom up to 170), 3 to 15 darts per attempt, 10, custom or infinite rounds, a safehouse fall-back, double out, 1 to 4 players sharing one run, dart-by-dart entry, history, rematch and backup. Not in this version: 121 Checkout bot, speech, statistics, single out, a choice of increase step, sets and skipping uncheckable targets. Planned: longitudinal analytics, tournaments and Supabase online play. No fake online controls.

## Supplied screenshot evidence: typed totals

The user supplied two DartCounter screenshots on 2026-10-14 showing a visit-score text field, Submit button, 0-9 keypad and an expandable input-mode menu. This confirms direct visit-total entry. The behavior behind the unlabeled mode icons is not established from the images.

Oche now offers original visit-total and individual-dart entry modes. Visit totals support typing, Enter, Submit and a touch keypad. Double-out completion requires explicit confirmation, with reported darts and checkout attempts. No reference image or branding was imported into the application.
