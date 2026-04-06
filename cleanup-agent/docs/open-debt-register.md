# Open Debt Register

**Version:** v0.1.0  
**Locked:** 2026-04-07 (EXEC-05 Documentation Lock)  
**Source:** `reports/cto/wave-04/debt-register.md` (master debt ledger through EXEC-04)

---

## Summary

| Category | Count |
|----------|-------|
| ✅ CLOSED (actionable, resolved) | 18 |
| 🔴 OPEN (actionable, unresolved) | **0** |
| 📌 NOTED (non-blocking, no wave target) | 6 |
| **Total tracked** | **24** |

> **All actionable debt is CLOSED.** Only 6 "NOTED" items remain — all non-blocking and not on any wave roadmap.

---

## NOTED Items (Non-Blocking — No Wave Target)

| ID | Title | Opened | Summary | Risk |
|----|-------|--------|---------|------|
| DEBT-007 | No structured logging utility | EXEC-00 | `utils/logger.rs` exists; appends to in-memory log; no file persistence | Low |
| DEBT-008 | `api.js` flat 54-export (no domain grouping) | EXEC-00 | IPC contract works fine; future domain grouping would not break callers | Low |
| DEBT-011 | DeepScanTab cleaning state not cleared on error | EXEC-00 | `setCleaning(false)` exists in catch block; edge case only | Low |
| DEBT-012 | `checkAndRunSchedule` not tested for idempotency | EXEC-00 | 60s poll; manual trigger path; idempotent by inspection | Low |
| DEBT-022 | `VSCE_PAT` CI lint warning | EXEC-01D | VS Code extension integration only; not in project codebase | None |
| DEBT-024 | React `useEffect` async pattern warnings | EXEC-02 | `useEffect(async fn)` anti-pattern (App.jsx lines ~100, ~143); pre-existing, not covered by ESLint config | Low |

---

## Closed Debt History

| ID | Title | Wave Opened | Wave Closed | Resolution Summary |
|----|-------|------------|------------|-------------------|
| DEBT-001 | `App.css` god-file (600+ LOC) | EXEC-00 | EXEC-01C | Retired to 9-LOC tombstone; all CSS migrated to `styles/` |
| DEBT-002 | No CSS token SoT | EXEC-00 | EXEC-01B | `src/styles/tokens.css` created; 24 initial `:root` tokens |
| DEBT-003 | `App.jsx` god-component (~700 LOC, 37 useState) | EXEC-00 | EXEC-03 | 260 LOC, 9 useState, 5 handlers |
| DEBT-004 | `App.css` body block duplicating `index.css` | EXEC-00 | EXEC-01C | Removed with App.css retirement |
| DEBT-005 | No domain ownership — all state in App | EXEC-00 | EXEC-03 | 6 domain hooks; App is pure shell |
| DEBT-006 | Deep scan mixed concerns | EXEC-00 | EXEC-02 | `useDeepScan` frontend hook; Rust `deep_scan/` module |
| DEBT-009 | `CleanupTab` 33-prop explosion | EXEC-00 | EXEC-03 | Reduced to 4 props (−88%) via domain hook |
| DEBT-010 | History tab eager load | EXEC-00 | EXEC-02 | Guarded by `tab === 'history'` effect |
| DEBT-013 | No CSS token SoT (duplicate of DEBT-002) | EXEC-00 | EXEC-01B | See DEBT-002 |
| DEBT-014 | Undefined CSS token references (~83 var() refs) | EXEC-01B | EXEC-04 | 10 undefined tokens remapped or added as canonical; `--blue`/`--blue-hover` new canonical tokens |
| DEBT-015 | `.btn-tiny` cascade specificity conflict | EXEC-01B | EXEC-04 | Settings override scoped to `.api-key-actions .btn-tiny`; cascade bleed to tabs eliminated |
| DEBT-016 | `App.css` body block remaining after EXEC-01B | EXEC-01B | EXEC-01C | Removed |
| DEBT-017 | `deep_scan.rs` rogue artifact | EXEC-01D | EXEC-01D | Quarantined |
| DEBT-018 | `E0761` module ambiguity (Rust compile error) | EXEC-01D | EXEC-01D | Resolved |
| DEBT-019 | Unused `usedBytesTotal` prop | EXEC-01D | EXEC-01D | Removed |
| DEBT-020 | `items` useMemo dep issue | EXEC-01D | EXEC-01D | Resolved |
| DEBT-021 | Missing `chatModel` dep in useEffect | EXEC-01D | EXEC-01D | Added |
| DEBT-023 | `useCleanup` extraction blocked (3 cross-boundary deps) | EXEC-02 | EXEC-03 | 3 callbacks: `onDiskRefresh`, `onTabChange`, `onLoadingChange` |

---

## Debt Closure Timeline

| Wave | Debts Closed | Debts Opened | Net |
|------|-------------|-------------|-----|
| EXEC-00 | — | 12 | +12 |
| EXEC-01B | 1 (DEBT-002) | 2 (DEBT-014, DEBT-015) | +1 |
| EXEC-01C | 3 (DEBT-001, DEBT-004, DEBT-016) | 0 | −3 |
| EXEC-01D | 5 (DEBT-017–021) | 2 (DEBT-022, DEBT-023) | −3 |
| EXEC-01R | 0 | 1 (DEBT-024) | +1 |
| EXEC-02 | 2 (DEBT-006, DEBT-010) | 0 | −2 |
| EXEC-03 | 4 (DEBT-003, DEBT-005, DEBT-009, DEBT-023) | 0 | −4 |
| EXEC-04 | 2 (DEBT-014, DEBT-015) | 0 | −2 |
| **EXEC-05** | 0 | 0 | **0** |

**Cumulative actionable open after EXEC-05: 0**

---

## DEBT-014 Detailed Closure Record (EXEC-04)

Undefined tokens found and resolved:

| Undefined Token | Occurrences | Resolution |
|----------------|-------------|-----------|
| `--surface` | 12 | → `--bg-card` |
| `--surface-hover` | 1 | → `--bg-card-hover` |
| `--card-bg` | 3 | → `--bg-card` |
| `--blue` | 11 | → new canonical `--blue: #3b82f6` |
| `--blue-hover` | 2 | → new canonical `--blue-hover: #2563eb` |
| `--border-color` | 9 | → `--border` |
| `--text-primary` | 14 | → `--text-bright` |
| `--text-secondary` | 2 | → `--text-dim` |
| `--text-muted` | 23 | → `--text-dim` |
| `--bg-hover` | 6 | → `--bg-card-hover` |

**Zero-token verification:** grep for all 10 undefined aliases → 0 matches.

## DEBT-015 Detailed Closure Record (EXEC-04)

`.btn-tiny` defined in `utilities.css` (canonical). Settings tab was overriding `.btn-tiny` in `settings.css` without scope, causing cascade bleed to Chat tab "Clear Chat" button and Cleanup tab selectors.

**Resolution:** Settings override moved to `.api-key-actions .btn-tiny { ... }` scoped selector.  
All other tabs now resolve `.btn-tiny` from `utilities.css` as intended.
