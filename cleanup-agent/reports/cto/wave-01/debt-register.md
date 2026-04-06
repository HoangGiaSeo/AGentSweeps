# EXEC-01 — Debt Register (Wave 01 Close)

**Date:** 2025-07-12  
**Previous balance:** [EXEC-00 debt-register.md](../codebase-scan/debt-register.md)

---

## Debt Resolved in Wave 01

| ID | File | Debt | Status |
|----|------|------|--------|
| D-01 | `commands/deep_scan.rs` | 851 LOC CRITICAL — no tests, single monolithic file | ✅ RESOLVED — split into 6 sub-modules, 23 tests |
| D-02 | `commands/cleanup.rs` | zip backup mixed with cleanup logic | ✅ RESOLVED — extracted to `backup.rs` |

---

## Debt Carried Forward

| ID | File | Debt | Risk | Wave Target |
|----|------|------|------|-------------|
| D-03 | `src/App.css` | 1,864 LOC CRITICAL — all app styles in one flat file | HIGH (maintainability) | Wave 02 |
| D-04 | `src/App.jsx` | 620 LOC — component logic + routing in one file | MEDIUM | Wave 02 |
| D-05 | `src/tabs/DeepScanTab.jsx` | 512 LOC — dense UI component | MEDIUM | Wave 02 |
| D-06 | `src/styles/deepscan.css` | 594 LOC OVERSIZED | LOW | Wave 02 |
| D-07 | `src/styles/drivemodal.css` | 514 LOC OVERSIZED | LOW | Wave 02 |
| D-08 | `commands/cleanup.rs` | 237 LOC — execute_cleanup dispatch is a large match block | LOW | Wave 03 |
| D-09 | Test coverage | `backup.rs`, `scan.rs`, `zones.rs` have no unit tests | MEDIUM | Wave 02 |
| D-10 | `deep_scan` orchestrator | No integration/snapshot test for `DriveAnalysis` shape | MEDIUM | Wave 03 |

---

## New Debt Introduced in Wave 01

None. No new files exceed 300 LOC. No new security risks added.

---

## Metrics Summary

| Metric | EXEC-00 | EXEC-01 | Delta |
|--------|---------|---------|-------|
| CRITICAL files | 2 | 1 (App.css) | -1 |
| OVERSIZED files | 4 | 6 (App.jsx, DeepScanTab, deepscan.css, drivemodal.css, App.css) | +0 (cleanup.rs dropped off) |
| Test count | 0 | 23 | +23 |
| `cargo check` | ✅ | ✅ | — |
| IPC commands | 27 | 27 (28th = backup) | ✅ stable |
