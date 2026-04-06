# EXEC-01 — Rust Command Layer Stabilization Report

**Date:** 2025-07-12  
**Wave:** 01 — Rust Hardening  
**Status:** ✅ COMPLETE

---

## Objectives

| # | Objective | Result |
|---|-----------|--------|
| 1 | Add safety net (unit tests) for `classify_path()` BEFORE any structural change | ✅ 23 tests passing |
| 2 | Split `deep_scan.rs` (851 LOC, CRITICAL) into focused sub-modules | ✅ 6 sub-modules created |
| 3 | Extract zip-backup from `cleanup.rs` into dedicated `backup.rs` | ✅ Extracted |
| 4 | Preserve all IPC command names and signatures | ✅ Zero IPC changes |
| 5 | `cargo check` + `cargo test` green after every structural step | ✅ All green |

---

## GATE 1 — Safety Net (classify_path tests)

Tests were added to `deep_scan.rs` first, confirmed passing on the flat file, then migrated into `classify.rs` as part of the split.

**Test groups:**
- **Group A** — Protected Windows paths (System32, SysWOW64, WinSxS, Program Files) — 4 tests
- **Group B** — Protected system files (pagefile.sys, hiberfil.sys, bootmgr) — 3 tests
- **Group C** — Windows-dir driver/dll extensions (.sys, .dll) — 2 tests
- **Group D** — Safe deletable zones (Temp, npm-cache, pip, Cargo, VSCode, Chrome, Prefetch, CrashDumps, Recycle Bin) — 9 tests
- **Group E** — Caution zones (node_modules, build/, unknown paths) — 3 tests
- **Group F** — Safety re-check behavior (slash normalization, protected ≠ deletable) — 2 tests

**Total: 23 tests — 23 pass, 0 fail**

---

## GATE 2 — Module Split

### Before

```
src-tauri/src/commands/deep_scan.rs   851 LOC   CRITICAL
```

### After

```
src-tauri/src/commands/deep_scan/
  mod.rs       156 LOC  — public commands + blocking orchestrator
  types.rs      45 LOC  — DeepScanItem, DeepScanOptions, DriveAnalysis, DeepCleanResult
  classify.rs  267 LOC  — PROTECTED_SEGMENTS, PROTECTED_FILES, classify_path() + 23 tests
  zones.rs      75 LOC  — get_scan_zones() (33-zone catalog)
  scan.rs      293 LOC  — helpers + scan_large_files, scan_old_downloads, scan_build_artifacts, scan_browser_profiles
  clean.rs      68 LOC  — deep_clean_items command (safety re-check before every deletion)
```

**Total sub-module LOC: ~904** (includes tests — no logic was added)

### Module Dependency Graph

```
mod.rs
├── types.rs     (no internal deps)
├── classify.rs  (no internal deps)
├── zones.rs     (no internal deps)
├── scan.rs      ← types.rs
├── clean.rs     ← types.rs, classify.rs, scan.rs
└── (orchestrator body) ← zones.rs, scan.rs, types.rs
```

### IPC Re-export

`deep_clean_items` is defined in `clean.rs` with `#[tauri::command]`. Both the function and the Tauri command metadata helper are re-exported from `mod.rs`:

```rust
pub use clean::deep_clean_items;
pub use clean::__cmd__deep_clean_items;
```

This preserves the `commands::deep_scan::deep_clean_items` path in `lib.rs` with zero changes.

---

## GATE 3 — Zip Backup Extraction

### Before

`cleanup.rs` — 369 LOC containing: cleanup logic, path resolver, size estimator, **AND** zip backup.

### After

| File | Contents |
|------|----------|
| `commands/cleanup.rs` | ALLOWED_ACTIONS, run_cleanup, execute_cleanup, get_paths_for_action, estimate_cleanup_size |
| `commands/backup.rs`  | ZipResult, get_backup_dir, collect_files_recursive, zip_backup |

`backup.rs` imports `get_paths_for_action` from `super::cleanup` — the path resolver stays in `cleanup.rs` since both `estimate_cleanup_size` and `zip_backup` use it.

### lib.rs Change

```rust
// Before:
commands::cleanup::zip_backup,

// After:
commands::backup::zip_backup,
```

All other 27 handler entries unchanged.

---

## Evidence Summary

```
cargo check EXIT:0   ✅
cargo test  23/23    ✅   (commands::deep_scan::classify::tests::*)
IPC surface UNCHANGED ✅  (verified against lib.rs generate_handler![])
cleanup.rs  LOC: 369 → 237  (-132 LOC removed to backup.rs)
deep_scan   LOC: 851 → 0 + 6 sub-modules
```
