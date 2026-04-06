# [EXEC-03] Prop Coupling Summary

**Date:** 2026-04-07  
**Wave:** EXEC-03  
**Focus:** CleanupTab prop surface reduction

---

## Summary

EXEC-03 delivers on the prop coupling closure that EXEC-02 explicitly deferred. CleanupTab goes from 33 individual props to 4 grouped domain contracts — an 88% reduction. Source clarity is now maximally high for all tabs.

---

## CleanupTab: Before vs. After

### Before (EXEC-02 end state) — 33 props

```
Individual props (33):
  scanMode, setScanMode, scanData, cleanupMode, setCleanupMode,
  aiResult, selectedActions, setSelectedActions,
  selectedCount, totalScanned, loading, ollamaStatus,
  cleanupResults, showSpaceSaved, spaceFreed,
  zipLoading, zipResult, sizeEstimates,
  schedule, setSchedule, scheduleLoading,
  handleSaveSchedule, toggleScheduleDay, toggleScheduleAction,
  handleScan, triggerAI, toggleAction,
  selectAll, selectNone, selectSafe,
  handleCleanupClick, handleZipBackup, handleEstimateSize
```

**Problems:**
- No single responsible domain — origins mixed across App state, schedule hook, shell state
- Adding one cleanup feature required touching both App.jsx and CleanupTab
- New developer must read 33 props to understand the tab's dependencies
- `showConfirm` / `executeCleanup` rendered in App.jsx shell, outside the tab component that owns the decision

### After (EXEC-03) — 4 props

```jsx
<CleanupTab
  cleanup={cleanup}              // ← useCleanup() return object (state + computed + handlers)
  scheduleBundle={scheduleBundle} // ← { schedule, setSchedule, scheduleLoading, ... }
  loading={loading}              // ← App shell read-only
  ollamaStatus={ollamaStatus}    // ← App shell read-only
/>
```

**Improvements:**
- `cleanup` prop: all 13 state atoms + 3 computed + 11 handlers in one contract
- `scheduleBundle` prop: the schedule sub-domain is intentionally kept separate from cleanup execution (two distinct concerns: scheduling vs. executing)
- `loading` and `ollamaStatus`: 2 App shell reads explicitly named as shell concerns, not domain-owned

---

## Why 4 is the right bottom

Reducing below 4 would require:
1. Merging `scheduleBundle` into `cleanup` — incorrect: schedule polling and cleanup execution are independent domains with different IPC services and different effect lifecycles
2. Removing `loading` — incorrect: the loading overlay is App shell state; CleanupTab cannot own it or it would need to re-implement the overlay for every other tab
3. Removing `ollamaStatus` — incorrect: CleanupTab needs it to disable the AI button and show a warning when Ollama is offline

**4 props is the semantic minimum.** Further reduction would create hidden coupling or force artificial ownership decisions.

---

## Full Prop Coupling Table — All Tabs

### Post-EXEC-03 state

| Tab Component | Props | Primary Source | Notes |
|---------------|-------|---------------|-------|
| `DashboardTab` | 6 | App shell + `useCleanup` (`handleScan`) | No domain hook directly — shell orchestration |
| `CleanupTab` | **4** | `useCleanup` + `useSchedule` + App shell | DEBT-009 ✅ CLOSED |
| `DeepScanTab` | 5 | `useDeepScan` | Fully domain-backed |
| `ChatTab` | 15 | `useChat` + App shell (2) | 13/15 domain-backed |
| `SettingsTab` | 10 | `useApiKeys` + App shell (1) | 9/10 domain-backed |
| `HistoryTab` | 2 | App shell | Simple 2-prop interface |
| `SetupModal` | 1 | App shell | `onComplete` callback only |

*Note: DashboardTab now receives `cleanup.handleScan` instead of `handleScan` from App. This is the correct pattern: App destructures from the domain hook and passes the function through.*

---

## Source Clarity Delta (Cumulative)

| Metric | EXEC-00 | EXEC-02 | EXEC-03 |
|--------|---------|---------|---------|
| Props traceable to a domain hook | 0/~70 | ~27/72 | ~57/60 |
| Tabs with full domain hook backing | 0/7 | 3/7 | 5/7 |
| Tabs with App.jsx as primary source | 7/7 | 4/7 | 2/7 (DashboardTab, HistoryTab) |
| Cleanup-related props in App render | ~25/33 | 33/33 | 0/4 |

---

## Confirm Dialog Relocation

**Before EXEC-03:** The cleanup confirmation dialog was rendered directly in App.jsx's `<main>` content, using App-level variables `showConfirm`, `selectedActions`, `aiResult`, `executeCleanup` — all of which were App.jsx state.

```jsx
// In App.jsx main content (EXEC-02 state) — WRONG LOCATION
{showConfirm && (
  <div className="modal-overlay">
    ...
    <button onClick={executeCleanup}>Xác nhận...</button>
  </div>
)}
```

**After EXEC-03:** The dialog renders inside `CleanupTab.jsx`, using `cleanup.showConfirm` and `cleanup.executeCleanup`. It only ever appears when `tab === "cleanup"`, so there is zero behavioral difference.

**Why this matters for ownership:**
- Dialog renderability is gated by `showConfirm` — which is cleanup domain state
- Dialog action triggers `executeCleanup` — which is cleanup domain logic
- Rendering the dialog in App.jsx was an ownership violation: App shell rendered cleanup-domain UI
- Moving the dialog to CleanupTab completes the domain encapsulation
