# [EXEC-00] Split Backlog Proposal — AGent WinWin

> **Scan date:** 2026-04-06  
> **Scope:** Prioritized work items for future hardening waves following this read-only audit.  
> **Constraints:** No items below authorize any code change in Wave 00. All items are proposals for future waves.  
> Tags: FACT = measured | INFERENCE = deduced | ASSUMPTION = assumed

---

## Priority Legend

| Priority | Criteria |
|----------|----------|
| **P0** | CRITICAL classification AND runtime impact AND reviewability breakdown |
| **P1** | OVERSIZED with multiple responsibilities OR active props/coupling explosion |
| **P2** | WATCH with growth trajectory OR structural drift indicator |

---

## P0 Items

### P0-001 — `src/App.css` CSS mega-file decomposition

| Field | Value |
|-------|-------|
| **File** | `src/App.css` |
| **Severity** | CRITICAL (1,864 LOC) |
| **Reason** | 17+ distinct UI component style sections in one file; partial extraction to `styles/` already started but `App.css` was never cleared; style drift risk between `App.css` and `styles/*.css` modules |
| **Recommended Wave** | Wave 01 — CSS Architecture Stabilization |
| **Split Strategy First Cut** | (1) Audit overlap between `App.css` and each `styles/*.css` file; (2) Extract `:root` tokens → `styles/tokens.css`; (3) Strip sidebar duplication from `App.css` (already in `sidebar.css`); (4) Extract modals → `styles/modal.css`; (5) Extract button utilities → `styles/utilities.css`; (6) Leave `App.css` as layout+reset only (≤80 LOC) |
| **Risk Note** | Specificity chain may be order-dependent; do not reorder imports without visual regression check; start with additive extraction (new file, then remove from App.css, then test) |
| **Blocker** | Visual regression baseline must exist before wave start |

---

### P0-002 — `src-tauri/src/commands/deep_scan.rs` domain split

| Field | Value |
|-------|-------|
| **File** | `src-tauri/src/commands/deep_scan.rs` |
| **Severity** | CRITICAL (851 LOC) |
| **Reason** | Safety classification rules (business-critical domain logic) are co-located with zone catalog (pure data), scan algorithms (I/O operations), and the delete command. This mixing makes the safety boundary — the most important code in the product — unreviable and untestable in isolation |
| **Recommended Wave** | Wave 01 — Rust Command Layer Stabilization |
| **Split Strategy First Cut** | Expand `commands/deep_scan` into a sub-module folder: `types.rs` → `classify.rs` → `zones.rs` → `scan.rs` → `clean.rs` → `mod.rs` (wires public commands). Extraction order: types first, classify second (no deps), zones second, scan third (depends on types), clean fourth (depends on classify), mod last |
| **Risk Note** | `classify_path()` is called from both `deep_scan_drive_blocking` and `deep_clean_items` — must remain publicly accessible to both; do not make it private. `lib.rs` `generate_handler![]` paths must be updated. Cargo check after each sub-step. |
| **Blocker** | No unit tests for `classify_path` exist (INFERENCE); add at minimum 5–10 test cases for protected/safe/caution scenarios BEFORE splitting to ensure split doesn't silently break classification behavior |

---

## P1 Items

### P1-001 — `src/App.jsx` god-component extraction

| Field | Value |
|-------|-------|
| **File** | `src/App.jsx` |
| **Severity** | OVERSIZED (620 LOC), God-component |
| **Reason** | 26 useState + 8 useEffect + all API calls + all handlers + full render tree in one component; every feature touches this file; CleanupTab receives 30+ props as a symptom; testability of individual features is zero |
| **Recommended Wave** | Wave 02 — Frontend State Architecture |
| **Split Strategy First Cut** | Domain hook extraction (not context yet): `useApiKeys` → `useDeepScan` → `useChat` → `useSchedule` → `useCleanup` (in that dependency-isolation order). App.jsx step-by-step shrinks to layout+routing+shared state only. Context layer added only after hooks validated individually |
| **Risk Note** | `diskOverview` and `addToast` are cross-domain state — design context boundaries before extracting `useCleanup`. The `chatModel` / `chatProvider` state depends on `apiKeys` via `useEffect` — extract these last or as a combined `useChatConfig` hook |
| **Blocker** | Must have browser-level smoke test or at minimum manual staging checklist before each hook extraction to verify tab functionality not broken |

---

### P1-002 — `src/tabs/DeepScanTab.jsx` sub-component extraction

| Field | Value |
|-------|-------|
| **File** | `src/tabs/DeepScanTab.jsx` |
| **Severity** | OVERSIZED (512 LOC) |
| **Reason** | 3 sub-components (`ItemRow`, `SectionPanel`, `formatBytes`) defined inline; confirmation modal duplicates App.jsx modal pattern; formatBytes duplicates constants.js formatSize |
| **Recommended Wave** | Wave 02 — Frontend Component Extraction |
| **Split Strategy First Cut** | (1) Extract `formatBytes` → merge into `constants.js::formatSize`; (2) Extract `ItemRow` → `src/components/DeepScanItemRow.jsx`; (3) Extract `SectionPanel` → `src/components/DeepScanSection.jsx`; (4) Extract confirm modal → shared `src/components/ConfirmModal.jsx` (reusable with App.jsx); (5) Remaining tab = options + orchestration ≤150 LOC |
| **Risk Note** | `SectionPanel` uses `ItemRow` — extract `ItemRow` first; `ConfirmModal` extraction requires removing the inline modal from BOTH `App.jsx` and `DeepScanTab.jsx` in the same commit to avoid duplication; coordinate with P1-001 |
| **Blocker** | None blocking, but coordinate with P1-001 wave to avoid double-editing same files |

---

### P1-003 — `src-tauri/src/commands/cleanup.rs` responsibility separation

| Field | Value |
|-------|-------|
| **File** | `src-tauri/src/commands/cleanup.rs` |
| **Severity** | WATCH (369 LOC), 5 responsibilities, security boundary at risk |
| **Reason** | Security whitelist + command dispatch + path resolver + size estimator + zip backup all in one file; zip backup implementation (zip crate, file I/O, directory traversal) crowding out the security-critical whitelist guard |
| **Recommended Wave** | Wave 01 — Rust Command Layer Stabilization |
| **Split Strategy First Cut** | Extract zip backup → `commands/backup.rs`; move `get_paths_for_action` to shared path helper if multiple commands need it; keep `ALLOWED_ACTIONS`, `run_cleanup`, `execute_cleanup` in `cleanup.rs` (~100 LOC after extraction) |
| **Risk Note** | `zip_backup` uses `get_paths_for_action` — this function must remain accessible after move; either keep in `cleanup.rs` and import from `backup.rs`, or extract to `utils/paths.rs` |
| **Blocker** | None blocking |

---

## P2 Items

### P2-001 — `src/styles/deepscan.css` + `drivemodal.css` size watch

| Field | Value |
|-------|-------|
| **Files** | `styles/deepscan.css` (594 LOC), `styles/drivemodal.css` (514 LOC) |
| **Severity** | OVERSIZED |
| **Reason** | Both CSS files are larger than their corresponding JSX components; approaching maintainability threshold |
| **Recommended Wave** | Wave 02 — same wave as P1-002 (DeepScanTab split) |
| **Split Strategy First Cut** | After JSX sub-component extraction, split CSS to match: `deepscan-item.css`, `deepscan-summary.css` alongside `DeepScanItemRow` and `DeepScanSection` components; for `drivemodal.css` — audit after `App.css` modal rules also extracted in P0-001 |
| **Risk Note** | Do NOT split CSS before JSX split — splitting CSS alone gains nothing; deepscan CSS split only makes sense alongside P1-002 |
| **Blocker** | Blocked on P1-002 |

---

### P2-002 — `src-tauri/src/commands/drive_detail.rs` prefetch extraction

| Field | Value |
|-------|-------|
| **File** | `src-tauri/src/commands/drive_detail.rs` |
| **Severity** | WATCH (384 LOC), growth trajectory |
| **Reason** | Prefetch parser (scan_prefetch_apps, categorize_app, format_relative_time) is Windows-specific, non-trivial logic embedded in drive detail command; next feature request on prefetch (e.g., run count parsing from .pf binary header) will push this OVERSIZED |
| **Recommended Wave** | Wave 02 or Wave 03 |
| **Split Strategy First Cut** | Extract prefetch functions → `commands/prefetch.rs`; `drive_detail.rs` keeps `scan_top_folders` and `analyze_drive` (~200 LOC) |
| **Risk Note** | Low risk extraction; `categorize_app` is standalone; decouple after Wave 01 Rust stabilization |
| **Blocker** | None blocking; low urgency |

---

### P2-003 — `src-tauri/src/commands/settings.rs` external chat extraction

| Field | Value |
|-------|-------|
| **File** | `src-tauri/src/commands/settings.rs` |
| **Severity** | WATCH (320 LOC), growth trajectory |
| **Reason** | External AI chat dispatch currently embeds provider-specific HTTP logic; each new AI provider adds conditionals; will become OVERSIZED with 2 more providers |
| **Recommended Wave** | Wave 03 — AI Integration Layer |
| **Split Strategy First Cut** | Extract `chat_external` HTTP dispatch → `commands/ai_external.rs`; settings.rs keeps API key CRUD + first-run flag (~150 LOC) |
| **Risk Note** | `ai_external` needs access to saved API keys — ensure secure key retrieval path is not broken; extract after API key CRUD is stable |
| **Blocker** | None blocking; low urgency |

---

### P2-004 — `src/styles/base.css` design-token drift

| Field | Value |
|-------|-------|
| **File** | `src/styles/base.css` |
| **Severity** | WATCH (330 LOC) |
| **Reason** | `App.css` defines `:root` CSS custom properties AND `base.css` also defines base utilities; both are imported. As the design system grows, token definition may drift between the two files creating inconsistency |
| **Recommended Wave** | Wave 01 — CSS Architecture Stabilization (same as P0-001) |
| **Split Strategy First Cut** | During P0-001, establish single token source: all `:root {}` variables in `styles/tokens.css`; `base.css` keeps layout base only; `App.css` removes duplicates |
| **Risk Note** | Order of CSS import matters for custom property inheritance; standardize import order in `App.jsx` during this wave |
| **Blocker** | Blocked on P0-001 proceeding first |

---

### P2-005 — `formatBytes` / `formatSize` duplication

| Field | Value |
|-------|-------|
| **Location** | `src/tabs/DeepScanTab.jsx::formatBytes` (inline) and `src/constants.js::formatSize` |
| **Severity** | WATCH — low risk today, grows if more components inline local formatters |
| **Reason** | Two near-identical byte formatting functions in same codebase; if they diverge (e.g., different precision), UI will show inconsistent sizes |
| **Recommended Wave** | Wave 02 — alongside P1-002 |
| **Split Strategy First Cut** | Unify to `constants.js::formatSize` (or extract to `src/utils/format.js`); remove inline `formatBytes` from `DeepScanTab.jsx` |
| **Risk Note** | Check exact threshold logic: `formatSize` in `constants.js` uses the same GB/MB/KB thresholds as `formatBytes` in `DeepScanTab.jsx` — should be identical substitution |
| **Blocker** | None |

---

## Wave Sequence Recommendation

```
Wave 00 (current) — READ-ONLY audit (this wave)
    ↓
Wave 01 — Rust Command Layer Stabilization
    → P0-002 deep_scan.rs split (types → classify → zones → scan → clean)
    → P1-003 cleanup.rs zip extraction
    → Add unit tests for classify_path before split
    → cargo check must pass at each intermediate step
    ↓
Wave 01b — CSS Architecture Stabilization
    → P0-001 App.css decomposition (tokens → sidebar → modal → utilities → cleanup)
    → P2-004 base.css token consolidation
    → Visual regression baseline capture before start
    ↓
Wave 02 — Frontend Component Architecture
    → P1-001 App.jsx god-component (hooks extraction: useApiKeys → useDeepScan → useChat → useSchedule → useCleanup)
    → P1-002 DeepScanTab.jsx sub-component extraction (ItemRow → SectionPanel → ConfirmModal)
    → P2-001 CSS split aligned with P1-002
    → P2-005 formatBytes unification
    ↓
Wave 03 — Advanced Modularization
    → P2-002 drive_detail prefetch extraction
    → P2-003 settings external chat extraction
    → Context layer for shared state (post-hooks stabilization)
    ↓
Wave 04 — Test Coverage
    → Unit tests for classify_path (domain rules)
    → Unit tests for cleanup whitelist
    → Component tests for ItemRow/SectionPanel
    → Hook tests for useCleanup/useDeepScan
```
