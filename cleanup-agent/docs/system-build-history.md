# System Build History

**Project:** AGent WinWin — Dev Cleanup Agent  
**Version:** v0.1.0  
**Stack:** Tauri 2 + React 18 + Vite 8 + Rust (stable/MSVC Windows)  
**Repository:** `https://github.com/HoangGiaSeo/AGentSweeps.git`, branch `main`  
**Locked:** 2026-04-07 (EXEC-05 Documentation Lock → refreshed EXEC-07)

---

## Wave Timeline

| Wave | Commit | Title | Date |
|------|--------|-------|------|
| Pre-wave | `888dc37` | perf: async spawn_blocking + deadline limits | pre-EXEC-00 |
| EXEC-00 | `fec0c10` | audit: global codebase scan + 6 CTO reports | 2026-04-07 |
| EXEC-01 | `29911da` | hardening: classify_path tests + deep_scan split + backup.rs | 2026-04-07 |
| EXEC-01R | `5b63921` | hardening: delete-guard + whitelist tests + 48 tests | 2026-04-07 |
| EXEC-01B | `adc9bfc` | hardening: CSS architecture stabilization | 2026-04-07 |
| EXEC-01C | `e77fccf` | hardening: retire App.css dead code (1642→9 LOC) | 2026-04-07 |
| EXEC-01D | `f80cd42` | hardening: quarantine rogue artifact + Rust tree lock | 2026-04-07 |
| EXEC-02 | `7e748cb` | feat: extract 4 domain hooks, App.jsx −43% | 2026-04-07 |
| EXEC-03 | `9acf4e7` | feat: extract useCleanup, App.jsx god-component CLOSED | 2026-04-07 |
| EXEC-04 | `bd7cbdd` | hardening: CSS token integrity + .btn-tiny specificity | 2026-04-07 |
| EXEC-05 | `ca4a9ff` | docs: Documentation Lock baseline (8 docs) | 2026-04-07 |
| EXEC-06 | `54557e1` | feat: Agentic Chat V1 — tool-augmented chat (64 tests) | 2026-04-07 |
| EXEC-06R | `57ab566` | fix: trigger-policy closure — runtime exclusion + D01 (71 tests) | 2026-04-07 |

---

## Wave Detail

### EXEC-00 — Audit Baseline

**Objective:** Global codebase topology scan. Identify all technical debts.  
**Verdict:** Foundation — 6 CTO audit reports generated.  
**Runtime Adoption:** N/A (read-only)  
**Files Touched:** Reports only (`reports/cto/wave-00/`)  
**Debt Delta:** DEBT-001 through DEBT-015 opened  
**Key Gates:**
- Identified App.jsx as 700 LOC god-component (37 useState, 26 handlers)
- Identified App.css as 1642 LOC dead-code artifact
- Identified 11 CSS files with undefined token references

---

### EXEC-01 — Rust Backend Split & test scaffolding

**Objective:** Split `deep_scan.rs` monolith into a proper sub-module tree. Add initial classify_path tests. Extract backup.rs.  
**Verdict:** Full Pass  
**Runtime Adoption:** Production (all Tauri commands operational)  
**Files Touched:**
- `src-tauri/src/commands/deep_scan/` (created: `mod.rs`, `classify.rs`, `types.rs`, `zones.rs`, `scan.rs`, `clean.rs`)
- `src-tauri/src/commands/backup.rs` (extracted from cleanup.rs)
- `src-tauri/src/commands/mod.rs` (updated pub mod list)
**Debt Delta:** DEBT-006 closed (deep scan mixed concerns)  
**Key Gates:**
- `cargo check` EXIT:0
- Sub-module tree compiles and paths resolve correctly

---

### EXEC-01R — Rust Security Hardening

**Objective:** Add delete-guard to `deep_clean_items`, whitelist enforcement tests, security closure.  
**Verdict:** Full Pass — 48 tests, 0 failed  
**Runtime Adoption:** Production  
**Files Touched:**
- `src-tauri/src/commands/deep_scan/clean.rs` (delete-guard + protected path check)
- `src-tauri/src/commands/cleanup.rs` (ALLOWED_ACTIONS whitelist constant)
- Added 48 unit tests across cleanup:: and deep_scan:: modules
**Debt Delta:** 0 opened; whitelist security closure formalized  
**Key Gates:**
- `cargo test --lib` → 48 passed, 0 failed
- Shell injection attempt → test_arbitrary_command_rejected: ok
- Protected path attempt → test_system32_path_is_blocked: ok

---

### EXEC-01B — CSS Architecture Stabilization

**Objective:** Extract CSS token SoT. Migrate selectors out of App.css into domain CSS files. Create modal.css, utilities.css.  
**Verdict:** Full Pass  
**Runtime Adoption:** Production  
**Files Touched:**
- `src/styles/tokens.css` (created — `:root` token SoT, 24 tokens)
- `src/styles/base.css` (reduced −53%)
- `src/styles/modal.css` (created)
- `src/styles/utilities.css` (created — `.btn` variants)
- `src/App.css` (reduced toward retirement)
**Debt Delta:** DEBT-002, DEBT-013 closed; DEBT-014, DEBT-015 opened (deferred)  
**Key Gates:**
- `vite build` EXIT:0, CSS size stable

**Correction note:** App.css at this point still had 1642 LOC. The audit initially categorized App.css as a "runtime hotspot". Subsequent EXEC-01C analysis confirmed App.css was a dead artifact — all its selectors had been migrated and it was not part of the live CSS cascade. The "runtime hotspot" label was inaccurate; correct label is "dead artifact requiring retirement".

---

### EXEC-01C — App.css Retirement

**Objective:** Retire App.css from 1642 LOC to a 9-LOC tombstone stub. Lock CSS ownership map.  
**Verdict:** Full Pass  
**Runtime Adoption:** Production  
**Files Touched:**
- `src/App.css` (1642 → 9 LOC: tombstone comment only, no active selectors)
- `src/styles/*.css` (ownership lock comments added)
**Debt Delta:** DEBT-001, DEBT-004, DEBT-016 closed  
**Key Gates:**
- `vite build` EXIT:0, CSS 47.99 kB
- No selector regressions confirmed

---

### EXEC-01D — Rust Tree Integrity Audit

**Objective:** Quarantine remaining rogue artifacts, fix JS Problems panel (3 items), lock Rust module tree.  
**Verdict:** Full Pass  
**Runtime Adoption:** Production  
**Files Touched:**
- `src-tauri/src/commands/` (quarantine of `deep_scan.rs` standalone artifact)
- `src-tauri/src/commands/mod.rs` (confirmed final module list)
- Frontend: 3 JS warning fixes (unused prop, useMemo dep, useEffect dep)
**Debt Delta:** DEBT-017..021 closed  
**Key Gates:**
- `cargo check` EXIT:0
- IDE Problems reduced

---

### EXEC-02 — Frontend State Architecture Foundation

**Objective:** Extract 4 domain hooks from App.jsx. Reduce App.jsx from ~700 to 397 LOC (−43%).  
**Verdict:** Full Pass  
**Runtime Adoption:** Production  
**Files Touched:**
- `src/hooks/useApiKeys.js` (created — API key CRUD domain)
- `src/hooks/useDeepScan.js` (created — deep scan/clean domain)
- `src/hooks/useChat.js` (created — chat domain)
- `src/hooks/useSchedule.js` (created — schedule domain)
- `src/App.jsx` (700 → 397 LOC; 37 → 22 useState; 26 → 13 handlers)
**Debt Delta:** DEBT-003 partial, DEBT-005 partial, DEBT-006 closed, DEBT-010 closed; DEBT-023 opened (cleanup extraction blocked)  
**Key Gates:**
- `vite build` EXIT:0, 47 modules, JS 254.24 kB
- All 4 hooks imported and bundled

---

### EXEC-03 — Cleanup Domain Extraction + Prop-Coupling Closure

**Objective:** Extract the cleanup domain (13 state atoms, computed, 11 handlers) from App.jsx into `useCleanup.js`. Close god-component debt. Reduce `CleanupTab` from 33 to 4 props.  
**Verdict:** Full Pass — 10/10 gates  
**Runtime Adoption:** Production  
**Files Touched:**
- `src/hooks/useCleanup.js` (created — 206 LOC)
- `src/App.jsx` (397 → 260 LOC; 22 → 9 useState; 13 → 5 handlers)
- `src/tabs/CleanupTab.jsx` (33 props → 4 props)
**Debt Delta:** DEBT-003, DEBT-005, DEBT-009, DEBT-023 closed; 0 opened  
**Key Gates:**
- App.jsx: 260 LOC, 9 useState, 5 handlers — no domain state remains
- CleanupTab: 4 props (cleanup, scheduleBundle, loading, ollamaStatus)
- `vite build` EXIT:0, JS 254.24 kB unchanged

---

### EXEC-04 — CSS Token Integrity + Specificity Cleanup

**Objective:** Close last two open CSS debts: DEBT-014 (undefined token references) and DEBT-015 (.btn-tiny cascade bleed).  
**Verdict:** Full Pass — 8/8 gates  
**Runtime Adoption:** Production  
**Files Touched:**
- `src/styles/tokens.css` (24 → 26 tokens; `--blue: #3b82f6`, `--blue-hover: #2563eb` added)
- `src/styles/chat.css` (5× `--surface` → `--bg-card`)
- `src/styles/cleanup.css` (3× undefined token remaps)
- `src/styles/settings.css` (7× undefined token remaps + `.btn-tiny` scoped)
- `src/styles/deepscan.css` (~32× undefined token remaps)
- `src/styles/drivemodal.css` (~29× undefined token remaps)
- `src/styles/utilities.css` (CASCADE NOTE updated)
- `reports/cto/wave-04/` (4 reports)
**Debt Delta:** DEBT-014, DEBT-015 closed; 0 opened; **all actionable debt = 0**  
**Key Gates:**
- Undefined token grep → 0 matches
- `.btn-tiny` scoped to `.api-key-actions .btn-tiny` in settings.css
- `vite build` EXIT:0, CSS 47.68 kB, JS 254.24 kB

---

## Cumulative Gate Summary

| Gate | Baseline | Current Status |
|------|----------|---------------|
| `cargo check` | EXEC-01 | ✅ EXIT:0 |
| `cargo test --lib` | EXEC-01R | ✅ 48/48 pass |
| `vite build` | EXEC-01B | ✅ EXIT:0, JS 260.11 kB, CSS 49.15 kB |
| Undefined CSS tokens | EXEC-04 | ✅ 0 references |
| Open actionable debt | EXEC-06R | ✅ 0 debts (D01 closed EXEC-06R; D02–D06 carry Low) |
| App.jsx LOC | EXEC-03 | ✅ 260 LOC |
| Domain hooks | EXEC-03 | ✅ 6 hooks (all feature state owned externally) |
| Vitest unit tests | EXEC-06 | ✅ 71/71 pass |

---

### EXEC-05 — Documentation Lock (Baseline Snapshot)

**Objective:** Lock all architecture and state documentation after EXEC-04 hardening cycle.  
**Verdict:** Documentation Lock — system baseline locked  
**Runtime Adoption:** N/A (docs only)  
**Files Touched:** 8 docs created in `docs/`:
`system-build-history.md`, `current-system-map.md`, `frontend-state-ownership-map.md`,
`backend-command-runtime-map.md`, `design-system-ownership-map.md`,
`open-debt-register.md`, `gate-baselines.md`, `documentation-lock-summary.md`  
**Debt Delta:** 0 opened; 0 closed  
**Key Gates:**
- All 7 gate baselines confirmed clean
- Tauri command count corrected: 28 (scan) → 27 (verified)

---

### EXEC-06 — Agentic Chat V1

**Objective:** Implement tool-augmented chat: 2 read-only tools (disk_overview, cleanup_log) with locked V1 keyword allowlist, freshness policy, mandatory redaction pipeline, context composition, and ToolBubble UI.  
**Verdict:** Initially PARTIAL PASS (Gate 2 gap — trigger policy documentation only) → raised to FULL PASS after EXEC-06R  
**Runtime Adoption:** Production — `useChat.js` rewritten; runtime path uses tools; ChatTab ToolBubble live  
**Files Touched (new):**
- `src/hooks/chatTools/toolRegistry.js` — AGENT_TOOLS V1 locked allowlist
- `src/hooks/chatTools/intentDetector.js` — `detectTools()`, `isForceRefresh()`
- `src/hooks/chatTools/freshnessPolicy.js` — `evaluateDiskCacheDecision()`, `evaluateFreshFetchFallback()`
- `src/hooks/chatTools/redactionPipeline.js` — `redactLogEntry()`, `formatRedactedLog()`, `containsPathLikeContent()`
- `src/hooks/chatTools/contextComposer.js` — `composeDiskContext()`, `composeLogContext()`, `buildEnrichedMessage()`
- `src/hooks/__tests__/useChat.agentic.test.js` — 64 unit tests (U01–U15)
- `reports/cto/wave-06/` (6 deliverables)

**Files Touched (modified):**
- `src/hooks/useChat.js` (full rewrite — 219 LOC; adds tool orchestration, diskCacheRef, providerRef, toolStatus)
- `src/tabs/ChatTab.jsx` (ToolBubble component added; role:"tool" renderer; toolStatus prop)
- `src/styles/chat.css` (+1.47 kB tool bubble styles; 47.68 → 49.15 kB)
- `src/App.jsx` (2-line wiring: toolStatus destructure + prop)
- `src/constants.js` (CHAT_SUGGESTIONS updated to trigger tool-matched phrases)
- `vite.config.js` (vitest test config)
- `package.json` (test scripts)

**Debt Delta:** D01–D06 opened (all Low — see EXEC-06R debt register)  
**Key Gates:**
- 64/64 unit tests PASS (vitest, first use)
- `npm run build` EXIT:0, CSS 49.15 kB / JS 260.07 kB
- No destructive IPC in chat — `useChat.js` imports only `getDiskOverview`, `getCleanupLog`
- External provider safety gate: `containsPathLikeContent()` blocks raw log injection
- Smoke evidence S01–S05 code-path verified

---

### EXEC-06R — Trigger-Policy Closure (Hardening)

**Objective:** Close EXEC-06 Partial Pass gap:  
(1) implement `excludedFromKeywords` in runtime (was documentation only),  
(2) narrow `"log"` keyword to `"cleanup log"` to close D01 false positive,  
(3) fix `toolRegistry.js` excluded terms that would cause false negatives.  
**Verdict:** Full Pass — 8/8 gates; EXEC-06 raised to Full Pass  
**Runtime Adoption:** Production (trigger policy change in live decision path)  
**Files Touched:**
- `src/hooks/chatTools/intentDetector.js` — `detectTools()` now checks `excludedFromKeywords` at runtime
- `src/hooks/chatTools/toolRegistry.js` — "log"→"cleanup log"; disk_overview excluded cleared; "xóa" removed from cleanup_log excluded
- `src/hooks/__tests__/useChat.agentic.test.js` — U04.test5 updated; U16 group added (7 tests)
- `reports/cto/wave-06r/` (4 deliverables)

**Debt Delta:** D01 CLOSED; D02–D06 carry as Low  
**Key Gates:**
- 71/71 unit tests PASS (64 prior + 7 new)
- `npm run build` EXIT:0, CSS 49.15 kB / JS 260.11 kB (+0.04 kB)
- `detectTools("show application log")` → `[]` — D01 false positive eliminated
- Runtime exclusion: `detectTools("lần trước nhanh hơn?")` → `[]` — exclusion mechanism active
