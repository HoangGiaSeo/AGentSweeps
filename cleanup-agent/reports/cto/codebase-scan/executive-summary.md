# [EXEC-00] Executive Summary — Global Codebase Size & Topology Scan

> **Project:** AGent WinWin (dev-cleanup-agent) v0.1.0  
> **Scan date:** 2026-04-06  
> **Wave:** 00 — Read-Only Audit (no code mutations performed)  
> **Repo:** `https://github.com/HoangGiaSeo/AGentSweeps.git`, branch `main`, HEAD `888dc37`

---

## 1. Scope Coverage (Gate 1 ✅)

| Item | Status |
|------|--------|
| Tracked handwritten source files scanned | **YES** — via `git ls-files` |
| Binary assets excluded | YES — icons, images, .exe |
| Generated files excluded | YES — Cargo.lock, package-lock.json, Tauri JSON schemas |
| Build artifacts excluded | YES — `src-tauri/target/` |
| Excluded paths documented | YES — see file-line-ranking.md §1 |
| Guardrail basis | **ASSUMPTION** — repo has no documented file-size standard; using ≤300 OK / 301–500 WATCH / 501–800 OVERSIZED / >800 CRITICAL |

---

## 2. Headline Numbers (FACT)

| Item | Count |
|------|-------|
| Total tracked handwritten source files | ~50 |
| CRITICAL files (>800 LOC) | **2** |
| OVERSIZED files (501–800 LOC) | **4** |
| WATCH files (301–500 LOC) | **7** |
| OK files (≤300 LOC) | **37+** |
| EXEMPT files (generated/binary/lockfile) | **10+** |
| Largest handwritten file | `App.css` — **1,864 LOC** |
| Second largest | `deep_scan.rs` — **851 LOC** |
| Primary god-component | `App.jsx` — **620 LOC**, 26 useState, 8 useEffect |

---

## 3. Repo Topology Snapshot (Gate 3 ✅)

| Property | Value |
|----------|-------|
| Repo type | Single-app monorepo |
| Runtime | Tauri 2 (Rust backend + React 18 frontend in webview) |
| IPC bridge | Tauri `invoke()` wrappers in `src/api.js`; 28 registered commands in `lib.rs` |
| Primary layers | UI React (src/) + Rust Commands (src-tauri/src/commands/) + Utils (src-tauri/src/utils/) |
| Frontend entrypoint | `src/main.jsx` → `<App />` |
| Backend entrypoint | `src-tauri/src/main.rs` → `lib::run()` |
| IPC surface registry | `src-tauri/src/lib.rs` (source of truth for all backend commands) |
| Safety rules source of truth | `deep_scan.rs::classify_path()` |
| AI provider source of truth | `src/constants.js::AI_PROVIDERS` |
| Cleanup whitelist source of truth | `cleanup.rs::ALLOWED_ACTIONS` |

---

## 4. Critical Findings (Gate 4 ✅, Gate 5 ✅)

### Finding 1 — `App.css` is a CSS mega-file (CRITICAL)
**FACT:** 1,864 LOC. 17+ distinct UI component sections in one file despite `styles/*.css` module files existing in parallel.  
**INFERENCE:** CSS split strategy was adopted mid-project but `App.css` was never cleared; style drift between `App.css` and `styles/*.css` is likely.  
**Risk:** Every UI PR creates edit collision risk; specificity chain may produce silent style bugs as merge occurs.

### Finding 2 — `deep_scan.rs` mixes safety rules with I/O code (CRITICAL)
**FACT:** 851 LOC, 6 distinct responsibilities including the safety classification function `classify_path()` which determines whether Windows system files can be deleted.  
**INFERENCE:** The safety boundary — the most product-critical logic — has zero test coverage and is co-located with scanning algorithms and the delete command.  
**Risk:** Any modification to scan algorithms carries risk of accidentally breaking safety classification. No test net.

### Finding 3 — `App.jsx` is a god-component (OVERSIZED)
**FACT:** 620 LOC, 26 `useState`, 8 `useEffect`, 14+ handlers, all API calls, all navigation routing.  
**FACT:** `CleanupTab.jsx` receives 30+ props — direct symptom of centralized state.  
**INFERENCE:** Every feature addition must touch App.jsx, creating growing edit collision risk and near-zero feature-level testability.

### Finding 4 — No unit tests anywhere (HIGH)
**INFERENCE** (from codebase scan — no test files in `git ls-files` output): No `#[cfg(test)]` test files exist in Rust; no `.test.jsx` or `.spec.js` files in frontend.  
**Risk:** This blocks safe refactoring of all CRITICAL and OVERSIZED files. The `classify_path()` safety function cannot be safely moved without test coverage. This is the highest-priority prerequisite for Wave 01.

### Finding 5 — CSS design token split (MEDIUM)
**FACT:** CSS custom properties defined in `App.css::root {}` appear to overlap with `styles/base.css`.  
**INFERENCE:** No single source of truth for design tokens.

---

## 5. Structural Risks (Gate 4 ✅)

| Risk | Location | Severity | Type |
|------|----------|----------|------|
| God-component — all state, all logic | `App.jsx` | HIGH | Architecture |
| CSS mega-file — 17+ sections, never decomposed | `App.css` | CRITICAL | Maintainability |
| Safety domain rules co-located with I/O | `deep_scan.rs` | CRITICAL | Security/Correctness |
| Security whitelist mixed with backup code | `cleanup.rs` | HIGH | Security |
| Props explosion (30+ props) | `CleanupTab.jsx` | HIGH | Coupling |
| Inline sub-components not extractable | `DeepScanTab.jsx` | MEDIUM | Reusability |
| Duplicate formatBytes / formatSize | `DeepScanTab.jsx` + `constants.js` | LOW | Consistency |
| Zone catalog hardcoded in Rust source | `deep_scan.rs` | MEDIUM | Extensibility |
| No typed error hierarchy | All Rust commands | LOW | Robustness |
| No test coverage | Entire codebase | HIGH | Safety net |
| CSS strategies inconsistent | `App.css` vs `styles/` | MEDIUM | Drift |
| Design tokens not consolidated | `App.css` + `base.css` | MEDIUM | Drift |

---

## 6. Split Backlog Summary (Gate 4 ✅, Gate 6 ✅)

| Priority | ID | Target | Wave |
|----------|----|--------|------|
| **P0** | P0-001 | `App.css` decomposition into 6+ component CSS files | Wave 01b |
| **P0** | P0-002 | `deep_scan.rs` → sub-module split: types / classify / zones / scan / clean | Wave 01 |
| **P1** | P1-001 | `App.jsx` → domain hook extraction (useApiKeys, useDeepScan, useChat, useSchedule, useCleanup) | Wave 02 |
| **P1** | P1-002 | `DeepScanTab.jsx` → extract ItemRow, SectionPanel, ConfirmModal | Wave 02 |
| **P1** | P1-003 | `cleanup.rs` → extract zip backup to `backup.rs` | Wave 01 |
| **P2** | P2-001 | `deepscan.css` / `drivemodal.css` split (after JSX split) | Wave 02 |
| **P2** | P2-002 | `drive_detail.rs` → extract prefetch parser | Wave 02/03 |
| **P2** | P2-003 | `settings.rs` → extract external chat dispatch | Wave 03 |
| **P2** | P2-004 | `base.css` — design token consolidation | Wave 01b |
| **P2** | P2-005 | Unify formatBytes → formatSize | Wave 02 |

---

## 7. Debt Register Summary (Gate 6 ✅)

15 debt items registered across: CSS architecture (DEBT-001, 013), Rust domain model (DEBT-002, 014), Frontend architecture (DEBT-003, 005, 009), Security boundary (DEBT-004), Component coupling (DEBT-005, 006), Test coverage (DEBT-008), Data hardcoding (DEBT-011), Error handling (DEBT-012), Documentation (DEBT-015).

**Critical dependency chain:**
```
DEBT-008 (no tests) → DEBT-002 (deep_scan split)
DEBT-003 (App.jsx) → DEBT-005 (CleanupTab props)
DEBT-006 (DeepScanTab) → DEBT-007 (deepscan.css split)
```

---

## 8. Gate Verification

| Gate | Description | Status |
|------|-------------|--------|
| Gate 1 | Full handwritten source scanned; exclusions documented | ✅ PASS |
| Gate 2 | Global top-50 ranking + per-module top-10 rankings | ✅ PASS |
| Gate 3 | Topology overview with entrypoints, layers, SOT zones | ✅ PASS |
| Gate 4 | Every OVERSIZED/CRITICAL file has triage note + split direction | ✅ PASS |
| Gate 5 | FACT / INFERENCE / ASSUMPTION tagged throughout | ✅ PASS |
| Gate 6 | Debt register seeded (15 items) | ✅ PASS |
| Gate 7 | No code mutations in this wave | ✅ PASS — READ-ONLY |
| Gate 8 | No full-pass claim made; verdict is FOUNDATION | ✅ PASS |

---

## 9. Verdict

**Overall Hardening Readiness: FOUNDATION**

- The product is functionally operational (all features shipped, performance optimized in Phase 11)
- The structural foundation is **uneven**: the runtime is stable but the codebase has two CRITICAL files, four OVERSIZED files, and zero test coverage — meaning no safe refactoring net exists
- Each of the 2 CRITICAL files is on a different axis: `App.css` is a maintainability risk; `deep_scan.rs` is a safety-correctness risk
- The god-component pattern in `App.jsx` is the primary scaling blocker for frontend development velocity

**Cannot claim Production Adoption or Full Pass** because: evidence shows structural debt that creates real risk on the next feature addition, and no test coverage exists for the safety-critical domain rules.

---

## 10. Recommended Next Waves

| Wave | Focus | Prerequisite |
|------|-------|-------------|
| **Wave 01** | Rust Command Layer Stabilization (`deep_scan.rs` split, `cleanup.rs` extraction) | Add `classify_path` unit tests BEFORE splitting deep_scan.rs |
| **Wave 01b** | CSS Architecture Stabilization (`App.css` decomposition, design token consolidation) | Capture visual regression baseline before starting |
| **Wave 02** | Frontend Component Architecture (App.jsx hooks, DeepScanTab sub-components) | Wave 01 Rust split must be stable so App.jsx changes don't cascade into Rust |
| **Wave 03** | Advanced Modularization (prefetch, external chat, error types) | Wave 02 complete |
| **Wave 04** | Test Coverage (classify_path unit tests, component tests, hook tests) | Can partially start Wave 04 before Wave 01 for classify_path tests specifically |

---

*Report generated by EXEC-00 Hardening Wave — Read-Only Audit. No source mutations made.*  
*Deliverables: file-line-ranking.md | project-topology-overview.md | oversized-file-triage.md | split-backlog.md | debt-register.md | executive-summary.md*
