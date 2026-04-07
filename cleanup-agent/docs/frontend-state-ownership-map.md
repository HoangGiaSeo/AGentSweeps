# Frontend State Ownership Map

**Version:** v0.1.0  
**Locked:** 2026-04-07 (EXEC-05 Documentation Lock → refreshed EXEC-07)

---

## Architecture Principle

All domain state lives in domain hooks. `App.jsx` is a shell orchestrator that wires hooks together and routes renders to tab components. No domain state is stored directly in App.jsx.

Cross-domain callbacks (pattern used when a domain hook needs to write App shell state) are explicit function props injected at construction time.

---

## App.jsx — Shell State Atoms

| State Atom | Type | Owner | Default | Description |
|------------|------|-------|---------|-------------|
| `tab` | `string` | App.jsx | `'dashboard'` | Active tab identifier |
| `diskOverview` | `array` | App.jsx | `[]` | Array of disk objects from `get_disk_overview` |
| `ollamaStatus` | `string` | App.jsx | `'unknown'` | Ollama health: `'running'`/`'not_running'`/`'unknown'` |
| `loading` | `string \| null` | App.jsx | `null` | Loading overlay message; `null` = no overlay |
| `showSetup` | `boolean` | App.jsx | `false` | Controls SetupModal visibility |
| `logEntries` | `array` | App.jsx | `[]` | Cleanup history entries from `get_cleanup_log` |
| `driveModalDisk` | `object \| null` | App.jsx | `null` | Drive passed to DriveModal; `null` = closed |
| `driveModalReport` | `object \| null` | App.jsx | `null` | `analyze_drive` result for DriveModal |
| `driveModalLoading` | `boolean` | App.jsx | `false` | DriveModal spinner state |

**Total App.jsx shell state atoms: 9**

---

## App.jsx — Shell Handlers

| Handler | Trigger | Reads Shell State | Writes Shell State |
|---------|---------|-------------------|--------------------|
| `loadDashboard` | mount, manual call | — | `diskOverview`, `ollamaStatus` |
| `handleDriveClick(disk)` | DashboardTab drive button | — | `driveModalDisk`, `driveModalReport`, `driveModalLoading` |
| `handleDriveModalClose` | DriveModal close | — | `driveModalDisk`, `driveModalReport`, `driveModalLoading` |
| `loadHistory` | tab change to `'history'` | `tab` | `logEntries` |
| `handleClearLog` | HistoryTab clear button | — | `logEntries` |

---

## Domain Hooks — State Ownership Registry

### `useToast` — Toast Infrastructure (16 LOC)

**Not a domain hook. Shared utility.**

| State | Type | Owner | Notes |
|-------|------|-------|-------|
| `toasts` | `array` | useToast | Live toast list |

| Export | Description |
|--------|-------------|
| `toasts` | Rendered by App.jsx ToastContainer |
| `addToast(message, type)` | Injected into every domain hook |

Auto-dismiss: each toast removed after timeout via `setTimeout`.

---

### `useApiKeys` — API Key Domain (68 LOC)

**Injected:** `addToast` (from App shell via useToast)

| State Atom | Type | Default | Description |
|------------|------|---------|-------------|
| `apiKeys` | `array` | `[]` | Loaded API key entries from `get_api_keys` |
| `apiKeyInputs` | `object` | `{}` | Map of provider → current input value |
| `apiTestResults` | `object` | `{}` | Map of provider → last test result message |
| `apiTesting` | `object` | `{}` | Map of provider → boolean (test in progress) |

| IPC Call | Tauri Command | When |
|----------|--------------|------|
| `getApiKeys` | `get_api_keys` | On mount |
| `saveApiKey` | `save_api_key` | Save button per provider |
| `removeApiKey` | `remove_api_key` | Remove button per provider |
| `testApiKey` | `test_api_key` | Test button per provider |

**Read by:** `useChat` (injected as `apiKeys` prop — read-only)

---

### `useDeepScan` — Deep Scan Domain (52 LOC)

**Injected:** `addToast`, `onDiskRefresh` (callback → App.jsx `setDiskOverview`)

| State Atom | Type | Default | Description |
|------------|------|---------|-------------|
| `deepScanResult` | `object \| null` | `null` | Result from `deep_scan_drive` |
| `deepScanLoading` | `boolean` | `false` | Deep scan in-progress flag |
| `deepCleanResults` | `object \| null` | `null` | Result from `deep_clean_items` |

| IPC Call | Tauri Command | When |
|----------|--------------|------|
| `deepScanDrive` | `deep_scan_drive` | User triggers scan |
| `deepCleanItems` | `deep_clean_items` | User triggers clean |
| `getDiskOverview` | `get_disk_overview` | After clean (via `onDiskRefresh`) |

**Cross-domain write:** calls `onDiskRefresh(data)` → updates `diskOverview` in App.jsx shell after clean.

---

### `useChat` — Chat Domain + Tool Orchestration (219 LOC post-EXEC-06)

**Injected:** `ollamaStatus` (read-only from App.jsx), `apiKeys` (read-only from useApiKeys)

| State Atom | Type | Default | Description |
|------------|------|---------|-------------|
| `chatMessages` | `array` | `[]` | Chat history — roles: `"user"`, `"assistant"`, `"tool"` (UI-only, filtered before AI send) |
| `chatInput` | `string` | `''` | Current input value |
| `chatLoading` | `boolean` | `false` | Message send in-progress |
| `chatModel` | `string` | `'gemma3:4b'` | Selected Ollama model name |
| `chatProvider` | `string` | `'ollama'` | Active provider: `'ollama'` or external key |
| `chatExternalModel` | `string` | `''` | Model string for external provider |
| `toolStatus` | `string` | `''` | In-flight tool status text; shown in loading bubble; `''` = standard typing dots |

**Internal refs (not state — not React-rendered):**

| Ref | Type | Purpose |
|-----|------|---------|
| `diskCacheRef` | `useRef({ data, capturedAt })` | Disk overview internal cache — independent from App.jsx shell `diskOverview` |
| `providerRef` | `useRef(chatProvider)` | Closure-safe current provider capture for async tool fetch callbacks |

**Computed:**

| Computed | Derived From | Description |
|----------|-------------|-------------|
| `chatReady` | `ollamaStatus`, `apiKeys` | `true` if Ollama running OR any enabled external key exists |

**IPC calls — AI send:**

| IPC Call | Tauri Command | When |
|----------|--------------|------|
| `chatAI` | `chat_ai` | Local Ollama message send |
| `chatExternal` | `chat_external` | External provider message send |
| `ensureOllamaRunning` | `ensure_ollama_running` | Before local chat attempt |

**IPC calls — tool data (EXEC-06, read-only):**

| IPC Call | Tauri Command | Tool | When |
|----------|--------------|------|------|
| `getDiskOverview` | `get_disk_overview` | disk_overview | Tool context fetch, cache-conditional |
| `getCleanupLog` | `get_cleanup_log` | cleanup_log | Always fresh; mandatory redaction before use |

**Tool orchestration (internal functions, not exported):**

| Function | Description |
|----------|-------------|
| `fetchSingleToolContext(toolId, forceRefresh)` | Per-tool async fetch; applies freshness policy (disk) or redaction (log); returns context or null |
| `fetchAllToolContexts(toolIds, message)` | Sequential orchestration; sets `toolStatus` per-tool; returns filtered non-null results |

**Provider safety invariant:**  
The line `if (providerRef.current !== "ollama" && containsPathLikeContent(redactedText)) return null` in `fetchSingleToolContext` blocks cleanup log injection to external providers if residual path content is detected post-redaction. This is defense-in-depth: `formatRedactedLog()` in `redactionPipeline.js` is the primary redaction layer (runs for all providers).

**AI payload filter invariant:**  
`newMessages.filter((m) => m.role !== "tool")` — `role:"tool"` messages are UI-only and never sent to any AI provider.

**`chatMessages` role contract:**

| Role | Source | AI Payload? | UI? |
|------|--------|-------------|-----|
| `"user"` | user input | ✅ Yes | ✅ Yes |
| `"assistant"` | AI reply | ✅ Yes | ✅ Yes |
| `"tool"` | tool result bubble | ❌ Filtered out | ✅ Yes (ToolBubble) |

**Tool path owner map (all in `src/hooks/chatTools/`):**

| Concern | Owner File | Owner Symbol |
|---------|-----------|-------------|
| Tool IDs + labels | `toolRegistry.js` | `AGENT_TOOLS` |
| V1 keyword allowlist | `toolRegistry.js` | `AGENT_TOOLS[*].keywords` |
| Runtime exclusion list | `toolRegistry.js` | `AGENT_TOOLS[*].excludedFromKeywords` |
| Force-refresh phrases | `toolRegistry.js` | `FORCE_REFRESH_PHRASES` |
| Cache TTL (60s) | `toolRegistry.js` | `CACHE_TTL_MS` |
| Stale fallback TTL (10m) | `toolRegistry.js` | `STALE_FALLBACK_TTL_MS` |
| Intent detection + exclusion eval | `intentDetector.js` | `detectTools()`, `isForceRefresh()` |
| Disk freshness evaluation | `freshnessPolicy.js` | `evaluateDiskCacheDecision()`, `evaluateFreshFetchFallback()` |
| Log redaction | `redactionPipeline.js` | `redactLogEntry()`, `formatRedactedLog()` |
| Path safety gate | `redactionPipeline.js` | `containsPathLikeContent()` |
| AI context injection | `contextComposer.js` | `buildEnrichedMessage()`, `composeDiskContext()`, `composeLogContext()` |

---

### `useSchedule` — Schedule Domain (67 LOC)

**Injected:** `addToast`

| State Atom | Type | Default | Description |
|------------|------|---------|-------------|
| `schedule` | `object \| null` | `null` | Schedule config from `get_schedule` |
| `scheduleLoading` | `boolean` | `false` | Save operation in progress |

| IPC Call | Tauri Command | When |
|----------|--------------|------|
| `getSchedule` | `get_schedule` | On mount |
| `saveSchedule` | `save_schedule` | User saves schedule |
| `checkAndRunSchedule` | `check_and_run_schedule` | 60-second interval poll |

**Side effect:** 60s `setInterval` started on mount, cleared on unmount.

---

### `useCleanup` — Cleanup Domain (206 LOC)

**Injected:** `addToast`, `onDiskRefresh`, `onTabChange`, `onLoadingChange`, `ollamaStatus`

| State Atom | Type | Default | Description |
|------------|------|---------|-------------|
| `scanData` | `object \| null` | `null` | Last `scan_disk` result |
| `scanMode` | `string` | `'quick'` | `'quick'` or `'full'` |
| `aiResult` | `object \| null` | `null` | AI analysis result |
| `cleanupMode` | `string` | `'manual'` | `'manual'` or `'ai'` |
| `selectedActions` | `object` | `{}` | Map of action_type → boolean |
| `cleanupResults` | `object \| null` | `null` | Last `run_cleanup` / `smart_cleanup` result |
| `showConfirm` | `boolean` | `false` | Cleanup confirmation dialog visibility |
| `showSpaceSaved` | `boolean` | `false` | Post-cleanup summary panel visibility |
| `spaceBefore` | `number` | `0` | Used bytes before cleanup |
| `spaceAfter` | `number` | `0` | Used bytes after cleanup |
| `zipLoading` | `boolean` | `false` | Zip backup in-progress |
| `zipResult` | `object \| null` | `null` | Last `zip_backup` result |
| `sizeEstimates` | `object` | `{}` | Map of action_type → estimated bytes |

**Computed:**

| Computed | Formula |
|----------|---------|
| `totalScanned` | Sum of scanned entry sizes |
| `selectedCount` | Count of `true` entries in `selectedActions` |
| `spaceFreed` | `spaceBefore - spaceAfter` |

**Handlers:**

| Handler | Description |
|---------|-------------|
| `handleScan` | Triggers `scan_disk`, populates `scanData` |
| `triggerAI` | Calls `ask_ai` / `smart_cleanup`, populates `aiResult` |
| `toggleAction(type)` | Flips `selectedActions[type]` |
| `selectAll` | Sets all `selectedActions` to `true` |
| `selectNone` | Sets all `selectedActions` to `false` |
| `selectSafe` | Sets only "safe" action types to `true` |
| `handleCleanupClick` | Opens confirm dialog (sets `showConfirm`) |
| `executeCleanup` | Calls `run_cleanup` or `smart_cleanup`; triggers `onDiskRefresh`, `onTabChange`, `onLoadingChange` |
| `handleZipBackup` | Calls `zip_backup`, sets `zipResult` |
| `handleEstimateSize` | Calls `estimate_cleanup_size`, populates `sizeEstimates` |

**Cross-domain callbacks (write to App.jsx shell):**

| Callback | App Shell State Written |
|----------|------------------------|
| `onDiskRefresh(data)` | `diskOverview` |
| `onTabChange(tab)` | `tab` |
| `onLoadingChange(msg)` | `loading` |

| IPC Call | Tauri Command |
|----------|--------------|
| `scanDisk` | `scan_disk` |
| `runCleanup` | `run_cleanup` |
| `smartCleanup` | `smart_cleanup` |
| `zipBackup` | `zip_backup` |
| `estimateCleanupSize` | `estimate_cleanup_size` |
| `getDiskOverview` | `get_disk_overview` |
| `checkOllama` | `check_ollama` |

---

## State Flow Diagram

```
App.jsx (shell state: tab, diskOverview, ollamaStatus, loading, ...)
   │
   ├── useToast ──────────────────────── addToast (injected to all domain hooks)
   │
   ├── useApiKeys ({ addToast })
   │     └── apiKeys ────────────────── read-only → useChat
   │
   ├── useDeepScan ({ addToast, onDiskRefresh })
   │     └── onDiskRefresh ──────────── WRITES → App.jsx diskOverview
   │
   ├── useChat ({ ollamaStatus, apiKeys })
   │     └── ollamaStatus ───────────── READ from App.jsx (read-only)
   │
   ├── useSchedule ({ addToast })
   │
   └── useCleanup ({ addToast, onDiskRefresh, onTabChange, onLoadingChange, ollamaStatus })
         ├── onDiskRefresh ────────────── WRITES → App.jsx diskOverview
         ├── onTabChange ─────────────── WRITES → App.jsx tab
         └── onLoadingChange ─────────── WRITES → App.jsx loading
```

---

## Prop Drilling Map (Tab Components)

Each tab receives only the state and handlers it uses. No tab receives the full App.jsx prop set.

| Component | Receives From |
|-----------|--------------|
| `DashboardTab` | `diskOverview`, `ollamaStatus`, `onDriveClick` |
| `CleanupTab` | `useCleanup` exports (all), `tab` (for watch) |
| `DeepScanTab` | `useDeepScan` exports, `diskOverview` |
| `ChatTab` | `useChat` exports |
| `HistoryTab` | `logEntries`, `onClearLog` |
| `SettingsTab` | `useApiKeys` exports, `useSchedule` exports |
| `DriveModal` | `disk`, `report`, `loading`, `onClose` |
| `SetupModal` | `show`, `onComplete` |
