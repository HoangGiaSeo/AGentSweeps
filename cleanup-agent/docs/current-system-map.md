# Current System Map

**Version:** v0.1.0  
**Locked:** 2026-04-07 (EXEC-05 Documentation Lock → refreshed EXEC-07)  
**Stack:** Tauri 2 + React 18 + Vite 8 + Rust (stable/MSVC)

> **Baseline correction — Tauri command count:** The original codebase scan recorded 28 registered commands. EXEC-05 audit verified the actual `generate_handler!` macro list: correct count is **27**. The scan figure was an enumeration error; no command was removed. All EXEC-05 docs use 27 as the locked baseline.

---

## Layer Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React 18 + Vite 8)                                    │
│                                                                 │
│  App.jsx (shell orchestrator — 260 LOC)                         │
│    ├── useToast (shared toast utility)                          │
│    ├── useApiKeys      (API key domain)                         │
│    ├── useDeepScan     (deep scan domain)                       │
│    ├── useChat         (chat domain + tool orchestration)       │
│    │     └── chatTools/ (toolRegistry, intentDetector,         │
│    │                     freshnessPolicy, redactionPipeline,    │
│    │                     contextComposer)                       │
│    ├── useSchedule     (schedule domain)                        │
│    └── useCleanup      (cleanup domain)                         │
│                                                                 │
│  Tabs:                                                          │
│    DashboardTab / CleanupTab / DeepScanTab /                    │
│    ChatTab / HistoryTab / SettingsTab                           │
│  Components:                                                    │
│    SetupModal / DriveModal                                      │
│                                                                 │
│  CSS Architecture (tokens → base → shared → component):        │
│    tokens.css → base.css → modal.css → utilities.css →         │
│    sidebar.css → toast.css → dashboard.css → cleanup.css →     │
│    deepscan.css → drivemodal.css → chat.css → settings.css     │
│    (chat.css includes ToolBubble styles: .chat-tool-*)          │
│                                                                 │
│  IPC Adapter: src/api.js (54 exports — flat invoke registry)   │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Tauri invoke()
┌──────────────────────────────▼──────────────────────────────────┐
│ TAURI IPC BRIDGE                                                │
│  lib.rs → tauri::generate_handler![...27 commands...]           │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│ RUST BACKEND (Tauri 2, MSVC Windows)                            │
│                                                                 │
│  src-tauri/src/                                                 │
│    lib.rs             — bootstrap + handler registration        │
│    commands/          — all Tauri command implementations       │
│    utils/             — disk.rs, logger.rs                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Source of Truth Map

| Domain / Area | Source of Truth File | Layer | Notes |
|---------------|---------------------|-------|-------|
| Frontend app shell | `src/App.jsx` | React | 260 LOC; no domain state |
| Cleanup domain (state + handlers) | `src/hooks/useCleanup.js` | Hook | 206 LOC |
| Deep scan domain | `src/hooks/useDeepScan.js` | Hook | 43 LOC |
| Chat domain + tool orchestration | `src/hooks/useChat.js` | Hook | 219 LOC (EXEC-06 rewrite) |
| Tool registry (V1 locked allowlist) | `src/hooks/chatTools/toolRegistry.js` | Helper | `AGENT_TOOLS`, `FORCE_REFRESH_PHRASES`, `CACHE_TTL_MS`, `STALE_FALLBACK_TTL_MS` |
| Intent detection (trigger policy) | `src/hooks/chatTools/intentDetector.js` | Helper | `detectTools()`, `isForceRefresh()` |
| Freshness policy (disk cache) | `src/hooks/chatTools/freshnessPolicy.js` | Helper | `evaluateDiskCacheDecision()`, `evaluateFreshFetchFallback()` |
| Redaction pipeline (cleanup log) | `src/hooks/chatTools/redactionPipeline.js` | Helper | `redactLogEntry()`, `formatRedactedLog()`, `containsPathLikeContent()` |
| Context composer (AI injection) | `src/hooks/chatTools/contextComposer.js` | Helper | `composeDiskContext()`, `composeLogContext()`, `buildEnrichedMessage()` |
| Tool evidence UI | `src/tabs/ChatTab.jsx` | React | `ToolBubble` component — expand/collapse only |
| Schedule domain | `src/hooks/useSchedule.js` | Hook | ~65 LOC |
| API key domain | `src/hooks/useApiKeys.js` | Hook | ~65 LOC |
| Toast utility | `src/hooks/useToast.js` | Hook | 16 LOC; shared |
| CSS tokens (design system SoT) | `src/styles/tokens.css` | CSS | 26 canonical tokens |
| CSS base layout | `src/styles/base.css` | CSS | App frame, sidebar, page |
| Modal primitives | `src/styles/modal.css` | CSS | SetupModal generic styles |
| Button/utility primitives | `src/styles/utilities.css` | CSS | `.btn`, `.btn-small`, `.btn-tiny`, `.btn-*` |
| App.css | `src/App.css` | CSS | **RETIRED** — 9-LOC tombstone, 0 active selectors |
| IPC adapter | `src/api.js` | JS | 54 named exports, all `invoke()` |
| Tauri command registry | `src-tauri/src/lib.rs` | Rust | Single `generate_handler!` list |
| Scan command | `src-tauri/src/commands/scan.rs` | Rust | `scan_disk`, `get_disk_overview` |
| Cleanup command | `src-tauri/src/commands/cleanup.rs` | Rust | `run_cleanup`, `estimate_cleanup_size` |
| Backup command | `src-tauri/src/commands/backup.rs` | Rust | `zip_backup` |
| AI commands | `src-tauri/src/commands/ai.rs` | Rust | `ask_ai`, `chat_ai` |
| Decision / smart cleanup | `src-tauri/src/commands/decision.rs` | Rust | `smart_cleanup` |
| Scheduler command | `src-tauri/src/commands/scheduler.rs` | Rust | `get_schedule`, `save_schedule`, `check_and_run_schedule` |
| Settings / API keys | `src-tauri/src/commands/settings.rs` | Rust | `get_api_keys`, `save_api_key`, `remove_api_key`, `test_api_key`, `chat_external`, `check_first_run`, `complete_setup` |
| Ollama / system | `src-tauri/src/commands/system.rs` | Rust | `check_ollama`, `get_cleanup_log`, `clear_cleanup_log` |
| Setup flow | `src-tauri/src/commands/setup.rs` | Rust | `check_ollama_setup`, `ensure_ollama_running`, `start_model_pull` |
| Deep scan (full pipeline) | `src-tauri/src/commands/deep_scan/` | Rust | Sub-module: `mod.rs`, `classify.rs`, `types.rs`, `zones.rs`, `scan.rs`, `clean.rs` |
| Drive analysis | `src-tauri/src/commands/drive_detail.rs` | Rust | `analyze_drive` |
| Disk utility | `src-tauri/src/utils/disk.rs` | Rust | `get_folder_size`, platform disk space |
| Logger utility | `src-tauri/src/utils/logger.rs` | Rust | `log_action` (cleanup history) |
| Cleanup whitelist boundary | `src-tauri/src/commands/cleanup.rs` | Rust | `ALLOWED_ACTIONS: &[&str]` — 12 entries, whitelist-only enforcement |
| Deep scan protected path table | `src-tauri/src/commands/deep_scan/classify.rs` | Rust | Protected path rules tested by 18 classify tests |
| App settings persistence | `%USERPROFILE%\.dev-cleanup-agent-settings.json` | File | JSON; owned by `settings.rs` / `scheduler.rs` |

---

## Frontend App File Inventory

| File | Role | Lines (approx) |
|------|------|----------------|
| `src/main.jsx` | React entry point | ~10 |
| `src/App.jsx` | Shell orchestrator | 260 |
| `src/api.js` | IPC adapter (54 exports) | ~55 |
| `src/constants.js` | TABS, AI_PROVIDERS, MANUAL_ACTIONS, formatSize | ~50 |
| `src/hooks/useToast.js` | Toast state | 16 |
| `src/hooks/useApiKeys.js` | API key domain | ~65 |
| `src/hooks/useDeepScan.js` | Deep scan domain | ~45 |
| `src/hooks/useChat.js` | Chat domain + tool orchestration | 219 |
| `src/hooks/chatTools/toolRegistry.js` | V1 locked tool allowlist + constants | ~65 |
| `src/hooks/chatTools/intentDetector.js` | Runtime trigger detection + exclusion | ~40 |
| `src/hooks/chatTools/freshnessPolicy.js` | Disk cache freshness decisions | ~75 |
| `src/hooks/chatTools/redactionPipeline.js` | Cleanup log redaction pipeline | ~90 |
| `src/hooks/chatTools/contextComposer.js` | AI context string builder | ~60 |
| `src/hooks/__tests__/useChat.agentic.test.js` | 71 unit tests (U01–U16) | ~480 |
| `src/hooks/useSchedule.js` | Schedule domain | ~65 |
| `src/hooks/useCleanup.js` | Cleanup domain | 206 |
| `src/tabs/DashboardTab.jsx` | Dashboard UI | — |
| `src/tabs/CleanupTab.jsx` | Cleanup UI (4 props) | — |
| `src/tabs/DeepScanTab.jsx` | Deep scan UI | — |
| `src/tabs/ChatTab.jsx` | Chat UI | — |
| `src/tabs/HistoryTab.jsx` | History UI | — |
| `src/tabs/SettingsTab.jsx` | Settings + API keys UI | — |
| `src/components/DriveModal.jsx` | Drive detail modal | — |
| `src/components/SetupModal.jsx` | First-run setup modal | — |

---

## Backend File Inventory

| File | Commands Exposed |
|------|-----------------|
| `commands/scan.rs` | `scan_disk`, `get_disk_overview` |
| `commands/cleanup.rs` | `run_cleanup`, `estimate_cleanup_size` |
| `commands/backup.rs` | `zip_backup` |
| `commands/ai.rs` | `ask_ai`, `chat_ai` |
| `commands/decision.rs` | `smart_cleanup` |
| `commands/system.rs` | `check_ollama`, `get_cleanup_log`, `clear_cleanup_log` |
| `commands/settings.rs` | `get_api_keys`, `save_api_key`, `remove_api_key`, `test_api_key`, `chat_external`, `check_first_run`, `complete_setup` |
| `commands/scheduler.rs` | `get_schedule`, `save_schedule`, `check_and_run_schedule` |
| `commands/setup.rs` | `check_ollama_setup`, `ensure_ollama_running`, `start_model_pull` |
| `commands/deep_scan/` (module) | `deep_scan_drive`, `deep_clean_items` |
| `commands/drive_detail.rs` | `analyze_drive` |
| `utils/disk.rs` | internal: `get_folder_size`, disk space |
| `utils/logger.rs` | internal: `log_action` |

**Total registered commands: 27** (verified against `lib.rs` `generate_handler!` list)

---

## Key Architecture Boundaries

### App.jsx — Shell Only

App.jsx owns only: `tab`, `diskOverview`, `ollamaStatus`, `loading`, `showSetup`, `logEntries`, `driveModal*`.  
All feature domain state is in hooks. App.jsx is a pure shell orchestrator + render router.

### useCleanup — Cross-Domain Callback Pattern

`useCleanup` cannot write `diskOverview`, `tab`, or `loading` directly (they are owned by App.jsx shell).  
Instead, it receives explicit callbacks:  
- `onDiskRefresh` → calls `setDiskOverview`  
- `onTabChange` → calls `setTab`  
- `onLoadingChange` → calls `setLoading`  
This boundary is enforced by design and documented in `useCleanup.js` header comment.

### Cleanup Whitelist

`ALLOWED_ACTIONS` in `cleanup.rs` is a compile-time constant. Any action type not in the list is rejected regardless of what the AI suggests. This prevents AI-driven arbitrary command execution.

### Settings Persistence

All API keys, schedule config, and first-run state are persisted to  
`%USERPROFILE%\.dev-cleanup-agent-settings.json` by `settings.rs` internal functions `load_settings()` / `save_settings()`.

### Agentic Chat V1 — Tool Boundary

`useChat.js` (`diskCacheRef`, `fetchSingleToolContext`, `fetchAllToolContexts`) is the sole orchestration point for tool-augmented chat. No tool logic exists in `ChatTab.jsx` (UI only) or `App.jsx` (shell only).

**Read-only IPC contract:** `useChat.js` imports only `getDiskOverview` and `getCleanupLog` from `api.js`. No destructive commands (`runCleanup`, `smartCleanup`, `deepCleanItems`, `zipBackup`) are accessible via the chat path.

**Provider safety:** Cleanup log is mandatory-redacted for **all providers** via `formatRedactedLog()`. In addition, `containsPathLikeContent()` runs as a second safety gate before external-provider injection. Local/external share a **single pipeline** — no dual policy.

**Keyword allowlist is locked V1.** Any keyword addition requires a new blueprint-approved wave. No inline heuristics exist outside `toolRegistry.js` + `intentDetector.js`.
