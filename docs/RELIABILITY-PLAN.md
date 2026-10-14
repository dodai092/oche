# Reliability and solo-play implementation

Approved scope: six priorities from the app review. Preserve the scoring rules and original charcoal/lime interface.

- [x] Mobile reliability: short and landscape viewports, enlarged text, focus/labels, return after interruption. Browser checks do not establish physical iPhone or VoiceOver compatibility.
- [x] Offline: build-versioned complete static cache, base-path-aware manifest and worker. Updates require an explicit click outside an active match. Verify offline reload, navigation and scoring against the production export.
- [x] Data protection: validate bounded JSON backups before preview/confirmation; restore atomically. Record last export request. Exclusive Web Lock prevents another tab from saving; secondary tabs can refresh and acquire after the writer closes.
- [x] Match summaries: reusable honest comparison and leg breakdown in completion/history, calculated from engine turns, unit-tested.
- [x] DartBot: optional single computer participant, three strengths, actual legal segment events, cancellable turns and pause/undo controls. Seeded tests establish ordering, not promised averages.
- [x] Match-day controls: opt-in screen wake lock and speech with capability/error feedback and lifecycle cleanup.
- [x] Verify unit/browser regressions, WebKit mobile smoke, production export, offline/update behavior, screenshots, then publish.

Ownership ledger: parent owns persistence, tab coordination, backup UI, integration, match-day controls and verification. Parallel workers own offline generation/manager, pure summary/component, and bot model/controller in disjoint files. Each result receives inline review before integration; no additional dispatch is needed.

Implementation choices: retain the existing localStorage envelope version with optional backward-compatible fields. Backups replace the entire local dataset only after a count preview and explicit confirmation. Invalid files never mutate saved state. Browsers without Web Locks remain read-only rather than risking concurrent overwrites. Offline readiness is reported only after full caching. No cloud services or dependencies are required.

Review ledger: all three parallel deliverables reviewed inline. Integration fixes add read-only update gating, hidden-page bot suspension and linear leg indexing. Regression findings fixed explicit WebKit drawer focus and test selectors that initially matched multiple status/alert regions. Cache-eviction test first failed because no repair action existed; the worker download handler and UI action now pass. No next task was dispatched.
