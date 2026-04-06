# [EXEC-01B] Debt Register

**Date:** 2026-04-07  
**Wave:** EXEC-01B — CSS Architecture Stabilization

---

## Debt Closed This Wave

| ID | Title | Status | Evidence |
|----|-------|--------|----------|
| DEBT-013 | No CSS token source of truth | **CLOSED** | `tokens.css` created as single `:root {}` home. Zero other `:root {}` blocks in active CSS files. |

---

## Debt Reduced This Wave

| ID | Title | Before | After | Remaining Gap |
|----|-------|--------|-------|---------------|
| DEBT-001 | `App.css` god-file | 1639 LOC active | Tombstoned (dead-code header), 1642 LOC body preserved as audit history | Formal deletion of body content pending (DEBT-016) |

---

## Pre-Existing Debt (Unchanged — Not In Scope)

| ID | Title | Status | Why Not Addressed |
|----|-------|--------|------------------|
| DEBT-002 through DEBT-010 | Rust-layer debts (prior waves) | REMAINING | Out of scope for CSS wave |
| DEBT-011 | Test coverage for `backup.rs` | REMAINING | Rust scope, deferred |
| DEBT-012 | Integration/E2E tests | REMAINING | Wave 03 target |

---

## New Debt Introduced This Wave

| ID | Title | Severity | Description | Target |
|----|-------|----------|-------------|--------|
| DEBT-014 | Undefined token references | Medium | `--surface`, `--blue`, `--blue-hover`, `--card-bg`, `--border-color`, `--text-primary`, `--text-muted` are referenced in `chat.css`, `settings.css`, `deepscan.css`, `drivemodal.css` but NOT defined in `tokens.css` or anywhere in the active import chain. These were pre-existing before this wave; explicitly documented here for first time. Current visual behavior: CSS degrades gracefully (undefined tokens evaluate to blank/initial). | Wave 02 — token alignment |
| DEBT-015 | `.btn-tiny` cascade override | Low | `settings.css` redefines `.btn-tiny` using `var(--surface)` (undefined token). Override is active because `settings.css` loads after `utilities.css`. Effect: settings-tab tiny buttons use the undefined `--surface` background. No visual regression from this wave (it was present before). | Wave 02 — token alignment |
| DEBT-016 | `App.css` body not formally deleted | Low | `App.css` is dead code (not imported). Tombstone header was added but the historical body (1630+ LOC) was retained for audit continuity. Formal deletion is safe at any time and should be done before the repo is handed off for long-term maintenance. | Next wave or cleanup sprint |

---

## Metrics Summary

| Metric | Before EXEC-01B | After EXEC-01B |
|--------|----------------|----------------|
| Active god-file LOC (`base.css`) | 289 | 135 |
| `:root {}` definitions (active) | 1 (`base.css`) | 1 (`tokens.css`) |
| Files with shared token ownership | 2 (base.css + App.css dead) | 1 (`tokens.css` only) |
| Modal primitive locations | 1 embedded in `base.css` | 1 dedicated `modal.css` |
| Button utility locations | 1 embedded in `base.css` | 1 dedicated `utilities.css` |
| Undefined token references documented | 0 | 7 (all pre-existing) |
| Build status | ✅ | ✅ |
