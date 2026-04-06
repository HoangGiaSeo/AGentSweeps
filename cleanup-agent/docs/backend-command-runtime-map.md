# Backend Command Runtime Map

**Version:** v0.1.0  
**Locked:** 2026-04-07 (EXEC-05 Documentation Lock)

---

## Architecture Overview

- **IPC bridge:** Tauri 2 `invoke()` — JS calls Rust via `tauri::command` attribute
- **Registry:** `src-tauri/src/lib.rs` — single `tauri::generate_handler![...]` macro
- **IPC adapter:** `src/api.js` — 54 named exports, each wrapping one `invoke()` call
- **Calling layer:** Domain hooks call `api.js` exports; App.jsx shell calls a small subset directly

---

## Command Map (27 commands)

Each row: `Tauri command name` → `Rust file` → `api.js export` → `Caller hook / component`

### Scan

| Command | Rust File | api.js Export | Caller |
|---------|-----------|--------------|--------|
| `scan_disk` | `commands/scan.rs` | `scanDisk` | `useCleanup.handleScan` |
| `get_disk_overview` | `commands/scan.rs` | `getDiskOverview` | App.jsx `loadDashboard`; `useCleanup.executeCleanup`; `useDeepScan` (via `onDiskRefresh`) |

**`scan_disk` input:** `{ drive: string, mode: string }`  
**`get_disk_overview` output:** `DiskOverview[]` — array of `{ path, total, used, available, name }`

---

### Cleanup

| Command | Rust File | api.js Export | Caller |
|---------|-----------|--------------|--------|
| `run_cleanup` | `commands/cleanup.rs` | `runCleanup` | `useCleanup.executeCleanup` |
| `estimate_cleanup_size` | `commands/cleanup.rs` | `estimateCleanupSize` | `useCleanup.handleEstimateSize` |

**`run_cleanup` input:** `{ actions: string[] }` — each action must be in `ALLOWED_ACTIONS` whitelist  
**`ALLOWED_ACTIONS` (12 entries):** `npm_cache`, `pip_cache`, `docker_prune`, `temp_files`, `windows_temp`, `prefetch`, `cargo_cache`, `gradle_cache`, `vscode_cache`, and 3 more  
**Security note:** Any action not in the whitelist is rejected at the Rust layer, regardless of AI suggestion.

---

### Backup

| Command | Rust File | api.js Export | Caller |
|---------|-----------|--------------|--------|
| `zip_backup` | `commands/backup.rs` | `zipBackup` | `useCleanup.handleZipBackup` |

**`zip_backup` output:** `ZipResult { path: string, size_bytes: u64, file_count: u32 }`

---

### AI

| Command | Rust File | api.js Export | Caller |
|---------|-----------|--------------|--------|
| `ask_ai` | `commands/ai.rs` | `askAI` | `useCleanup.triggerAI` (analysis) |
| `chat_ai` | `commands/ai.rs` | `chatAI` | `useChat` (local Ollama chat) |

**Both commands route to local Ollama.** External provider chat goes through `settings::chat_external`.

---

### Decision / Smart Cleanup

| Command | Rust File | api.js Export | Caller |
|---------|-----------|--------------|--------|
| `smart_cleanup` | `commands/decision.rs` | `smartCleanup` | `useCleanup.executeCleanup` (when mode = `'ai'`) |

**`smart_cleanup` flow:** AI analysis → decision → `run_cleanup` (internal call within Rust) → returns combined result.

---

### System

| Command | Rust File | api.js Export | Caller |
|---------|-----------|--------------|--------|
| `check_ollama` | `commands/system.rs` | `checkOllama` | App.jsx `loadDashboard`; `useCleanup` |
| `get_cleanup_log` | `commands/system.rs` | `getCleanupLog` | App.jsx `loadHistory` |
| `clear_cleanup_log` | `commands/system.rs` | `clearCleanupLog` | App.jsx `handleClearLog` |

**`check_ollama` output:** `string` — `"running"` | `"not_running"` | `"unknown"`

---

### Settings / API Keys

| Command | Rust File | api.js Export | Caller |
|---------|-----------|--------------|--------|
| `get_api_keys` | `commands/settings.rs` | `getApiKeys` | `useApiKeys` on mount |
| `save_api_key` | `commands/settings.rs` | `saveApiKey` | `useApiKeys` save handler |
| `remove_api_key` | `commands/settings.rs` | `removeApiKey` | `useApiKeys` remove handler |
| `test_api_key` | `commands/settings.rs` | `testApiKey` | `useApiKeys` test handler |
| `chat_external` | `commands/settings.rs` | `chatExternal` | `useChat` (external provider path) |
| `check_first_run` | `commands/settings.rs` | `checkFirstRun` | App.jsx mount |
| `complete_setup` | `commands/settings.rs` | `completeSetup` | SetupModal on complete |

**Persistence model:** All API keys, schedule config, and first-run flag stored to  
`%USERPROFILE%\.dev-cleanup-agent-settings.json` via `load_settings()` / `save_settings()` internal helpers.  
**`AppSettings` struct:**
```rust
struct AppSettings {
    api_keys: HashMap<String, ApiKeyEntry>,
    schedule: Option<ScheduleConfig>,
    first_run: bool,
}
```

---

### Scheduler

| Command | Rust File | api.js Export | Caller |
|---------|-----------|--------------|--------|
| `get_schedule` | `commands/scheduler.rs` | `getSchedule` | `useSchedule` on mount |
| `save_schedule` | `commands/scheduler.rs` | `saveSchedule` | `useSchedule` save handler |
| `check_and_run_schedule` | `commands/scheduler.rs` | `checkAndRunSchedule` | `useSchedule` 60s poll |

**Poll model:** `useSchedule` runs `setInterval(60000)` and calls `checkAndRunSchedule` every 60 seconds.

---

### Setup / Ollama Flow

| Command | Rust File | api.js Export | Caller |
|---------|-----------|--------------|--------|
| `check_ollama_setup` | `commands/setup.rs` | `checkOllamaSetup` | SetupModal step check |
| `ensure_ollama_running` | `commands/setup.rs` | `ensureOllamaRunning` | `useChat` before local send |
| `start_model_pull` | `commands/setup.rs` | `startModelPull` | SetupModal pull step |

---

### Deep Scan

| Command | Rust File | api.js Export | Caller |
|---------|-----------|--------------|--------|
| `deep_scan_drive` | `commands/deep_scan/mod.rs` | `deepScanDrive` | `useDeepScan` scan handler |
| `deep_clean_items` | `commands/deep_scan/mod.rs` | `deepCleanItems` | `useDeepScan` clean handler |

**Deep scan module files:**
- `mod.rs` — command entry points + re-exports
- `classify.rs` — path safety classifier (tested by 18 unit tests)
- `types.rs` — `DriveAnalysis`, `DeepScanItem`, `DeepScanOptions`, `CleanResult` structs
- `zones.rs` — scan zone definitions (which directories to analyze)
- `scan.rs` — zone scanning logic
- `clean.rs` — delete-guard (checks `classify.rs` before removing any file)

---

### Drive Detail

| Command | Rust File | api.js Export | Caller |
|---------|-----------|--------------|--------|
| `analyze_drive` | `commands/drive_detail.rs` | `analyzeDrive` | App.jsx `handleDriveClick` |

**Output:** used by `DriveModal.jsx` for breakdown display.

---

## Internal Utilities (not Tauri commands)

| Utility | File | Used By |
|---------|------|---------|
| `get_folder_size` | `utils/disk.rs` | `scan.rs`, `deep_scan/scan.rs` |
| Disk space (OS call) | `utils/disk.rs` | `get_disk_overview` (scan.rs) |
| `log_action` | `utils/logger.rs` | `cleanup.rs`, `smart_cleanup` (decision.rs) |

**Logger output:** cleanup operations appended to an in-memory log, retrieved via `get_cleanup_log`.

---

## Full Command Count Reconciliation

| Module | Commands |
|--------|---------|
| scan | 2 |
| cleanup | 2 |
| backup | 1 |
| ai | 2 |
| decision | 1 |
| system | 3 |
| settings | 7 |
| scheduler | 3 |
| setup | 3 |
| deep_scan | 2 |
| drive_detail | 1 |
| **Total** | **27** |

All 27 verified against `lib.rs` `generate_handler!` macro list.
