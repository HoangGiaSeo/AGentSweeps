# [EXEC-01R] Command Parity & IPC Map

**Date:** 2026-04-07  
**Scope:** All Tauri `invoke()` command names — before EXEC-01, after EXEC-01, after EXEC-01R

---

## IPC Registry Source of Truth

**File:** `src-tauri/src/lib.rs` — `generate_handler![]`  
**Total commands:** 28

---

## Before / After / After-01R Map (All 28 Commands)

| # | JS `invoke()` name | Rust module (before EXEC-01) | Rust module (after EXEC-01) | Rust module (after EXEC-01R) | Changed in 01R? |
|---|-------------------|------------------------------|-----------------------------|-----------------------------|-----------------|
| 1 | `scan_disk` | `commands::scan` | `commands::scan` | `commands::scan` | ❌ No |
| 2 | `get_disk_overview` | `commands::scan` | `commands::scan` | `commands::scan` | ❌ No |
| 3 | `run_cleanup` | `commands::cleanup` | `commands::cleanup` | `commands::cleanup` | ❌ No |
| 4 | `ask_ai` | `commands::ai` | `commands::ai` | `commands::ai` | ❌ No |
| 5 | `chat_ai` | `commands::ai` | `commands::ai` | `commands::ai` | ❌ No |
| 6 | `smart_cleanup` | `commands::decision` | `commands::decision` | `commands::decision` | ❌ No |
| 7 | `check_ollama` | `commands::system` | `commands::system` | `commands::system` | ❌ No |
| 8 | `get_cleanup_log` | `commands::system` | `commands::system` | `commands::system` | ❌ No |
| 9 | `clear_cleanup_log` | `commands::system` | `commands::system` | `commands::system` | ❌ No |
| 10 | `get_api_keys` | `commands::settings` | `commands::settings` | `commands::settings` | ❌ No |
| 11 | `save_api_key` | `commands::settings` | `commands::settings` | `commands::settings` | ❌ No |
| 12 | `remove_api_key` | `commands::settings` | `commands::settings` | `commands::settings` | ❌ No |
| 13 | `test_api_key` | `commands::settings` | `commands::settings` | `commands::settings` | ❌ No |
| 14 | `chat_external` | `commands::settings` | `commands::settings` | `commands::settings` | ❌ No |
| 15 | `check_first_run` | `commands::settings` | `commands::settings` | `commands::settings` | ❌ No |
| 16 | `complete_setup` | `commands::settings` | `commands::settings` | `commands::settings` | ❌ No |
| 17 | `get_schedule` | `commands::scheduler` | `commands::scheduler` | `commands::scheduler` | ❌ No |
| 18 | `save_schedule` | `commands::scheduler` | `commands::scheduler` | `commands::scheduler` | ❌ No |
| 19 | `check_and_run_schedule` | `commands::scheduler` | `commands::scheduler` | `commands::scheduler` | ❌ No |
| 20 | `zip_backup` | `commands::cleanup` | `commands::backup` ✱ | `commands::backup` | ❌ No (stable since 01) |
| 21 | `estimate_cleanup_size` | `commands::cleanup` | `commands::cleanup` | `commands::cleanup` | ❌ No |
| 22 | `check_ollama_setup` | `commands::setup` | `commands::setup` | `commands::setup` | ❌ No |
| 23 | `ensure_ollama_running` | `commands::setup` | `commands::setup` | `commands::setup` | ❌ No |
| 24 | `start_model_pull` | `commands::setup` | `commands::setup` | `commands::setup` | ❌ No |
| 25 | `deep_scan_drive` | `commands::deep_scan` (flat) | `commands::deep_scan::mod` | `commands::deep_scan::mod` | ❌ No |
| 26 | `deep_clean_items` | `commands::deep_scan` (flat) | `commands::deep_scan::clean` ✱✱ | `commands::deep_scan::clean` | ❌ No |
| 27 | `analyze_drive` | `commands::drive_detail` | `commands::drive_detail` | `commands::drive_detail` | ❌ No |

✱ Module moved in EXEC-01, JS `invoke("zip_backup", ...)` name unchanged.  
✱✱ Moved to sub-module in EXEC-01, re-exported at `commands::deep_scan` level via `pub use`, JS name unchanged.

---

## Key Security Note

- `zip_backup` was moved from `commands::cleanup` to `commands::backup` in EXEC-01.
- It is **not** in `ALLOWED_ACTIONS` (the cleanup whitelist). It is a **separate IPC command**.
- It is **not** dispatched through `run_cleanup()`. It has its own path: `deep_clean_items → classify_path → guard`.
- Test `test_zip_backup_is_not_a_cleanup_action` explicitly asserts this invariant.

---

## Frontend Impact of EXEC-01 + EXEC-01R

```
Zero frontend changes required.
All invoke() names identical.
All #[cfg(test)] test code is compile-time excluded from release binary.
```
