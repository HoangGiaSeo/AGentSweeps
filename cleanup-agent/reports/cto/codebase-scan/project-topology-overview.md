# [EXEC-00] Project Topology Overview — AGent WinWin

> **Scan date:** 2026-04-06  
> Tags: FACT = measured directly | INFERENCE = deduced from structure/imports/runtime path | ASSUMPTION = assumed when repo lacks standard

---

## 1. Repo Type

| Property | Value | Classification |
|----------|-------|----------------|
| Repo type | Single-app monorepo | FACT |
| App name | AGent WinWin (dev-cleanup-agent) | FACT |
| Version | v0.1.0 | FACT |
| Frontend runtime | React 18 + Vite | FACT (package.json) |
| Desktop shell | Tauri 2 | FACT (Cargo.toml, tauri.conf.json) |
| Backend/commands | Rust (stable) | FACT |
| Async runtime | Tokio 1 (full features) | FACT (Cargo.toml) |
| Package manager | npm | FACT |
| Target platform | Windows 64-bit desktop | FACT (tauri.conf.json, Windows-specific paths in Rust) |
| CI/CD | GitHub Actions (inferred from prior phases) | INFERENCE |

---

## 2. Module / Folder Topology

```
cleanup-agent/
├── index.html                      ← HTML shell for Vite/Tauri webview
├── package.json                    ← npm config, Vite + React deps
├── vite.config.js                  ← Vite bundler config
├── eslint.config.js                ← lint config
│
├── src/                            ← FRONTEND (React 18, JSX)
│   ├── main.jsx                    ← React entrypoint (mounts <App />)
│   ├── index.css                   ← minimal global reset entry
│   ├── App.jsx                     ← GOD COMPONENT — all state, all handlers, full render
│   ├── App.css                     ← MEGA CSS FILE — shared + some component styles
│   ├── api.js                      ← Tauri IPC adapter (invoke() wrappers)
│   ├── constants.js                ← TABS, MANUAL_ACTIONS, AI_PROVIDERS, formatSize
│   ├── hooks/
│   │   └── useToast.js             ← Toast queue hook
│   ├── components/
│   │   ├── SetupModal.jsx          ← First-run setup modal
│   │   └── DriveModal.jsx          ← Drive detail modal (clickable disk card)
│   ├── tabs/
│   │   ├── DashboardTab.jsx        ← Disk overview + Ollama status + quick-scan buttons
│   │   ├── CleanupTab.jsx          ← Scan results + AI/manual cleanup + schedule + zip
│   │   ├── DeepScanTab.jsx         ← 3-tier deep scan + delete confirmation
│   │   ├── ChatTab.jsx             ← Chat with Ollama or external AI
│   │   ├── HistoryTab.jsx          ← Cleanup log viewer
│   │   └── SettingsTab.jsx         ← API key management + Ollama config
│   └── styles/                     ← Per-component CSS modules
│       ├── base.css                ← CSS vars + base layout (partially overlaps App.css)
│       ├── sidebar.css
│       ├── dashboard.css
│       ├── cleanup.css
│       ├── deepscan.css
│       ├── drivemodal.css
│       ├── chat.css
│       ├── settings.css
│       ├── setup.css
│       └── toast.css
│
├── src-tauri/                      ← BACKEND (Rust, Tauri 2)
│   ├── build.rs                    ← Tauri build script
│   ├── Cargo.toml                  ← Rust manifest + dependencies
│   ├── Cargo.lock                  ← EXEMPT: generated lock
│   ├── tauri.conf.json             ← Tauri 2 app config + window settings
│   ├── capabilities/
│   │   └── default.json            ← Tauri capability grants
│   ├── gen/schemas/                ← EXEMPT: Tauri-generated JSON schemas
│   ├── icons/                      ← EXEMPT: binary icon assets
│   └── src/
│       ├── main.rs                 ← Rust entrypoint (calls lib::run())
│       ├── lib.rs                  ← Tauri builder + command registration (source of truth for IPC surface)
│       ├── commands/
│       │   ├── mod.rs              ← module declarations
│       │   ├── scan.rs             ← disk overview + file scan + format_size helper
│       │   ├── cleanup.rs          ← cleanup execution + size estimate + zip backup
│       │   ├── ai.rs               ← Ollama HTTP client (ask_ai, chat_ai)
│       │   ├── decision.rs         ← smart_cleanup (AI-guided cleanup decision)
│       │   ├── settings.rs         ← API key CRUD + external AI chat + first-run flag
│       │   ├── system.rs           ← Ollama process check + cleanup log read/clear
│       │   ├── setup.rs            ← Ollama setup/install assist + model pull
│       │   ├── scheduler.rs        ← scheduled cleanup config persist + trigger
│       │   ├── deep_scan.rs        ← 3-tier deep scan + safety classification + delete
│       │   └── drive_detail.rs     ← per-drive folder size tree + app last-used via prefetch
│       └── utils/
│           ├── mod.rs              ← module declarations
│           ├── disk.rs             ← get_folder_size helper
│           └── logger.rs           ← append-only cleanup log writer
│
└── reports/cto/codebase-scan/      ← THIS AUDIT OUTPUT (non-source, non-runtime)
```

---

## 3. Entrypoints

| Layer | Entrypoint | Role | Classification |
|-------|-----------|------|----------------|
| Rust binary | `src-tauri/src/main.rs` | Calls `lib::run()` | FACT |
| Tauri IPC surface | `src-tauri/src/lib.rs` | `generate_handler![...]` registers all 28 commands | FACT |
| Web/HTML shell | `index.html` | Loaded by Tauri webview | FACT |
| React root | `src/main.jsx` | `ReactDOM.createRoot(...)` mounts `<App />` | FACT |
| App orchestration | `src/App.jsx` | All state, routing, and top-level render | FACT |
| IPC bridge | `src/api.js` | All `invoke()` calls exposed to React | FACT |

---

## 4. Major Layers

| Layer | Location | Description | Source-of-Truth For |
|-------|----------|-------------|---------------------|
| UI Presentation | `src/tabs/`, `src/components/` | Per-tab React components, mostly render-only | Tab-level UI structure |
| UI Orchestration | `src/App.jsx` | God-component: all state + all side effects + all handlers + routing | Entire frontend state shape |
| Design System | `src/App.css` + `src/styles/*.css` | CSS tokens, layout rules, component styles | Visual identity (split/drift risk) |
| IPC Adapter | `src/api.js` | Tauri invoke() wrappers | Frontend←→Backend contract |
| Shared Constants | `src/constants.js` | Tab list, manual actions, AI providers, formatSize | UI configuration |
| Command Layer | `src-tauri/src/commands/` | All Tauri commands — one file per domain area | Backend functionality per domain |
| Domain Rules | `src-tauri/src/commands/deep_scan.rs` | Safety classification, scan zones | What is safe to delete (critical business logic) |
| Infrastructure | `src-tauri/src/commands/cleanup.rs`, `settings.rs`, `system.rs`, `setup.rs` | OS interaction, settings persistence, process management | System integration |
| Utilities | `src-tauri/src/utils/` | disk size helper, append-only logger | Cross-command helpers |
| Config | `tauri.conf.json`, `Cargo.toml`, `package.json` | App identity, capabilities, deps | Build and runtime config |

---

## 5. Runtime Flow (Critical Paths)

### Path A — Disk Overview (always-on)
```
App.jsx::useEffect(loadDashboard)
  → api.js::getDiskOverview()
    → scan.rs::get_disk_overview() [Tauri IPC]
      → utils/disk.rs::get_folder_size()
```

### Path B — Deep Scan (most complex, recently optimized)
```
App.jsx::handleDeepScan(options)
  → api.js::deepScanDrive(options)
    → deep_scan.rs::deep_scan_drive(options) [async IPC]
      → tokio::task::spawn_blocking
        → deep_scan_drive_blocking(options)
          → get_scan_zones() → get_folder_size_bounded() [per zone]
          → scan_large_files() [budget+deadline guarded]
          → scan_build_artifacts() [budget+deadline guarded]
          → scan_browser_profiles()
```

### Path C — Drive Detail Modal
```
DashboardTab disk card click
  → App.jsx::handleDriveClick(disk)
    → api.js::analyzeDrive(drive, used_bytes)
      → drive_detail.rs::analyze_drive() [async IPC]
        → tokio::task::spawn_blocking
          → scan_top_folders() → get_dir_size_and_count() [budget+deadline]
          → scan_prefetch_apps()
```

### Path D — AI Chat
```
App.jsx::sendChatMessage(text)
  → api.js::chatAI() | chatExternal()
    → ai.rs::chat_ai() [Ollama local]
    OR settings.rs::chat_external() [Gemini / external]
```

### Path E — Cleanup Execution
```
App.jsx::executeCleanup()
  → api.js::runCleanup(actions)
    → cleanup.rs::run_cleanup(actions) [whitelist enforced]
      → execute_cleanup() / execute_dynamic_cleanup()
        → os Command::new("cmd") /C del/rmdir
```

---

## 6. Likely Source-of-Truth Zones

| Zone | File | What It Owns | Drift Risk |
|------|------|-------------|------------|
| Safety rules (what is safe to delete) | `commands/deep_scan.rs` lines 60–230 | `classify_path()`, `PROTECTED_SEGMENTS`, `PROTECTED_FILES` | MEDIUM — any Windows path change requires editing this file directly |
| Known cleanup zones catalog | `commands/deep_scan.rs::get_scan_zones()` lines 260–340 | 30+ hardcoded zone definitions | HIGH — catalog embedded in scan command, no separate data file |
| Cleanup action whitelist | `commands/cleanup.rs::ALLOWED_ACTIONS` | Which cleanup ops are permitted | MEDIUM — whitelist is const inline, not configurable |
| IPC command registration | `src-tauri/src/lib.rs` | `generate_handler![...]` — the canonical list of all backend commands | LOW risk currently; will need update with every new command |
| AI provider list | `src/constants.js::AI_PROVIDERS` | Which external AI providers exist, their models, defaults | MEDIUM — product-level config embedded in JS constants |
| Tab navigation | `src/constants.js::TABS` | App navigation structure | LOW currently |
| Frontend state shape | `src/App.jsx` (26 useState declarations) | Single source of UI state truth | HIGH — no context, no reducer; all state owners are anonymous hooks |

---

## 7. Architecture Boundary Observations

### INFERENCE: Flat Command Layer
All Rust commands sit in a single directory `commands/` without sub-domains or bounded contexts. As features grow, the current flat layout will make it harder to enforce module boundaries.

### INFERENCE: No Dependency Injection / No Error Types
Commands communicate failures via `String` messages or `Vec<CleanupResult>` — no typed error hierarchy. This makes cross-command error handling inconsistent.

### INFERENCE: No State Management Layer in Frontend
`App.jsx` accumulates all state with no store, context, or reducer separation. Every new feature adds more `useState` + `useEffect` to this single file. This is the primary scalability risk in the frontend.

### FACT: CSS Strategy Inconsistent
`App.css` (1,864 LOC) was never properly decomposed despite `styles/*.css` modules being created. Both exist and are imported in `App.jsx`. There is likely style definition duplication or at minimum responsibility overlap between `App.css::sidebar` and `styles/sidebar.css`.
