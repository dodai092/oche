# Cricket mode design

Status: approved in conversation 2026-10-15, awaiting written-spec review.

## Intent

Add Cricket as a second game mode beside x01. Keep the charcoal/lime identity, the dart-event source of truth, undo by replay, refresh-safe local saves, one history, one backup path and the one-writer tab lock. Cricket is entered dart by dart; typed totals do not apply.

## Scope

In: Standard and Cut-throat scoring, 2 to 4 local players, first to N legs, setup, live scoring, completion summary, history, rematch, backup/import, dashboard entry.

Out of this version: DartBot Cricket, No-score variant, solo practice, Cricket statistics, speech announcements for marks, round limits, sets.

## Rules

- Numbers: 20, 19, 18, 17, 16, 15 and Bull. Any other segment is a miss.
- Marks: single 1, double 2, triple 3. Outer bull 1 mark, inner bull 2 marks. Triple bull is invalid.
- A number is closed by a player at 3 marks.
- Standard: marks beyond the third score the number's value (25 for Bull) per mark while at least one opponent has not closed that number. Highest score wins.
- Cut-throat: the same marks, but points go to every opponent that has not closed the number. Lowest score wins.
- A player wins the leg immediately when they have closed all seven numbers and their score is equal or better than every opponent's (higher or equal in Standard, lower or equal in Cut-throat).
- Stall rule: if every player has closed every number, the leg ends for the best score. A tie goes to the player who closed their last number first. This is our rule, isolated in one function.
- Match: first to N legs. The starting player rotates each leg. Three darts per turn, automatic switch, early end of turn records misses for unthrown darts.

## Engine

`src/lib/cricket-engine.ts`, pure and deterministic: no browser, React, clock or randomness, and no dependency on `engine.ts`. State is derived only from events (`dart`, `end-turn`) by replay. Undo dart and undo turn replay retained events. Marks per round for the summary are derived from events.

## Storage and compatibility

`SavedMatch` becomes a union tagged by `mode`. An x01 match has `mode` missing or `"x01"`. A Cricket match has `mode: "cricket"` and its own game state. A missing `mode` loads as x01, so no migration is needed and old backups import unchanged.

Restore and import rebuild every Cricket match by replaying its events through the Cricket engine. A malformed Cricket match is rejected without touching other matches. History (100-match cap), export, tab lock, offline cache and profiles stay shared. Store actions: `start` takes a mode, `dart`, `finishTurn`, `undo` route to the active engine, `visit` stays x01-only, `rematch` keeps mode and settings.

## Screens

- Setup: game selector (x01 or Cricket). Cricket shows scoring style, legs to win, 2 to 4 players with the saved-player picker. No bot, starting score or checkout rule.
- Dashboard: "Choose your game" lists x01 and Cricket.
- Live: scoreboard of marks on the seven numbers and points per player; keypad limited to 15 to 20, Bull and Miss with the existing multiplier buttons; Undo dart, Undo turn, End turn; active-player card and turn strip as in x01. Landscape and mobile layouts follow the existing adaptations.
- Completion: winner, final marks and points, leg summary, Rematch.
- History: both modes listed with a mode label; detail view shows the Cricket result.
- Statistics: counts x01 matches only and says Cricket statistics are not tracked yet. It never invents numbers.

## Testing

- Unit, failing first: marks and closing; overflow scoring in both styles including a number all opponents closed; win with level and trailing scores; stall tie-break; turn switching, early end, leg rotation; undo by replay at every event.
- Persistence: old saves load as x01; a Cricket match round-trips through backup/import; a corrupted Cricket event list is rejected without affecting other matches.
- Browser (desktop, mobile, mobile WebKit): full 2-player match with setup, leg win, undo, refresh mid-leg, history and rematch; mixed x01 and Cricket history.
- The existing x01 suite stays green unchanged.

## Rollout

Stages, one commit each: engine with tests, storage and validation, setup, live screen, history and dashboard. Push only when asked. README, ARCHITECTURE and PROGRESS gain Cricket notes.

## Risks

The `mode` union touches about 16 files; the compiler guides most edits. The main regression risk is x01-only screens (history detail, statistics, bot, visit entry) that must guard on `mode`. The stall tie-break is our rule, not official.
