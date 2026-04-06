# [EXEC-03] Debt Register (Cumulative)

**Date:** 2026-04-07  
**Wave:** EXEC-03  
**Format:** Cumulative — all debts tracked since project start. IDs preserved from prior waves.

---

## Legend

| Tag | Meaning |
|-----|---------|
| ✅ CLOSED | Fully resolved, verified, committed |
| ⚠️ PARTIAL | Partially resolved — remaining scope documented |
| 📌 NOTED | Known, non-blocking, no immediate action needed |
| 🔴 OPEN | Unresolved, action required |

---

## Debt Table

| ID | Title | Wave Opened | Wave Closed | Status | Notes |
|----|-------|------------|------------|--------|-------|
| DEBT-001 | `App.css` god-file (600+ LOC, all global) | EXEC-00 | EXEC-01C | ✅ CLOSED | Retired to zero-LOC stub; all styles in `styles/*.css` |
| DEBT-002 | No CSS token SoT — magic numbers in every file | EXEC-00 | EXEC-01B | ✅ CLOSED | `src/styles/base.css` `:root` token registry |
| DEBT-003 | `App.jsx` god-component (~700 LOC, 37 useState, 26 handlers) | EXEC-00 | EXEC-03 | ✅ **CLOSED** | 260 LOC, 9 useState, 5 handlers — no feature domain state remains |
| DEBT-004 | `App.css` body block duplicating index.css | EXEC-00 | EXEC-01C | ✅ CLOSED | Removed with App.css retirement |
| DEBT-005 | No domain ownership — all state inline in App | EXEC-00 | EXEC-03 | ✅ **CLOSED** | 6 domain hooks own all feature state; App is pure shell orchestrator |
| DEBT-006 | Deep scan mixed concerns | EXEC-00 | EXEC-02 | ✅ CLOSED | Frontend: `useDeepScan`; Rust: split in EXEC-01 |
| DEBT-007 | No structured logging utility | EXEC-00 | — | 📌 NOTED | `utils/logger.rs` exists; non-blocking; post-Wave 04 candidate |
| DEBT-008 | 54-export flat `api.js` — no domain grouping | EXEC-00 | — | 📌 NOTED | IPC contract stable; consumer reorganization already done in hooks; refactor is non-breaking future work |
| DEBT-009 | `CleanupTab` props explosion (33 props) | EXEC-00 | EXEC-03 | ✅ **CLOSED** | 4 props (−88%); grouped domain contracts |
| DEBT-010 | History tab loads eagerly | EXEC-00 | EXEC-02 | ✅ CLOSED | Guarded by `tab === "history"` effect |
| DEBT-011 | `DeepScanTab` cleaning state not cleared on error | EXEC-00 | — | 📌 NOTED | `setCleaning(false)` in catch block; low severity |
| DEBT-012 | `checkAndRunSchedule` not tested for idempotency | EXEC-00 | — | 📌 NOTED | Minute-level polling; low risk |
| DEBT-013 | No CSS token SoT (duplicate of DEBT-002) | EXEC-00 | EXEC-01B | ✅ CLOSED | See DEBT-002 |
| DEBT-014 | Undefined CSS token references | EXEC-01B | — | 🔴 OPEN | 3 tokens: `--color-text-tertiary`, `--color-surface-hover`, `--border-subtle` → Wave 04 |
| DEBT-015 | `.btn-tiny` cascade override specificity conflict | EXEC-01B | — | 🔴 OPEN | CSS-only fix → Wave 04 |
| DEBT-016 | `App.css` body block remaining after EXEC-01B | EXEC-01B | EXEC-01C | ✅ CLOSED | Removed |
| DEBT-017 | `deep_scan.rs` rogue artifact | EXEC-01D | EXEC-01D | ✅ CLOSED | Quarantined |
| DEBT-018 | `E0761` module ambiguity | EXEC-01D | EXEC-01D | ✅ CLOSED | Resolved |
| DEBT-019 | Unused `usedBytesTotal` prop | EXEC-01D | EXEC-01D | ✅ CLOSED | Removed |
| DEBT-020 | `items` useMemo dep issue | EXEC-01D | EXEC-01D | ✅ CLOSED | Stabilized |
| DEBT-021 | Missing `chatModel` dep in useEffect | EXEC-01D | EXEC-01D | ✅ CLOSED | Added |
| DEBT-022 | `VSCE_PAT` linter warning (publish.yml) | EXEC-01D | — | 📌 NOTED | Non-project secret; VS Code extension warning only |
| DEBT-023 | `useCleanup` extraction blocked by 3 cross-boundary deps | EXEC-02 | EXEC-03 | ✅ **CLOSED** | All 3 blockers resolved via `onTabChange`, `onDiskRefresh`, `onLoadingChange` callbacks |
| DEBT-024 | `useEffect` calling async fn warning (App.jsx:100, :143) | EXEC-02 | — | 📌 NOTED | Pre-existing pattern; not in project ESLint config |

---

## EXEC-03 Debt Movement

| Debt | Before EXEC-03 | After EXEC-03 |
|------|---------------|--------------|
| DEBT-003 | ⚠️ PARTIAL | ✅ CLOSED |
| DEBT-005 | ⚠️ PARTIAL | ✅ CLOSED |
| DEBT-009 | 🔴 OPEN | ✅ CLOSED |
| DEBT-023 | 🔴 DEFERRED | ✅ CLOSED |

**4 debts closed this wave. 0 new debts opened.**

---

## Totals

| Category | Count |
|----------|-------|
| ✅ CLOSED | 16 |
| 🔴 OPEN (actionable) | 2 |
| 📌 NOTED (non-blocking) | 6 |
| Total tracked | 24 |

---

## Remaining Open Debt (Wave 04 targets)

### DEBT-014 — Undefined CSS Tokens

**Tokens:**
- `--color-text-tertiary` — referenced in `chat.css`, `settings.css`
- `--color-surface-hover` — referenced in `sidebar.css`, `cleanup.css`
- `--border-subtle` — referenced in `dashboard.css`

**Fix:** Add 3 token definitions to `src/styles/base.css` `:root` block, mapped to nearest existing color tokens. Low risk — CSS-only change.

### DEBT-015 — `.btn-tiny` Cascade Override

**Symptom:** `.btn-tiny` overrides base `.btn` specificity via property duplication rather than clean cascade.

**Fix:** Specificity audit on `.btn` vs `.btn-tiny`. Likely 2-3 property declarations to adjust. CSS-only change.

---

## Architecture Debt Status

**All frontend state architecture debt is now CLOSED.** The only remaining open debts are CSS cosmetic issues (DEBT-014, DEBT-015). The state ownership model is complete:

```
App.jsx         — shell orchestrator (navigation, disk overview, loading overlay, ollama status)
useToast        — notification system
useApiKeys      — API keys domain
useDeepScan     — deep scan domain
useChat         — chat session domain
useSchedule     — schedule config domain
useCleanup      — cleanup execution domain
```

No god-component. No implicit shared state. No dual ownership.
