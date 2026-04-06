# [EXEC-04] Debt Register (Cumulative)

**Date:** 2026-04-07  
**Wave:** EXEC-04  
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
| DEBT-002 | No CSS token SoT — magic numbers in every file | EXEC-00 | EXEC-01B | ✅ CLOSED | `src/styles/tokens.css` `:root` token registry |
| DEBT-003 | `App.jsx` god-component (~700 LOC, 37 useState, 26 handlers) | EXEC-00 | EXEC-03 | ✅ CLOSED | 260 LOC, 9 useState, 5 handlers — no feature domain state remains |
| DEBT-004 | `App.css` body block duplicating index.css | EXEC-00 | EXEC-01C | ✅ CLOSED | Removed with App.css retirement |
| DEBT-005 | No domain ownership — all state inline in App | EXEC-00 | EXEC-03 | ✅ CLOSED | 6 domain hooks own all feature state; App is pure shell orchestrator |
| DEBT-006 | Deep scan mixed concerns | EXEC-00 | EXEC-02 | ✅ CLOSED | Frontend: `useDeepScan`; Rust: split in EXEC-01 |
| DEBT-007 | No structured logging utility | EXEC-00 | — | 📌 NOTED | `utils/logger.rs` exists; non-blocking |
| DEBT-008 | 54-export flat `api.js` — no domain grouping | EXEC-00 | — | 📌 NOTED | IPC contract stable; future refactor non-breaking |
| DEBT-009 | `CleanupTab` props explosion (33 props) | EXEC-00 | EXEC-03 | ✅ CLOSED | 4 props (−88%); grouped domain contracts |
| DEBT-010 | History tab loads eagerly | EXEC-00 | EXEC-02 | ✅ CLOSED | Guarded by `tab === "history"` effect |
| DEBT-011 | `DeepScanTab` cleaning state not cleared on error | EXEC-00 | — | 📌 NOTED | `setCleaning(false)` in catch block; low severity |
| DEBT-012 | `checkAndRunSchedule` not tested for idempotency | EXEC-00 | — | 📌 NOTED | Minute-level polling; low risk |
| DEBT-013 | No CSS token SoT (duplicate of DEBT-002) | EXEC-00 | EXEC-01B | ✅ CLOSED | See DEBT-002 |
| DEBT-014 | Undefined CSS token references | EXEC-01B | **EXEC-04** | ✅ **CLOSED** | 10 undefined token names, ~83 var() refs corrected; `--blue`/`--blue-hover` added as new canonical tokens |
| DEBT-015 | `.btn-tiny` cascade override specificity conflict | EXEC-01B | **EXEC-04** | ✅ **CLOSED** | Settings override scoped to `.api-key-actions .btn-tiny`; cascade bleed to Chat/Cleanup tabs eliminated |
| DEBT-016 | `App.css` body block remaining after EXEC-01B | EXEC-01B | EXEC-01C | ✅ CLOSED | Removed |
| DEBT-017 | `deep_scan.rs` rogue artifact | EXEC-01D | EXEC-01D | ✅ CLOSED | Quarantined |
| DEBT-018 | `E0761` module ambiguity | EXEC-01D | EXEC-01D | ✅ CLOSED | Resolved |
| DEBT-019 | Unused `usedBytesTotal` prop | EXEC-01D | EXEC-01D | ✅ CLOSED | Removed |
| DEBT-020 | `items` useMemo dep issue | EXEC-01D | EXEC-01D | ✅ CLOSED | Resolved |
| DEBT-021 | Missing `chatModel` dep in useEffect | EXEC-01D | EXEC-01D | ✅ CLOSED | Added |
| DEBT-022 | `VSCE_PAT` linter warning (publish.yml) | EXEC-01D | — | 📌 NOTED | Non-project secret; VS Code extension warning only |
| DEBT-023 | `useCleanup` extraction blocked by 3 cross-boundary deps | EXEC-02 | EXEC-03 | ✅ CLOSED | All 3 resolved via callback contracts |
| DEBT-024 | `useEffect` calling async fn warning (App.jsx:100, :143) | EXEC-02 | — | 📌 NOTED | Pre-existing; not covered by project ESLint config |

---

## EXEC-04 Debt Movement

| Debt | Before EXEC-04 | After EXEC-04 |
|------|---------------|--------------|
| DEBT-014 | 🔴 OPEN | ✅ CLOSED |
| DEBT-015 | 🔴 OPEN | ✅ CLOSED |

**2 debts closed this wave. 0 new debts opened.**

---

## DEBT-014 Closure Detail

**Actual scope (larger than EXEC-03 estimate of "3 tokens"):**

| Undefined Token | Occurrences | Resolution |
|----------------|-------------|-----------|
| `--surface` | 12 | → `--bg-card` (remap) |
| `--surface-hover` | 1 | → `--bg-card-hover` (remap) |
| `--card-bg` | 3 | → `--bg-card` (remap) |
| `--blue` | 11 | → `--blue: #3b82f6` (new canonical) |
| `--blue-hover` | 2 | → `--blue-hover: #2563eb` (new canonical) |
| `--border-color` | 9 | → `--border` (remap) |
| `--text-primary` | 14 | → `--text-bright` (remap) |
| `--text-secondary` | 2 | → `--text-dim` (remap) |
| `--text-muted` | 23 | → `--text-dim` (remap) |
| `--bg-hover` | 6 | → `--bg-card-hover` (remap) |

Zero-token verification: `Select-String *.css -Pattern "var\(--(surface|card-bg|text-primary|text-secondary|text-muted|bg-hover|border-color|surface-hover)"` → **0 matches**

---

## DEBT-015 Closure Detail

`.btn-tiny` cascade bleed from `settings.css` to all tabs:

| Tab | Before | After |
|-----|--------|-------|
| ChatTab "Clear Chat" | settings.css override (bg-card, text) | utilities.css canonical (bg-input, text-dim, accent hover) |
| CleanupTab selectors | settings.css override | utilities.css canonical |
| SettingsTab API keys | settings.css override (intentional) | `.api-key-actions .btn-tiny` scoped rule |

---

## Totals

| Category | Count |
|----------|-------|
| ✅ CLOSED | 18 |
| 🔴 OPEN (actionable) | 0 |
| 📌 NOTED (non-blocking) | 6 |
| Total tracked | 24 |

---

## Outstanding NOTED Items (non-blocking, no wave target)

| Debt | Summary |
|------|---------|
| DEBT-007 | Rust logging utility exists; no feature gap |
| DEBT-008 | `api.js` domain grouping — future refactor |
| DEBT-011 | DeepScan error state reset — low severity |
| DEBT-012 | Schedule idempotency test coverage |
| DEBT-022 | VSCE_PAT secret (VS Code extension CI, not project) |
| DEBT-024 | React `useEffect` async patterns — pre-existing |

**All actionable debt is now CLOSED. Project CSS architecture is fully aligned with the canonical token system.**
