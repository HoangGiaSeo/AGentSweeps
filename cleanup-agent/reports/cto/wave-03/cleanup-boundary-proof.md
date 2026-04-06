# [EXEC-03] Cleanup Boundary Proof

**Date:** 2026-04-07  
**Wave:** EXEC-03  
**Purpose:** Formally document the ownership boundary of `useCleanup` before its extraction — serving as the contract that prevents future dual-ownership drift.

---

## Boundary Statement

`useCleanup` owns the **cleanup execution domain** exclusively. It does not own and must not write to App shell state directly. All cross-domain side effects are routed through injected callbacks.

---

## Input Contract

```
useCleanup({
  addToast,          // function(message, type) — toast emission, owned by useToast
  onDiskRefresh,     // function(diskArray)     — owned by App shell: setDiskOverview
  onTabChange,       // function(tabId)         — owned by App shell: setTab
  onLoadingChange,   // function(message|"")    — owned by App shell: setLoading
  ollamaStatus,      // object|null             — read-only from App shell
})
```

**Why these 5 and not fewer:**

1. `addToast` — cleanup operations surface success/failure to the user; toast is a shared notification mechanism. Injecting avoids useCleanup importing useToast directly (which would create a second provider instance).

2. `onDiskRefresh` — after `executeCleanup`, the disk overview must be refreshed so DashboardTab shows updated free space. `diskOverview` is read by DashboardTab, DeepScanTab, and the drive modal. App shell is the only safe single owner.

3. `onTabChange` — after `handleScan`, the user is automatically navigated to the cleanup tab. `tab` is App shell navigation state, shared across all tabs and sidebar rendering.

4. `onLoadingChange` — the global loading overlay is displayed during scan (2–10s), AI analysis (5–30s), and cleanup execution (3–20s). Multiple concurrent operations could conflict if each hook had its own overlay. App shell owns the single overlay string.

5. `ollamaStatus` — needed by `handleScan` in "analyze" mode to decide whether to trigger AI analysis immediately. The status is loaded by `loadDashboard` (App shell) and shared with ChatTab and SettingsTab. Making useCleanup call `checkOllama()` independently would cause stale status reads; receiving the current value from App shell is correct.

---

## Output Contract

### State atoms (13)

| Atom | Type | Initial | Description |
|------|------|---------|-------------|
| `scanData` | `[]` | `[]` | Scan result items from IPC |
| `scanMode` | `string` | `"smart"` | Selected scan mode |
| `aiResult` | `object\|null` | `null` | AI analysis result from smartCleanup |
| `cleanupResults` | `[]` | `[]` | Per-action result from runCleanup |
| `selectedActions` | `{}` | `{}` | Map of `actionType → boolean` |
| `showConfirm` | `boolean` | `false` | Confirmation dialog visibility |
| `cleanupMode` | `string` | `"ai"` | `"ai"` or `"manual"` |
| `spaceBefore` | `number` | `0` | Free bytes on C: before cleanup |
| `spaceAfter` | `number` | `0` | Free bytes on C: after cleanup |
| `showSpaceSaved` | `boolean` | `false` | Space saved summary visibility |
| `zipLoading` | `boolean` | `false` | Zip backup in progress |
| `zipResult` | `object\|null` | `null` | Zip backup result |
| `sizeEstimates` | `{}` | `{}` | Map of `actionType → estimate object` |

### Computed values (3, derived from state, not stored)

| Computed | Formula | Description |
|---------|---------|-------------|
| `totalScanned` | `scanData.reduce((sum, i) => sum + i.size_bytes, 0)` | Total bytes found in scan |
| `selectedCount` | `Object.values(selectedActions).filter(Boolean).length` | Count of checked actions |
| `spaceFreed` | `spaceAfter > spaceBefore ? spaceAfter - spaceBefore : 0` | Freed bytes |

### Handlers (11)

| Handler | IPC calls | Cross-domain effects |
|---------|----------|---------------------|
| `handleScan(mode?)` | `scanDisk`, `checkOllama` | `onTabChange`, `onLoadingChange` |
| `triggerAI(data?)` | `smartCleanup` | `onLoadingChange` |
| `toggleAction(type)` | none | none |
| `selectAll()` | none | none |
| `selectNone()` | none | none |
| `selectSafe()` | none | none |
| `handleCleanupClick()` | none | none (sets showConfirm) |
| `executeCleanup()` | `getDiskOverview`, `runCleanup` | `onDiskRefresh`, `onLoadingChange` |
| `handleZipBackup()` | `zipBackup` | none |
| `handleEstimateSize()` | `estimateCleanupSize` | none |
| `setShowConfirm` | none | none (passed for dialog dismiss) |

---

## Cross-Domain Write Paths — Verification

### Path 1: Tab navigation after scan

**Trigger:** `handleScan(mode)` completes successfully  
**Effect:** User navigates to cleanup tab  
**Implementation:** `onTabChange("cleanup")` — calls `setTab` in App shell  
**Ownership proof:** `useCleanup` does NOT call `setTab` directly. It calls `onTabChange`, which is `setTab` from App scope. `tab` state atom lives in App.

### Path 2: Disk overview refresh after cleanup

**Trigger:** `executeCleanup()` completes  
**Effect:** DashboardTab shows updated disk free space  
**Implementation:** 
```js
const freeAfterArr = await getDiskOverview();
onDiskRefresh(freeAfterArr); // → calls setDiskOverview in App
```
**Ownership proof:** `useCleanup` reads disk data for space measurement (legitimate read), then calls `onDiskRefresh` to update App's `diskOverview`. The hook does not import or call `setDiskOverview` directly.

Same pattern as `useDeepScan.onDiskRefresh` (established in EXEC-02).

### Path 3: Global loading overlay

**Trigger:** Start/end of `handleScan`, `triggerAI`, `executeCleanup`  
**Effect:** Full-screen loading overlay shown/hidden  
**Implementation:** `onLoadingChange("message")` and `onLoadingChange("")`  
**Ownership proof:** `loading` is App shell state. useCleanup only calls the callback.

**Timing correctness:** `triggerAI` is awaited inside `handleScan`. The `onLoadingChange("")` at the end of `handleScan` runs after triggerAI completes. Double-clear (triggerAI clears loading, then handleScan clears again) is harmless — same behavior as original App.jsx code.

---

## Blocker Resolution Table (EXEC-03 response to EXEC-02 DEBT-023)

| Blocker (EXEC-02) | Resolution |
|-------------------|-----------|
| Blocker 1: `handleScan` calls `setTab("cleanup")` | Resolved via `onTabChange` callback param |
| Blocker 2: `executeCleanup` calls `setDiskOverview` | Resolved via `onDiskRefresh` callback param (same pattern as useDeepScan) |
| Blocker 3: `loading` is shared between cleanup and shell ops | Resolved via `onLoadingChange` callback param |

All 3 blockers used **Option A** from the EXEC-02 deferred analysis: accept callback param rather than domain-local loading. This maintains the single App shell loading overlay, which is correct because cleanup operations can overlap with drive modal loads.

---

## Dual-Ownership Proof: None

After EXEC-03, the following atoms have exactly one owner:

| State Atom | Sole Owner | Proof |
|-----------|-----------|-------|
| `tab` | App shell | only set via `setTab` from App scope; `onTabChange` callback does not change ownership |
| `diskOverview` | App shell | only set via `setDiskOverview` from App scope; `onDiskRefresh` and `useDeepScan.onDiskRefresh` both update via the same setter, which is correct (App owns, multiple hooks can trigger refresh) |
| `loading` | App shell | only set via `setLoading` from App scope; hooks call `onLoadingChange` which resolves to the same setter |
| `scanData` | `useCleanup` | set only inside useCleanup; not accessible from App.jsx |
| `aiResult` | `useCleanup` | set only inside useCleanup |
| all 13 cleanup atoms | `useCleanup` | none exposed to App.jsx as writable references |

**Verdict: Zero dual ownership.**
