# [EXEC-02] State Ownership Map

**Date:** 2026-04-07  
**Wave:** EXEC-02 — Frontend State Architecture Foundation  
**Status:** LOCKED for domains listed as ✅. DEFERRED domains documented separately.

---

## Ownership Registry

### Tier 0 — System Infrastructure

| State Atom | Owner | File | Notes |
|-----------|-------|------|-------|
| `toasts[]` | `useToast` | `src/hooks/useToast.js` | Pre-existing hook, unchanged |
| `addToast()` | `useToast` | ↑ | Passed as param to domain hooks needing it |

---

### Tier 1 — App Shell

| State Atom | Owner | File | Notes |
|-----------|-------|------|-------|
| `tab` | `App.jsx` | `src/App.jsx` | Navigation state — shell responsibility |
| `diskOverview` | `App.jsx` | ↑ | Multiple domains read it; shell owns writes |
| `ollamaStatus` | `App.jsx` | ↑ | Loaded with `diskOverview` in `loadDashboard` |
| `loading` | `App.jsx` | ↑ | Global loading overlay — shared across cleanup/drive/scan |
| `showSetup` | `App.jsx` | ↑ | First-run gate |
| `logEntries` | `App.jsx` | ↑ | History tab — app-level log |
| `driveModalDisk` | `App.jsx` | ↑ | Drive detail modal trigger |
| `driveModalReport` | `App.jsx` | ↑ | Drive detail modal data |
| `driveModalLoading` | `App.jsx` | ↑ | Drive detail modal loading |

**Shell effects:**
- `loadDashboard` (`useCallback`) → `getDiskOverview` + `checkOllama`
- `checkFirstRun` on mount → sets `showSetup`
- `loadHistory` on `tab==="history"` → `getCleanupLog`

---

### Tier 2 — API Keys Domain ✅ EXTRACTED

| State Atom | Owner | File | Notes |
|-----------|-------|------|-------|
| `apiKeys` | `useApiKeys` | `src/hooks/useApiKeys.js` | Loaded on mount from IPC |
| `apiKeyInputs` | `useApiKeys` | ↑ | Controlled input state |
| `apiTestResults` | `useApiKeys` | ↑ | Per-provider test result display |
| `apiTesting` | `useApiKeys` | ↑ | Per-provider loading flag |

**Handlers owned by `useApiKeys`:**
- `handleSaveApiKey(providerId)`
- `handleRemoveApiKey(providerId)`
- `handleTestApiKey(providerId)`
- `handleToggleApiKey(providerId, enabled)`

**IPC calls owned:**
- `getApiKeys`, `saveApiKey`, `removeApiKey`, `testApiKey`

**Dependencies received:**
- `addToast` — from `useToast` via App

**Consumers:**
- `App.jsx` — destructures and passes to `SettingsTab` and `ChatTab`
- `SettingsTab` — displays, allows edit/test/toggle
- `ChatTab` — reads `apiKeys` for provider availability check

---

### Tier 3 — Deep Scan Domain ✅ EXTRACTED

| State Atom | Owner | File | Notes |
|-----------|-------|------|-------|
| `deepScanResult` | `useDeepScan` | `src/hooks/useDeepScan.js` | Scan result from IPC |
| `deepScanLoading` | `useDeepScan` | ↑ | Scan in-progress flag |
| `deepCleanResults` | `useDeepScan` | ↑ | Clean results after deletion |

**Handlers owned by `useDeepScan`:**
- `handleDeepScan(options)` → `deepScanDrive(options)`
- `handleDeepClean(paths)` → `deepCleanItems(paths)` + disk refresh

**IPC calls owned:**
- `deepScanDrive`, `deepCleanItems`, `getDiskOverview` (read-only for refresh)

**Dependencies received:**
- `addToast` — from `useToast` via App
- `onDiskRefresh` — callback: `setDiskOverview` from App shell (cross-domain callback, clearly declared)

**Consumers:**
- `App.jsx` — destructures and passes as `{scanning, scanResult, cleanResults, onScan, onClean}` to `DeepScanTab`

**Cross-domain contract (explicit):**
- After a deep clean, the hook calls `getDiskOverview()` and passes result to `onDiskRefresh` callback
- `diskOverview` ownership stays in App shell — the hook only triggers a refresh, never owns the data

---

### Tier 4 — Chat Domain ✅ EXTRACTED

| State Atom | Owner | File | Notes |
|-----------|-------|------|-------|
| `chatMessages` | `useChat` | `src/hooks/useChat.js` | Message history |
| `chatInput` | `useChat` | ↑ | Controlled input |
| `chatLoading` | `useChat` | ↑ | Message in-flight flag |
| `chatModel` | `useChat` | ↑ | Selected Ollama model |
| `chatProvider` | `useChat` | ↑ | Active provider (ollama/openai/etc.) |
| `chatExternalModel` | `useChat` | ↑ | Selected external model |
| `chatReady` | `useChat` | ↑ | Computed — provider ready flag |

**Effects owned by `useChat`:**
- Auto-select `chatModel` from available Ollama models when `ollamaStatus` changes
- Auto-switch `chatProvider` when `apiKeys` changes (to first enabled external key)

**Handlers owned by `useChat`:**
- `sendChatMessage(text?)` — routes to `chatAI` or `chatExternal` based on provider
- `clearChat()` — clears messages + input

**IPC calls owned:**
- `chatAI`, `chatExternal`, `ensureOllamaRunning`

**Dependencies received:**
- `ollamaStatus` — from App shell (loaded by `loadDashboard`)
- `apiKeys` — from `useApiKeys` result, passed through App

**Consumers:**
- `App.jsx` — destructures and passes all 15 props to `ChatTab`

**Cross-domain input (explicit):**
- `ollamaStatus` is App-shell owned; `useChat` reads it reactively for model selection
- `apiKeys` is `useApiKeys`-owned; `useChat` reads it reactively for provider switching
- Neither creates ownership drift — `useChat` only reads, never writes, these cross-domain values

---

### Tier 5 — Schedule Domain ✅ EXTRACTED

| State Atom | Owner | File | Notes |
|-----------|-------|------|-------|
| `schedule` | `useSchedule` | `src/hooks/useSchedule.js` | Config object: `{enabled, days, time, actions, last_run}` |
| `scheduleLoading` | `useSchedule` | ↑ | Save in-progress flag |

**Effects owned by `useSchedule`:**
- Load schedule on mount via `getSchedule()`
- Polling interval (60s) to check and run pending schedule via `checkAndRunSchedule()`

**Handlers owned by `useSchedule`:**
- `handleSaveSchedule()`
- `toggleScheduleDay(day)`
- `toggleScheduleAction(actionType)`

**IPC calls owned:**
- `getSchedule`, `saveSchedule`, `checkAndRunSchedule`

**Dependencies received:**
- `addToast` — from `useToast` via App

**Consumers:**
- `App.jsx` — destructures and passes `{schedule, setSchedule, scheduleLoading, handleSaveSchedule, toggleScheduleDay, toggleScheduleAction}` to `CleanupTab`

---

### Tier 6 — Cleanup Domain (DEFERRED — DEBT-023)

| State Atom | Current Location | Reason for Deferral |
|-----------|-----------------|---------------------|
| `scanData` | `App.jsx` | Input to `executeCleanup`, shared with DashboardTab display |
| `scanMode` | `App.jsx` | Drive selection |
| `aiResult` | `App.jsx` | AI analysis result |
| `cleanupResults` | `App.jsx` | Per-action cleanup result |
| `selectedActions` | `App.jsx` | User selections |
| `showConfirm` | `App.jsx` | Confirmation modal trigger |
| `cleanupMode` | `App.jsx` | `ai` vs `manual` |
| `spaceBefore/After` | `App.jsx` | Space measurement from `diskOverview` |
| `showSpaceSaved` | `App.jsx` | Post-cleanup display |
| `zipLoading/zipResult` | `App.jsx` | ZIP backup |
| `sizeEstimates` | `App.jsx` | Estimated cleanup size |

**Three blockers for `useCleanup` extraction:**

1. **Tab coupling:** `handleScan` calls `setTab("cleanup")` — requires App's `tab` state setter
2. **diskOverview write:** `executeCleanup` calls `getDiskOverview()` and calls `setDiskOverview()` — App shell state write
3. **Global loading:** `loading` is shared between cleanup scan, execute, and other shell operations

**Resolution path (Wave 03):**
- Blocker 1: Pass `setTab` as callback parameter to `useCleanup`
- Blocker 2: Pass `setDiskOverview` callback similar to `useDeepScan`'s `onDiskRefresh`
- Blocker 3: Decide: either split `loading` into domain-local states, or pass `setLoading` as callback
- All three are resolvable — they just require deliberate boundary decisions before implementation

---

## Ownership Guarantee Matrix

| Guarantee | Status |
|-----------|--------|
| No dual ownership for `apiKeys` | ✅ CONFIRMED |
| No dual ownership for `deepScanResult` | ✅ CONFIRMED |
| No dual ownership for chat state | ✅ CONFIRMED |
| No dual ownership for schedule | ✅ CONFIRMED |
| `diskOverview` owned exclusively by App shell | ✅ CONFIRMED (hooks use callbacks to refresh) |
| `ollamaStatus` owned exclusively by App shell | ✅ CONFIRMED (hooks receive as read-only param) |
| No global store/context created | ✅ CONFIRMED — all hooks use local state |
| All extracted hooks used in runtime | ✅ CONFIRMED — each destructured in App.jsx |

**LOCKED as of EXEC-02. Next unlock event: Wave 03 (useCleanup boundary resolution).**
