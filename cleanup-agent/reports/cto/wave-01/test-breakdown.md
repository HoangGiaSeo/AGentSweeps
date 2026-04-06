# EXEC-01 — Test Breakdown

**Wave:** 01  
**Test suite:** `cargo test` — `src-tauri/`

---

## Test Results

```
test result: ok. 23 passed; 0 failed; 0 ignored; 0 measured
```

---

## Test Inventory (all 23)

| # | Test Name | Module Path | Group | Expected |
|---|-----------|-------------|-------|----------|
| 1 | `test_system32_is_protected` | `deep_scan::classify::tests` | A — Protected paths | `"protected"` |
| 2 | `test_syswow64_is_protected` | `deep_scan::classify::tests` | A — Protected paths | `"protected"` |
| 3 | `test_winsxs_is_protected` | `deep_scan::classify::tests` | A — Protected paths | `"protected"` |
| 4 | `test_program_files_is_protected` | `deep_scan::classify::tests` | A — Protected paths | `"protected"` |
| 5 | `test_pagefile_is_protected` | `deep_scan::classify::tests` | B — Protected files | `"protected"` |
| 6 | `test_hiberfil_is_protected` | `deep_scan::classify::tests` | B — Protected files | `"protected"` |
| 7 | `test_bootmgr_is_protected` | `deep_scan::classify::tests` | B — Protected files | `"protected"` |
| 8 | `test_windows_sys_file_is_protected` | `deep_scan::classify::tests` | C — Windows extensions | `"protected"` |
| 9 | `test_windows_dll_is_protected` | `deep_scan::classify::tests` | C — Windows extensions | `"protected"` |
| 10 | `test_temp_dir_is_safe` | `deep_scan::classify::tests` | D — Safe zones | `"safe"` |
| 11 | `test_npm_cache_is_safe` | `deep_scan::classify::tests` | D — Safe zones | `"safe"` |
| 12 | `test_pip_cache_is_safe` | `deep_scan::classify::tests` | D — Safe zones | `"safe"` |
| 13 | `test_cargo_registry_is_safe` | `deep_scan::classify::tests` | D — Safe zones | `"safe"` |
| 14 | `test_vscode_cache_is_safe` | `deep_scan::classify::tests` | D — Safe zones | `"safe"` |
| 15 | `test_chrome_cache_is_safe` | `deep_scan::classify::tests` | D — Safe zones | `"safe"` |
| 16 | `test_prefetch_is_safe` | `deep_scan::classify::tests` | D — Safe zones | `"safe"` |
| 17 | `test_crashdumps_is_safe` | `deep_scan::classify::tests` | D — Safe zones | `"safe"` |
| 18 | `test_recycle_bin_is_safe` | `deep_scan::classify::tests` | D — Safe zones | `"safe"` |
| 19 | `test_node_modules_is_caution` | `deep_scan::classify::tests` | E — Caution zones | `"caution"` |
| 20 | `test_build_folder_is_caution` | `deep_scan::classify::tests` | E — Caution zones | `"caution"` |
| 21 | `test_unknown_path_is_caution` | `deep_scan::classify::tests` | E — Caution zones | `"caution"` |
| 22 | `test_slash_normalization` | `deep_scan::classify::tests` | F — Safety re-check | both `"protected"` |
| 23 | `test_protected_path_not_deletable` | `deep_scan::classify::tests` | F — Safety re-check | `!= "safe"`, `!= "caution"` |

---

## Coverage Analysis

| Safety level | Paths tested | Covers |
|-------------|-------------|--------|
| `protected` | 9 distinct paths | System32, SysWOW64, WinSxS, ProgramFiles, pagefile, hiberfil, bootmgr, .sys in Windows, .dll in Windows |
| `safe` | 9 distinct paths | Temp, npm-cache, pip, .cargo, VSCode Cache, Chrome Cache, Prefetch, CrashDumps, Recycle Bin |
| `caution` | 3 distinct paths + default | node_modules, build/, unknown file |

**Critical invariant tested:** A path classified as `protected` can never be reclassified as `safe` or `caution` (Group F — safety re-check). This is the deletion guard in `deep_clean_items`.

---

## Test Location

Tests live in `classify.rs` — co-located with the function under test:

```
src-tauri/src/commands/deep_scan/classify.rs
  pub fn classify_path(...)
  
  #[cfg(test)]
  mod tests { ... 23 tests ... }
```
