# Gate Baselines

**Version:** v0.1.0  
**Locked:** 2026-04-07 (EXEC-05 Documentation Lock)  
**HEAD commit:** `bd7cbdd` (docs(exec-04): CSS token integrity + specificity closure)

These baselines represent the verified system state at the end of EXEC-04 (before any code changes). All gates were re-run during EXEC-05 documentation lock phase and confirmed clean.

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
dist/assets/index-g2VCK6GM.css   47.68 kB │ gzip:  8.71 kB
dist/assets/index-D23UFLBH.js   254.24 kB │ gzip: 76.37 kB
```

**Artifacts:** 47 React modules bundled; no tree-shake warnings; no undefined imports.

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

**Source:** `reports/cto/wave-04/debt-register.md`  
**Actionable OPEN debts:** **0**  
**Total CLOSED:** 18  
**NOTED (non-blocking, no wave target):** 6  
**Meaning:** No technical debt requires remediation before feature development can proceed.

---

## Regression Thresholds

If any of the following regress, it constitutes a gate failure:

| Metric | Baseline | Failure Threshold |
|--------|----------|------------------|
| `cargo test --lib` pass count | 48 | < 48 |
| `cargo check` exit code | 0 | ≠ 0 |
| `npm run build` exit code | 0 | ≠ 0 |
| CSS size (build output) | 47.68 kB | > 55 kB (unexplained growth) |
| JS bundle size | 254.24 kB | > 280 kB (unexplained growth) |
| Undefined CSS token grep | 0 matches | > 0 matches |
| App.jsx LOC | 260 | > 300 (without approved domain extraction) |
| Actionable open debts | 0 | > 0 |

---

## Gate Run History

| Gate Run | Context | Result |
|----------|---------|--------|
| EXEC-03 | After useCleanup extraction | `cargo test` 48/48; `vite build` EXIT:0 |
| EXEC-04 | After CSS token repair | `cargo check` EXIT:0; undefined token grep 0 matches |
| **EXEC-05** | Documentation lock baseline | All 7 gates confirmed clean (re-run 2026-04-07) |
