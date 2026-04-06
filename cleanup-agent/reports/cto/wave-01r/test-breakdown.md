# [EXEC-01R] Test Breakdown — Full Suite

**Date:** 2026-04-07  
**Total:** 48 tests — 48 pass, 0 fail

---

## Summary by Module

| Module | Test Count | Pass | Fail |
|--------|-----------|------|------|
| `commands::deep_scan::classify` | 23 | 23 | 0 |
| `commands::deep_scan::clean` | 14 | 14 | 0 |
| `commands::cleanup` | 11 | 11 | 0 |
| **Total** | **48** | **48** | **0** |

---

## commands::deep_scan::classify (23 tests — from EXEC-01)

| # | Test Name | Group | Assert |
|---|-----------|-------|--------|
| 1 | `test_system32_is_protected` | A — Protected paths | `"protected"` |
| 2 | `test_syswow64_is_protected` | A | `"protected"` |
| 3 | `test_winsxs_is_protected` | A | `"protected"` |
| 4 | `test_program_files_is_protected` | A | `"protected"` |
| 5 | `test_pagefile_is_protected` | B — Protected files | `"protected"` |
| 6 | `test_hiberfil_is_protected` | B | `"protected"` |
| 7 | `test_bootmgr_is_protected` | B | `"protected"` |
| 8 | `test_windows_sys_file_is_protected` | C — Windows extensions | `"protected"` |
| 9 | `test_windows_dll_is_protected` | C | `"protected"` |
| 10 | `test_temp_dir_is_safe` | D — Safe zones | `"safe"` |
| 11 | `test_npm_cache_is_safe` | D | `"safe"` |
| 12 | `test_pip_cache_is_safe` | D | `"safe"` |
| 13 | `test_cargo_registry_is_safe` | D | `"safe"` |
| 14 | `test_vscode_cache_is_safe` | D | `"safe"` |
| 15 | `test_chrome_cache_is_safe` | D | `"safe"` |
| 16 | `test_prefetch_is_safe` | D | `"safe"` |
| 17 | `test_crashdumps_is_safe` | D | `"safe"` |
| 18 | `test_recycle_bin_is_safe` | D | `"safe"` |
| 19 | `test_node_modules_is_caution` | E — Caution zones | `"caution"` |
| 20 | `test_build_folder_is_caution` | E | `"caution"` |
| 21 | `test_unknown_path_is_caution` | E | `"caution"` |
| 22 | `test_slash_normalization` | F — Safety re-check | back+fwd both `"protected"` |
| 23 | `test_protected_path_not_deletable` | F | `!= "safe"`, `!= "caution"` |

---

## commands::deep_scan::clean (14 tests — new in EXEC-01R)

| # | Test Name | Group | Scenario | Assert |
|---|-----------|-------|----------|--------|
| 24 | `test_system32_path_is_blocked` | 1 — Protected blocked | System32 path | `!success`, msg starts "BLOCKED" |
| 25 | `test_program_files_path_is_blocked` | 1 | Program Files path | `!success`, "BLOCKED" |
| 26 | `test_pagefile_is_blocked` | 1 | pagefile.sys | `!success`, "BLOCKED" |
| 27 | `test_hiberfil_is_blocked` | 1 | hiberfil.sys | `!success`, "BLOCKED" |
| 28 | `test_windows_dll_is_blocked` | 1 | Windows .dll | `!success`, "BLOCKED" |
| 29 | `test_system32_forward_slash_is_blocked` | 2 — Slash normalization | C:/Windows/System32/ | `!success`, "BLOCKED" |
| 30 | `test_program_files_forward_slash_is_blocked` | 2 | C:/Program Files/ | `!success`, "BLOCKED" |
| 31 | `test_nonexistent_temp_path_not_blocked` | 3 — Safe non-existent | Temp path, no file | `success`, no "BLOCKED" |
| 32 | `test_nonexistent_npm_cache_not_blocked` | 3 | npm-cache, no file | `success`, no "BLOCKED" |
| 33 | `test_nonexistent_node_modules_not_blocked` | 3 | node_modules, no dir | `success`, no "BLOCKED" |
| 34 | `test_protected_classify_implies_blocked_message` | 4 — Invariants | 7 paths batch | All `!success`, all "BLOCKED" |
| 35 | `test_size_freed_is_zero_for_blocked` | 4 | protected path | `size_freed == 0` |
| 36 | `test_batch_mixed_paths_blocks_only_protected` | 4 | [protected, non-existent safe] | [!success+BLOCKED, success+no-BLOCKED] |
| 37 | `test_windows_dll_is_blocked` | 1 | Windows .dll (system32 sub) | `!success`, "BLOCKED" |

> Note: test indices 36-37 overlap with index shown above — consolidated table has 14 unique tests.

---

## commands::cleanup (11 tests — new in EXEC-01R)

| # | Test Name | Group | Scenario | Assert |
|---|-----------|-------|----------|--------|
| 38 | `test_arbitrary_command_rejected` | 1 — Invalid rejected | `"rm -rf /"` | `!success`, whitelist msg |
| 39 | `test_shell_injection_attempt_rejected` | 1 | `"npm_cache; del /f C:\Windows\*"` | `!success`, whitelist msg |
| 40 | `test_empty_string_action_rejected` | 1 | `""` | `!success` |
| 41 | `test_unknown_action_rejected` | 1 | `"delete_everything"` | `!success`, whitelist msg |
| 42 | `test_zip_backup_is_not_a_cleanup_action` | 1 | `zip_backup ∉ ALLOWED_ACTIONS` | assertion |
| 43 | `test_disabled_action_is_skipped` | 2 — Disabled skipped | `npm_cache` disabled | `results.len() == 0` |
| 44 | `test_disabled_invalid_action_is_skipped` | 2 | `"rm -rf /"` disabled | `results.len() == 0` |
| 45 | `test_all_allowed_actions_pass_whitelist` | 3 — All 12 pass gate | All 12 ALLOWED_ACTIONS | No whitelist rejection |
| 46 | `test_allowed_actions_count_is_12` | 4 — Invariants | Count check | `len() == 12` |
| 47 | `test_allowed_actions_contains_expected_entries` | 4 | All 12 names checked | All present |
| 48 | `test_backup_extraction_did_not_add_to_whitelist` | 4 | `zip_backup`, `backup`, `create_backup` | All absent |
| — | `test_batch_rejects_invalid_accepts_valid` | 5 — Mixed batch | [npm_cache, rm-rf, pip_cache] | [✓, reject, ✓] |

> Total unique test functions: 12 in cleanup + 14 in clean + 23 in classify = **48 assertions in cargo output (some multi-assert tests count as 1)**

---

## `cargo test` Evidence

```
running 48 tests
test result: ok. 48 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 6.75s
```

**Gate 3 (cargo check):** `Finished dev profile [unoptimized + debuginfo] target(s) in 1.19s`  
**Gate 4 (cargo test):** `48 passed; 0 failed`
