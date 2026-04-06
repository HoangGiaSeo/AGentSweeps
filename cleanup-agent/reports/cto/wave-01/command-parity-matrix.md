# EXEC-01 — IPC Command Parity Matrix

**Wave:** 01  
**Verification:** lib.rs `generate_handler![]` before vs. after

---

## All 28 Registered Commands

| # | Command Path (Before) | Command Path (After) | Changed? |
|---|----------------------|-----------------------|----------|
| 1 | `commands::scan::scan_disk` | `commands::scan::scan_disk` | ❌ No |
| 2 | `commands::scan::get_disk_overview` | `commands::scan::get_disk_overview` | ❌ No |
| 3 | `commands::cleanup::run_cleanup` | `commands::cleanup::run_cleanup` | ❌ No |
| 4 | `commands::ai::ask_ai` | `commands::ai::ask_ai` | ❌ No |
| 5 | `commands::ai::chat_ai` | `commands::ai::chat_ai` | ❌ No |
| 6 | `commands::decision::smart_cleanup` | `commands::decision::smart_cleanup` | ❌ No |
| 7 | `commands::system::check_ollama` | `commands::system::check_ollama` | ❌ No |
| 8 | `commands::system::get_cleanup_log` | `commands::system::get_cleanup_log` | ❌ No |
| 9 | `commands::system::clear_cleanup_log` | `commands::system::clear_cleanup_log` | ❌ No |
| 10 | `commands::settings::get_api_keys` | `commands::settings::get_api_keys` | ❌ No |
| 11 | `commands::settings::save_api_key` | `commands::settings::save_api_key` | ❌ No |
| 12 | `commands::settings::remove_api_key` | `commands::settings::remove_api_key` | ❌ No |
| 13 | `commands::settings::test_api_key` | `commands::settings::test_api_key` | ❌ No |
| 14 | `commands::settings::chat_external` | `commands::settings::chat_external` | ❌ No |
| 15 | `commands::settings::check_first_run` | `commands::settings::check_first_run` | ❌ No |
| 16 | `commands::settings::complete_setup` | `commands::settings::complete_setup` | ❌ No |
| 17 | `commands::scheduler::get_schedule` | `commands::scheduler::get_schedule` | ❌ No |
| 18 | `commands::scheduler::save_schedule` | `commands::scheduler::save_schedule` | ❌ No |
| 19 | `commands::scheduler::check_and_run_schedule` | `commands::scheduler::check_and_run_schedule` | ❌ No |
| 20 | `commands::cleanup::zip_backup` | `commands::backup::zip_backup` | ✅ Module moved |
| 21 | `commands::cleanup::estimate_cleanup_size` | `commands::cleanup::estimate_cleanup_size` | ❌ No |
| 22 | `commands::setup::check_ollama_setup` | `commands::setup::check_ollama_setup` | ❌ No |
| 23 | `commands::setup::ensure_ollama_running` | `commands::setup::ensure_ollama_running` | ❌ No |
| 24 | `commands::setup::start_model_pull` | `commands::setup::start_model_pull` | ❌ No |
| 25 | `commands::deep_scan::deep_scan_drive` | `commands::deep_scan::deep_scan_drive` | ❌ No |
| 26 | `commands::deep_scan::deep_clean_items` | `commands::deep_scan::deep_clean_items` | ❌ No |
| 27 | `commands::drive_detail::analyze_drive` | `commands::drive_detail::analyze_drive` | ❌ No |

**Total: 27 unchanged + 1 module-path moved (command name unchanged)**

---

## Frontend Impact

The JS IPC command name is the function name, not the Rust module path. 

- `invoke("zip_backup", ...)` — **unchanged** (still `zip_backup`, just in new module)
- All 26 other invocations — **unchanged**

Frontend code requires **zero changes**.

---

## Tauri Command Metadata Re-export

For `deep_clean_items` (moved into sub-module `clean.rs`), the Tauri `generate_handler![]` macro requires both the function and the `__cmd__` metadata helper in the same namespace:

```rust
// deep_scan/mod.rs
pub use clean::deep_clean_items;
pub use clean::__cmd__deep_clean_items;  // preserves commands::deep_scan::deep_clean_items path
```

`cargo check EXIT:0` confirms this resolves correctly.
