# [EXEC-01R] Debt Register — Wave 01 Close

**Date:** 2026-04-07  
**Parent:** `reports/cto/wave-01/debt-register.md`

---

## Legend

- **CLOSED** — Fully resolved, no remaining instance
- **REDUCED** — Partially addressed, residual exists
- **REMAINING** — Unchanged, still open

---

## Debt Items from EXEC-00 / EXEC-01

| ID | File | Debt Description | Status | Notes |
|----|------|------------------|--------|-------|
| D-01 | `commands/deep_scan.rs` | 851 LOC CRITICAL — no tests, monolithic | **CLOSED** (EXEC-01) | Split into 6 sub-modules; 23 tests added |
| D-02 | `commands/cleanup.rs` | zip backup mixed with cleanup logic | **CLOSED** (EXEC-01) | Extracted to `backup.rs` |
| D-03 | `src/App.css` | 1,864 LOC CRITICAL — flat CSS | **REMAINING** | Wave 02 target |
| D-04 | `src/App.jsx` | 620 LOC mixed routing + logic | **REMAINING** | Wave 02 target |
| D-05 | `src/tabs/DeepScanTab.jsx` | 512 LOC dense UI | **REMAINING** | Wave 02 target |
| D-06 | `src/styles/deepscan.css` | 594 LOC oversized | **REMAINING** | Wave 02 target |
| D-07 | `src/styles/drivemodal.css` | 514 LOC oversized | **REMAINING** | Wave 02 target |
| D-08 | `commands/cleanup.rs` | execute_cleanup dispatch match block | **REMAINING** | Low priority — Wave 03 |
| D-09 | Test coverage | `backup.rs`, `scan.rs`, `zones.rs` no tests | **REDUCED** | `clean.rs` now tested (EXEC-01R); backup/scan/zones still untested |
| D-10 | Integration testing | No snapshot test for `DriveAnalysis` shape | **REMAINING** | Wave 03 |

---

## New Debt Closed by EXEC-01R

| ID | Description | Resolution |
|----|-------------|------------|
| D-11 | `clean.rs` delete guard has no tests | **CLOSED** — 14 tests added, all pass |
| D-12 | `cleanup.rs` whitelist boundary has no tests | **CLOSED** — 11 tests added (14 assertions), all pass |
| D-13 | Source-of-truth for safety classification undocumented after split | **CLOSED** — documented in `acceptance-report.md` Section 6 |

---

## New Debt Introduced by EXEC-01R

**None.** Test additions are `#[cfg(test)]`-gated. No LOC increase in release binary. No new production logic.

---

## Metrics After EXEC-01R

| Metric | EXEC-00 | EXEC-01 | EXEC-01R | Delta (01→01R) |
|--------|---------|---------|----------|---------------|
| CRITICAL files | 2 | 1 | 1 | — |
| Test count | 0 | 23 | **48** | +25 |
| `cargo check` | ✅ | ✅ | ✅ | — |
| Open security gaps | 2 (no delete guard tests, no whitelist tests) | 2 (same) | **0** | -2 |
| Documented debt items | 10 | 10 | 13 (3 closed) | +3 closed |
| IPC commands | 27+1 | 28 | 28 | — |
