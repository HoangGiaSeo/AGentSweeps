# [EXEC-00] Oversized / Critical File Triage — AGent WinWin

> **Scan date:** 2026-04-06  
> Covers all files classified CRITICAL or OVERSIZED, plus all WATCH files with elevated risk.  
> Tags: FACT = measured | INFERENCE = deduced | ASSUMPTION = assumed

---

## CRITICAL-1: `src/App.css`

| Metric | Value |
|--------|-------|
| **Path** | `src/App.css` |
| **LOC** | 1,864 raw / 1,639 non-empty |
| **Bytes** | 38,268 |
| **Language** | CSS |
| **Classification** | **CRITICAL** |
| **Generated?** | No |
| **Runtime Critical?** | Yes — loaded on every app load |

### Current Responsibilities (FACT — read file)

1. **CSS design tokens / variables** (`:root {}`, ~40 CSS custom properties)
2. **Flat CSS reset** (`*, *::before, *::after`)
3. **Page layout** (`.app`, `.main-content`, `.page`, `.page-title`)
4. **Toast notification system** (`.toast-container`, `.toast`, variants, keyframe animations)
5. **Sidebar** (`.sidebar`, `.sidebar-brand`, `.sidebar-tab`, `.sidebar-footer`, `.ollama-indicator`)
6. **Loading overlay + spinner** (`.loading-overlay`, `.loading-spinner`, `@keyframes spin`)
7. **Section cards** (`.section`, `.section-title`, `.section-header`, `.section-badge`)
8. **Disk cards** (`.disk-grid`, `.disk-card`, `.disk-bar-track`, `.disk-bar-fill`, etc.)
9. **Status cards** (`.status-card`, `.status-online/offline`, `.model-list`, `.model-badge`)
10. **Help box** (`.help-box`, `.help-title`, `.help-steps`)
11. **Quick-action buttons** (`.quick-actions`, `.action-btn` variants)
12. **Mode bar + Cleanup mode bar** (`.mode-bar`, `.cleanup-mode-bar`)
13. **Generic buttons** (`.btn` and all 8 variants)
14. **Scan result cards** (`.scan-grid`, `.scan-card`, `.scan-name`, `.scan-size`, `.scan-path`)
15. **AI action cards** (`.ai-actions`, `.action-card`, `.action-label`, `.badge`, `.action-reason`)
16. **Modals** (`.modal-overlay`, `.modal`, `.confirm-list`, `.confirm-note`, `.modal-buttons`)
17. **... and at minimum 15 more UI sections** (cleanup results, schedule, history entries, space-saved banners, progress bars, inputs, selects, forms, etc.)

**Note:** Many of these concern components that ALREADY have their own `styles/*.css` file (e.g., `sidebar.css` exists AND sidebar styles are in `App.css`). INFERENCE: `App.css` predates the per-component split strategy and was never cleared.

### Why Oversized Matters

- **Edit collision risk: HIGH** — every UI feature change touches this file; multiple features in flight simultaneously → merge conflicts
- **Reviewability: POOR** — a 1,864-line CSS PR diff is unreviable
- **Style drift risk: HIGH** — duplicate class names between `App.css` and `styles/*.css` → specificity bugs
- **Testability: N/A for CSS** — but discoverability is low; finding which selector governs an element requires searching 1,864 lines

### Split Recommendation

Do NOT split by arbitrary LOC threshold. Split along component/scope boundary:

| Phase | Action |
|-------|--------|
| 1 (safe-first) | Audit which sections in `App.css` duplicate what's already in `styles/*.css`; remove duplicates from `App.css` first before adding new files |
| 2 | Extract `:root` design tokens → `styles/tokens.css` (import before everything else) |
| 3 | Extract layout + reset → keep in `App.css` (~50 lines) |
| 4 | Extract toast → already has `styles/toast.css` → move remaining toast rules there |
| 5 | Extract sidebar rules → `styles/sidebar.css` (already exists) |
| 6 | Extract modal rules → `styles/modal.css` (new file) |
| 7 | Extract btn/form utilities → `styles/utilities.css` (new file) |
| 8 | Each remaining section → to its corresponding tab CSS file |

**Target:** `App.css` should end at ≤80 lines (CSS entry: import + layout root only).

### Blockers / Cautions

- ASSUMPTION: there may be specificity dependencies between `App.css` and `styles/*.css` that are not safe to reorder without testing
- Do NOT split `App.css` until a visual regression test baseline is captured
- Confirm: does `index.css` or `main.jsx` import order matter? (Currently `App.css` is imported inside `App.jsx`)

---

## CRITICAL-2: `src-tauri/src/commands/deep_scan.rs`

| Metric | Value |
|--------|-------|
| **Path** | `src-tauri/src/commands/deep_scan.rs` |
| **LOC** | 851 raw / 789 non-empty |
| **Bytes** | 36,174 |
| **Language** | Rust |
| **Classification** | **CRITICAL** |
| **Generated?** | No |
| **Runtime Critical?** | YES — deep scan + delete are primary product features |

### Current Responsibilities (FACT — read file)

1. **Data structures** — `DeepScanItem`, `DeepScanOptions`, `DriveAnalysis`, `DeepCleanResult` (lines 1–55)
2. **Safety classification engine** — `classify_path()` with `PROTECTED_SEGMENTS` and `PROTECTED_FILES` constants (lines 60–230) — this is the core domain rule that determines what can or cannot be deleted
3. **Known-zone catalog** — `get_scan_zones()` returning 30+ hardcoded zone definitions (lines 260–340)
4. **Scanning algorithm — large files** — `scan_large_files()` with budget+deadline (lines 345–415)
5. **Scanning algorithm — old downloads** — `scan_old_downloads()` (lines 417–460)
6. **Scanning algorithm — build artifacts** — `scan_build_artifacts()` with budget+deadline (lines 462–545)
7. **Scanning algorithm — browser profiles** — `scan_browser_profiles()` (lines 680–735)
8. **Main async command wrapper** — `deep_scan_drive()` → `deep_scan_drive_blocking()` (lines 548–680)
9. **Deletion command** — `deep_clean_items()` with safety re-check guard (lines 737–782)

### Why Oversized Matters

- **6 distinct responsibilities** in one file — violates single-responsibility at module level
- **Safety classification logic** (responsibility 2) is the most business-critical code in the entire app. It currently lives co-located with I/O scanning and deletion. If it needs to change (e.g., new Windows protected path), the edit is in the same file as algorithms, increasing risk of accidental regression
- **Zone catalog** (responsibility 3) is pure data (30+ string tuples) but embedded inside a scan command file — it cannot be updated by product owners without modifying Rust source
- **Fan-in risk:** `deep_clean_items` re-calls `classify_path` for safety guard; if `classify_path` is moved, the deletion guard must follow — currently invisible coupling
- **Testability:** Both classification rules and scan algorithms need unit tests; having them together makes test file organization confusing

### Split Recommendation

Split by domain boundary, NOT by LOC:

| Proposed File | Content | Safe Order |
|---------------|---------|------------|
| `commands/deep_scan/mod.rs` | Public command functions only (`deep_scan_drive`, `deep_clean_items`) | Last |
| `commands/deep_scan/types.rs` | All `#[derive(Serialize/Deserialize)]` structs | First |
| `commands/deep_scan/classify.rs` | `classify_path()`, `PROTECTED_SEGMENTS`, `PROTECTED_FILES` | Second (used by mod.rs + clean.rs) |
| `commands/deep_scan/zones.rs` | `get_scan_zones()` — pure data, no I/O | Second |
| `commands/deep_scan/scan.rs` | `scan_large_files`, `scan_old_downloads`, `scan_build_artifacts`, `scan_browser_profiles` | Third |
| `commands/deep_scan/clean.rs` | `deep_clean_items` + re-check via `classify` | Fourth |

**Safe-first extraction order:** types → classify + zones → scanners → clean → mod wire-up

### Blockers / Cautions

- `classify_path` is called by BOTH `deep_scan_drive_blocking` AND `deep_clean_items` — it must remain accessible to both after split; exported from `classify.rs`
- `get_folder_size_bounded` helper (defined in this file) should also move to scan helpers or be hoisted to `utils/`
- Do NOT split until cargo test coverage is added for `classify_path` — this is the safety guard of the product
- `lib.rs` `generate_handler![]` must be updated after split: `commands::deep_scan::deep_scan_drive` path may change

---

## OVERSIZED-1: `src/App.jsx`

| Metric | Value |
|--------|-------|
| **Path** | `src/App.jsx` |
| **LOC** | 620 raw / 573 non-empty |
| **Bytes** | 24,589 |
| **Language** | JSX (React 18) |
| **Classification** | **OVERSIZED** |
| **Generated?** | No |
| **Runtime Critical?** | YES — root component, mounts on every page load |

### Current Responsibilities (FACT — read file)

1. **All application state** — 26 `useState` declarations covering: disk data, scan mode, AI results, cleanup state, chat state, API keys, schedule config, deep scan results, modal state, toast system
2. **Side effects / initialization** — 8 `useEffect` blocks: initial dashboard load, first-run check, API key load, AI provider auto-switch, schedule load, schedule interval timer, chat model selection, history tab load
3. **All API calls** — 18+ async operations wired from handlers
4. **All event handlers** — 14 handler functions (handleScan, triggerAI, executeCleanup, handleDeepScan, handleDeepClean, handleDriveClick, sendChatMessage, handleSaveApiKey, handleZipBackup, etc.)
5. **Navigation / routing** — `tab` state + `setTab` pass-down
6. **Render tree** — JSX for sidebar, toast overlay, loading overlay, confirmation modal, tab routing, component mounting
7. **Props assembly** — assembles 30+ prop packages for `CleanupTab`, multiple props for all other tabs

### Why Oversized Matters

- **God-component anti-pattern** — every new feature adds state, effects, and handlers here
- **Props explosion** — `CleanupTab` receives 30+ props; this signals that the state boundaries are wrong
- **Edit collision risk: VERY HIGH** — all current and future features touch this file
- **No separation of concerns** — business logic, API calls, initialization, and render are all in one function body
- **Testability: VERY LOW** — cannot test individual features (chat logic, cleanup logic, deep scan logic) without mounting the entire App

### Split Recommendation — Adapter/Facade-first, not big-bang

| Phase | Action | Risk |
|-------|--------|------|
| 1 (safe-first) | Extract `useApiKeys` hook (getApiKeys, saveApiKey, removeApiKey, test, toggle handlers) | Low — localized state |
| 2 | Extract `useCleanup` hook (scanData, aiResult, selectedActions, handleScan, triggerAI, executeCleanup + estimates) | Medium — shares disk data with dashboard |
| 3 | Extract `useDeepScan` hook (deepScanResult, handleDeepScan, handleDeepClean) | Low — isolated state |
| 4 | Extract `useChat` hook (chatMessages, chatInput, chatLoading, sendChatMessage, clearChat, provider logic) | Low — isolated state |
| 5 | Extract `useSchedule` hook | Low — isolated state |
| 6 | Create `CleanupContext` or `AppContext` for shared state (diskOverview, loading, addToast) | Medium — needs thought on boundaries |
| 7 | Simplify App.jsx to: context providers + top-level layout + tab routing only | Final — after all hooks extracted |

**Target:** App.jsx ≤ 150 lines (layout + routing only)

### Blockers / Cautions

- `diskOverview` is shared between dashboard (read) and cleanup (read) and deep scan (write on clean) — this cross-tab state requires careful context design before extraction
- The `addToast` function from `useToast` is called in 20+ places — must be available globally before extracting domain hooks

---

## OVERSIZED-2: `src/styles/deepscan.css`

| Metric | Value |
|--------|-------|
| **Path** | `src/styles/deepscan.css` |
| **LOC** | 594 raw / 514 non-empty |
| **Language** | CSS |
| **Classification** | **OVERSIZED** |
| **Generated?** | No |
| **Runtime Critical?** | Loaded when deep scan tab renders |

### Current Responsibilities

- All styles for `DeepScanTab.jsx`: header, options bar, summary cards, reclaimable banner, action bar, section panels, item rows, badges, category badges, age badges, check column, confirm modal, empty state, scanning indicator, clean results
- Mirrors the structural complexity of `DeepScanTab.jsx` (512 LOC, also OVERSIZED)

### Split Recommendation

- Extract item row styles → `deepscan-item.css` (or co-locate with ItemRow if ItemRow is extracted to its own file)
- Extract summary card styles → `deepscan-summary.css`
- This split only makes sense AFTER `DeepScanTab.jsx` is split — do CSS split in same wave
- **Do not split before the JSX split**; splitting CSS alone adds file count without reducing cognitive load

---

## OVERSIZED-3: `src/styles/drivemodal.css`

| Metric | Value |
|--------|-------|
| **Path** | `src/styles/drivemodal.css` |
| **LOC** | 514 raw / 449 non-empty |
| **Language** | CSS |
| **Classification** | **OVERSIZED** |
| **Generated?** | No |
| **Runtime Critical?** | Loaded when drive modal is triggered |

### Current Responsibilities

- All styles for `DriveModal.jsx` (259 LOC component) — a 2:1 CSS-to-JSX ratio
- Includes: modal overlay, modal panels, folder list, app activity list, loading skeleton, empty states, stat pills, scrollable lists

### Split Recommendation

- The CSS:JSX ratio of 2:1 is not inherently bad if the component is visually rich (DriveModal has cards, lists, charts-like stat display, scrollable areas)
- Primary concern: audit whether some of these styles belong in a shared `modal.css` utilities file after `App.css` modal rules are extracted
- Low priority split; address during App.css decomposition wave

---

## OVERSIZED-4: `src/tabs/DeepScanTab.jsx`

| Metric | Value |
|--------|-------|
| **Path** | `src/tabs/DeepScanTab.jsx` |
| **LOC** | 512 raw / 480 non-empty |
| **Language** | JSX |
| **Classification** | **OVERSIZED** |
| **Generated?** | No |
| **Runtime Critical?** | Yes — primary feature tab |

### Current Responsibilities (FACT — read file)

1. **Options UI** — scan option checkboxes + min-size select + scan button (~50 LOC)
2. **Scanning progress indicator** (~10 LOC)
3. **Summary cards** — safe/caution/protected stats (~25 LOC)
4. **Reclaimable banner** (~15 LOC)
5. **Action bar** — select/deselect controls + delete button (~35 LOC)
6. **`SectionPanel` sub-component** — collapsible section wrapper with header, safety dots, count badge, and item list (~45 LOC) — defined inline inside this file
7. **`ItemRow` sub-component** — single item display with checkbox, icon, name, path, reason, size, badges (~50 LOC) — defined inline inside this file
8. **`formatBytes` utility** — defined inline (~5 LOC)
9. **Delete confirmation modal** — full modal JSX inline (~40 LOC)
10. **Empty state** — two variants (initial + post-scan empty) (~20 LOC)
11. **Clean results list** (~25 LOC)

### Why Oversized Matters

- 3 sub-components embedded inline → not reusable, not individually testable, hard to navigate
- Confirmation modal JSX is duplicated (App.jsx also has a confirmation modal) — modal pattern not abstracted
- `formatBytes` utility defined inline — duplicates similar logic in `constants.js::formatSize`

### Split Recommendation

| Action | Target | Risk |
|--------|--------|------|
| Extract `ItemRow` → `src/components/DeepScanItemRow.jsx` | Isolated, no state | Low |
| Extract `SectionPanel` → `src/components/DeepScanSection.jsx` | Uses `ItemRow` | Low |
| Extract `formatBytes` → merge into `constants.js::formatSize` or `src/utils/format.js` | Shared utility | Low |
| Extract confirm modal → shared `<ConfirmModal />` component (also used in App.jsx) | Shared component | Medium |
| Remaining `DeepScanTab.jsx` → options + orchestration only | ~150 LOC target | Low |

---

## WATCH-1: `src-tauri/src/commands/cleanup.rs`

| LOC | Class | Runtime Critical |
|-----|-------|-----------------|
| 369 | WATCH | YES |

### Current Responsibilities (5 distinct — FACT)

1. Security whitelist enforcement (`ALLOWED_ACTIONS` const + guard)
2. Command dispatch + OS execution (`execute_cleanup`, `execute_dynamic_cleanup`)
3. Path resolution per action type (`get_paths_for_action`)
4. Size estimation (`estimate_cleanup_size`)
5. Zip backup creation (`zip_backup`, `collect_files_recursive`)

**Risk:** Whitelist guard (responsibility 1) is the security boundary of the cleanup feature. It lives co-located with the zip implementation and path resolution. A careless edit to add a new zip feature could inadvertently weaken the whitelist. These should be in separate scope at minimum.

**Recommendation (future wave):** Extract zip backup → `commands/backup.rs`. Extract path resolution → shared helper. Keep whitelist + dispatch together in `cleanup.rs`.

---

## WATCH-2: `src-tauri/src/commands/drive_detail.rs`

| LOC | Class | Runtime Critical |
|-----|-------|-----------------|
| 384 | WATCH | YES |

### Current Responsibilities (4 distinct — FACT)

1. Data structures (`FolderSizeItem`, `AppActivity`, `DriveDetailReport`)
2. Folder size scan with budget+deadline (`get_dir_size_and_count`, `scan_top_folders`)
3. App last-used times via Prefetch parsing (`scan_prefetch_apps`, `categorize_app`, `format_relative_time`)
4. Async command wrapper (`analyze_drive` + `spawn_blocking`)

**Risk:** Prefetch parsing (responsibility 3) is non-trivial Windows-specific logic; currently embedded in the drive detail command. If prefetch parsing needs to expand (e.g., parse actual run count from .pf binary), it will push this file OVERSIZED.

**Recommendation:** At 384 lines currently OK to hold but flag for extraction of prefetch logic → `commands/prefetch.rs` in a future wave.

---

## WATCH-3: `src-tauri/src/commands/settings.rs`

| LOC | Class | Runtime Critical |
|-----|-------|-----------------|
| 320 | WATCH | YES (AI keys + external chat) |

### Current Responsibilities

1. API key CRUD (load, save, remove from secure store or disk)
2. API key test + validation
3. External AI chat dispatch (Gemini, OpenAI, etc.)
4. First-run flag check + complete-setup command

**Risk:** External chat dispatch embeds HTTP client logic for multiple AI providers. Each new provider adds more logic here. Currently at 320 LOC, will become OVERSIZED when 2 more providers are added.

---

## WATCH-4: `src/tabs/CleanupTab.jsx`

| LOC | Class | Runtime Critical |
|-----|-------|-----------------|
| 425 | WATCH | YES |

### Current Responsibilities

- Scan mode bar (Quick/Deep/AI toggle)
- Scan results display (grouped by category)
- AI cleanup actions list
- Manual action checkboxes
- Select all/safe/none controls
- Cleanup result display
- Space-freed banner
- Schedule configuration UI (days, time, actions)
- Zip backup control
- Size estimation display

**Props explosion:** Receives 30+ props from `App.jsx`. This is the symptom of App.jsx owning all state; fixing CleanupTab's props count requires fixing App.jsx first.

**Note:** Currently WATCH but will cross OVERSIZED if schedule UI or zip UI grows by any feature.
