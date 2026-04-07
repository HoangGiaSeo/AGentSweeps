# Gate Baselines

**Version:** v0.1.0  
**Locked:** 2026-04-07 (EXEC-05 Documentation Lock → refreshed EXEC-07)
**HEAD commit:** `57ab566` (fix(EXEC-06R): agentic chat trigger-policy closure)

These baselines represent the verified system state as of EXEC-06R (Agentic Chat V1 + trigger-policy closure). All prior gates (1–7) confirmed clean at EXEC-07 refresh. Gate 8 (vitest) added by EXEC-06.

---

## Gate 1 — Rust Compile

**Command:** `cargo check` (run from `src-tauri/`)  
**Result:** EXIT:0  
**Output:** `Finished dev profile [unoptimized + debuginfo] target(s) in 0.53s`  
**Meaning:** All Rust source compiles without errors or warnings that would block compilation.

---

## Gate 2 — Rust Unit Tests

**Command:** `cargo test --lib` (run from `src-tauri/`)  
**Result:** EXIT:0  
**Output:** `test result: ok. 48 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 2.10s`

**Test distribution:**

| Module | Tests |
|--------|-------|
| `cleanup::` (ALLOWED_ACTIONS whitelist) | ~12 |
| `deep_scan::classify` (path safety boundary) | 18 |
| `deep_scan::` (zone/scan/clean) | ~18 |
| **Total** | **48** |

All 48 tests confirmed at EXEC-05 gate run.

---

## Gate 3 — Frontend Build (Vite)

**Command:** `npm run build` (run from project root)  
**Result:** EXIT:0  
**Output:**
```
dist/index.html                   0.46 kB │ gzip:  0.30 kB
dist/assets/index-BmBby2Vm.css   49.15 kB │ gzip:  8.93 kB
dist/assets/index-uItLfHEb.js   260.11 kB │ gzip: 78.14 kB
```

**Artifacts:** 47+ React modules bundled; no tree-shake warnings; no undefined imports.  
**Delta from EXEC-05:** CSS +1.47 kB (ToolBubble styles); JS +5.87 kB (5 chatTools modules + orchestration rewrite).

---

## Gate 4 — Undefined CSS Tokens

**Command:** PowerShell `Select-String` grep on `src/styles/` for all 10 previously-undefined token aliases  
**Result:** 0 matches  
**Aliases checked:** `--surface`, `--surface-hover`, `--card-bg`, `--text-primary`, `--text-secondary`, `--text-muted`, `--bg-hover`, `--border-color` (8 remapped aliases + `--blue`/`--blue-hover` now canonical)  
**Meaning:** All `var()` references in component CSS resolve to defined tokens in `tokens.css`.

---

## Gate 5 — App.jsx Shell Size

**File:** `src/App.jsx`  
**Lines:** 260 LOC  
**State atoms:** 9 useState  
**Shell handlers:** 5  
**Domain hooks wired:** 6  
**Meaning:** App.jsx is confirmed as shell-only orchestrator; no feature domain state.

---

## Gate 6 — Tauri Command Count

**File:** `src-tauri/src/lib.rs`  
**Registered commands:** 27  
**Modules:** 11  
**Meaning:** IPC surface is stable and fully accounted for.

> **Correction note:** The original codebase scan (`executive-summary.md`, `project-topology-overview.md`) recorded 28 commands. EXEC-05 enumerated the `generate_handler!` macro directly and reconciled against all 11 module files: verified count is **27**. The prior figure was a counting error in the scan phase — no command was removed. 27 is the correct locked baseline.

---

## Gate 7 — Debt Register

**Source:** `reports/cto/wave-04/debt-register.md` + `reports/cto/wave-06r/debt-register.md`  
**Actionable OPEN debts:** **0**  
**Total CLOSED:** 19 (D01 closed EXEC-06R)  
**NOTED (non-blocking, no wave target):** 11 (6 carry from EXEC-05; D02–D06 added EXEC-06)  
**Meaning:** No technical debt requires remediation before feature development can proceed.

---

## Gate 8 — Vitest Unit Tests (Added EXEC-06)

**Command:** `npm test` (runs `vitest run`, project root)  
**Result:** EXIT:0  
**Output:** `Tests 71 passed (71) • Duration 310ms`

**Test file:** `src/hooks/__tests__/useChat.agentic.test.js`  
**Test groups:** U01–U16 (intent detection, freshness policy, redaction, context composition, exclusion mechanism)  
**All tests operate on pure helper functions — no React, no Tauri mocks.**

**Test distribution:**

| Group | Tests |
|-------|-------|
| U01–U04 | Intent detection + exclusion (20) |
| U05–U08 | Freshness policy (18) |
| U09–U11 | Redaction pipeline (9) |
| U12–U13 | Context composer (9) |
| U14–U15 | Failure + normal chat (8) |
| U16 | EXEC-06R exclusion closure (7) |
| **Total** | **71** |

---

## Regression Thresholds

If any of the following regress, it constitutes a gate failure:

| Metric | Baseline | Failure Threshold |
|--------|----------|------------------|
| `cargo test --lib` pass count | 48 | < 48 |
| `cargo check` exit code | 0 | ≠ 0 |
| `npm run build` exit code | 0 | ≠ 0 |
| CSS size (build output) | 49.15 kB | > 55 kB (unexplained growth) |
| JS bundle size | 260.11 kB | > 285 kB (unexplained growth) |
| Undefined CSS token grep | 0 matches | > 0 matches |
| App.jsx LOC | 260 | > 300 (without approved domain extraction) |
| Actionable open debts | 0 | > 0 |
| Vitest pass count | 71 | < 71 |

---

## Gate Run History

| Gate Run | Context | Result |
|----------|---------|--------|
| EXEC-03 | After useCleanup extraction | `cargo test` 48/48; `vite build` EXIT:0 |
| EXEC-04 | After CSS token repair | `cargo check` EXIT:0; undefined token grep 0 matches |
| EXEC-05 | Documentation lock baseline | All 7 gates confirmed clean (re-run 2026-04-07) |
| EXEC-06 | Agentic Chat V1 | `npm test` 64/64 PASS; build EXIT:0 CSS 49.15 kB / JS 260.07 kB |
| EXEC-06R | Trigger-policy closure | `npm test` 71/71 PASS; build EXIT:0 CSS 49.15 kB / JS 260.11 kB |
| **EXEC-07** | Documentation lock refresh | All 8 gates confirmed clean (2026-04-07) |
