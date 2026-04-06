# [EXEC-02] Debt Register

**Date:** 2026-04-07  
**Wave:** EXEC-02 — Frontend State Architecture Foundation  
**Format:** Cumulative — all debts tracked since project start

---

## Legend

| Tag | Meaning |
|-----|---------|
| ✅ CLOSED | Fully resolved, verified, committed |
| ⚠️ PARTIAL | Partially resolved — remaining scope documented |
| 📌 NOTED | Known, non-blocking, no immediate action needed |
| 🔴 OPEN | Unresolved, action required |
| 🔴→ DEFERRED | Deferred to specific wave with documented rationale and unblock path |

---

## Debt Table

| ID | Title | Wave Opened | Wave Closed | Status | Notes |
|----|-------|------------|------------|--------|-------|
| DEBT-001 | `App.css` god-file (600+ LOC, all global) | EXEC-00 | EXEC-01C | ✅ CLOSED | Retired to zero-LOC stub; all styles in `styles/*.css` |
| DEBT-002 | No CSS token SoT — magic numbers in every file | EXEC-00 | EXEC-01B | ✅ CLOSED | `src/styles/base.css` `:root` token registry |
| DEBT-003 | `App.jsx` god-component (~700 LOC, 37 useState, 26 handlers) | EXEC-00 | EXEC-02 (partial) | ⚠️ PARTIAL | 397 LOC, 22 useState, 13 handlers after EXEC-02; cleanup domain remains |
| DEBT-004 | `App.css` body block duplicating index.css | EXEC-00 | EXEC-01C | ✅ CLOSED | `body` block removed with App.css retirement |
| DEBT-005 | No domain ownership — all state inline in App | EXEC-00 | EXEC-02 (partial) | ⚠️ PARTIAL | 4 domains extracted; cleanup domain deferred (DEBT-023) |
| DEBT-006 | Deep scan mixed with god-component | EXEC-00 | EXEC-02 | ⚠️ PARTIAL | Frontend domain isolated in `useDeepScan`; Rust side split in EXEC-01 |
| DEBT-007 | No structured logging utility | EXEC-00 | — | 📌 NOTED | `utils/logger.rs` exists but not uniformly adopted; non-blocking |
| DEBT-008 | 54-export flat `api.js` — no domain grouping | EXEC-00 | — | 📌 NOTED | IPC contract stable and correct; refactor post-Wave 04 is non-breaking candidate |
| DEBT-009 | `CleanupTab` props explosion (33 props) | EXEC-00 | — | 🔴 OPEN | Source clarity improved (6 schedule props now from useSchedule), count unchanged. Wave 03 target. |
| DEBT-010 | History tab loads eagerly (no lazy load guard) | EXEC-00 | EXEC-02 (implicit) | ⚠️ PARTIAL | `loadHistory` now guarded by `tab === "history"` effect in App |
| DEBT-011 | `DeepScanTab` internal `cleaning` state not cleared on error | EXEC-00 | — | 📌 NOTED | `setCleaning(false)` in catch block exists; low severity |
| DEBT-012 | `checkAndRunSchedule` not tested for idempotency | EXEC-00 | — | 📌 NOTED | Polling-based schedule check; minute-level granularity masks double-fire risk |
| DEBT-013 | No CSS token SoT (duplicate of DEBT-002) | EXEC-00 | EXEC-01B | ✅ CLOSED | See DEBT-002 |
| DEBT-014 | Undefined CSS token references (`--color-text-tertiary`, etc.) | EXEC-01B | — | 🔴 OPEN | 3 undefined tokens still referenced in component CSS; map to existing `:root` tokens in Wave 03 |
| DEBT-015 | `.btn-tiny` cascade override specificity conflict | EXEC-01B | — | 🔴 OPEN | Low severity; needs specificity audit in Wave 03 |
| DEBT-016 | `App.css` body block remaining after EXEC-01B | EXEC-01B | EXEC-01C | ✅ CLOSED | Removed with App.css retirement |
| DEBT-017 | `deep_scan.rs` rogue artifact in Rust module tree | EXEC-01D | EXEC-01D | ✅ CLOSED | Quarantined: `src-tauri/src/commands/quarantine/deep_scan.rs.bak` |
| DEBT-018 | `E0761` module ambiguity from mixed `deep_scan` declarations | EXEC-01D | EXEC-01D | ✅ CLOSED | Resolved with rogue artifact quarantine |
| DEBT-019 | Unused `usedBytesTotal` prop in `DashboardTab` | EXEC-01D | EXEC-01D | ✅ CLOSED | Prop removed from App.jsx render |
| DEBT-020 | `items` in `useMemo` dep array pointing to non-stable reference | EXEC-01D | EXEC-01D | ✅ CLOSED | Stabilized |
| DEBT-021 | Missing `chatModel` in `useEffect` dep array | EXEC-01D | EXEC-01D | ✅ CLOSED | Added to deps |
| DEBT-022 | `VSCE_PAT` environment variable name matched by linter | EXEC-01D | — | 📌 NOTED | Pre-existing; not a project secret; VS Code extension warning only |
| DEBT-023 | `useCleanup` extraction blocked by 3 cross-boundary deps | EXEC-02 | — | 🔴 DEFERRED → Wave 03 | See boundary analysis below |
| DEBT-024 | `useEffect` calling async function directly (App.jsx:109, :278) | EXEC-02 | — | 📌 NOTED | Pre-existing pattern; not in project ESLint config; VS Code extension warning only |

---

## DEBT-023 — useCleanup Boundary Analysis (detail)

**Debt opened:** EXEC-02  
**Target resolution:** Wave 03  

**Blocking dependencies (must be resolved before extraction is safe):**

### Blocker 1 — Tab coupling
`handleScan` ends with `setTab("cleanup")` to auto-navigate after a scan.  
`tab` is App shell state.  
**Resolution path:** Accept `setTab` as a callback param in `useCleanup({ ..., onTabChange })`.

### Blocker 2 — diskOverview write
`executeCleanup` calls `getDiskOverview()` and writes to `setDiskOverview` for space-freed calculation.  
`diskOverview` is App shell state (read by DashboardTab, DeepScanTab, and cleanup domain simultaneously).  
**Resolution path:** Same `onDiskRefresh` callback pattern used in `useDeepScan` — accept `setDiskOverview` as `onDiskRefresh`.

### Blocker 3 — Global loading overlay
`handleScan` and `executeCleanup` both write to `loading` (string), which renders a full-screen overlay.  
`loading` is also written by `loadDashboard` (shell), `handleDriveClick` (shell), and schedule operations.  
**Resolution path options:**
- Option A: Accept `setLoading` callback param in `useCleanup` (simple, same pattern as above)
- Option B: Local `cleanupLoading` in `useCleanup` + remove global loading from shell for cleanup operations
- Option B is cleaner but requires confirming that no Tab component expects the global overlay during cleanup

**Decision deferred to Wave 03.** Both options are correct implementations; choice depends on UX requirement for global overlay during cleanup.

---

## DEBT-014 — Undefined CSS Tokens (detail)

**Debt opened:** EXEC-01B  
**Target resolution:** Wave 03  

Tokens referenced but undefined in `:root`:
- `--color-text-tertiary` (chat.css, settings.css)
- `--color-surface-hover` (sidebar.css, cleanup.css)
- `--border-subtle` (dashboard.css)

**Resolution:** Map each to nearest existing `:root` token or define new tokens in `base.css`.

---

## Debt Summary by Wave

| Wave | Debts Opened | Debts Closed | Net |
|------|-------------|-------------|-----|
| EXEC-00 (audit) | 12 | 0 | +12 |
| EXEC-01 (Rust split) | 0 | 0 | 0 |
| EXEC-01B (CSS arch) | 3 | 2 | +1 |
| EXEC-01C (App.css retirement) | 0 | 2 | −2 |
| EXEC-01D (Rust tree integrity) | 0 | 5 | −5 |
| EXEC-02 (Frontend state arch) | 2 | 0 | +2 |
| **Total** | **17** | **9** | **+8** |

**Open/Partial count after EXEC-02:** 8 (DEBT-003 partial, DEBT-005 partial, DEBT-006 partial, DEBT-009 open, DEBT-014 open, DEBT-015 open, DEBT-023 deferred, DEBT-024 noted)  
**Closed count:** 9 (DEBT-001, 002, 004, 013, 016, 017, 018, 019, 020, 021 — noting DEBT-010 as implicit partial closure)

---

## Wave 03 Debt Targets

Priority order:
1. **DEBT-023** — `useCleanup` extraction (resolve 3 blockers, extract domain)
2. **DEBT-009** — `CleanupTab` props reduction (depends on DEBT-023)
3. **DEBT-014** — Undefined CSS tokens (CSS-only fix, low risk)
4. **DEBT-015** — `.btn-tiny` cascade override (CSS-only fix)
5. **DEBT-003** — `App.jsx` god-component (partial close → full close after DEBT-023)
6. **DEBT-005** — Global state ownership (partial close → full close after DEBT-023)
