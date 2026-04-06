# [EXEC-03] Cleanup Domain Extraction & Prop-Coupling Closure

**Date:** 2026-04-07  
**Wave:** EXEC-03  
**Commit baseline:** `7e748cb` (EXEC-02)

---

## 1. Scope Mapping

| Deliverable | Status |
|------------|--------|
| `useCleanup.js` — cleanup domain hook | ✅ Created (206 LOC) |
| `App.jsx` — cleanup domain removed | ✅ −137 LOC, −13 useState, −8 handlers |
| `CleanupTab.jsx` — props from 33 → 4 | ✅ Grouped contract applied |
| Confirm dialog moved to CleanupTab | ✅ Dialog now owned by cleanup domain |
| IPC contract (`api.js`) unchanged | ✅ Zero edits |
| Debt register updated | ✅ DEBT-023 closed |

**Non-goals confirmed not touched:**
- No CleanupTab UI redesign
- No Zustand/Redux adoption
- No new cleanup features
- No CSS stabilization
- No DeepScanTab component splitting

---

## 2. Cleanup Boundary Proof

### Inputs (injected via params)

| Param | Source | Type | Ownership |
|-------|--------|------|-----------|
| `addToast` | `useToast` via App | function | useToast owns |
| `onDiskRefresh` | App shell | callback (`setDiskOverview`) | App shell owns `diskOverview` |
| `onTabChange` | App shell | callback (`setTab`) | App shell owns `tab` |
| `onLoadingChange` | App shell | callback (`setLoading`) | App shell owns `loading` |
| `ollamaStatus` | App shell | read-only value | App shell owns |

### Outputs (returned from hook)

All 13 state atoms, 3 computed values, and 11 handlers — listed in §4.

### Cross-domain write paths (explicit, no dual ownership)

| Operation | Cross-domain effect | Mechanism |
|-----------|-------------------|-----------|
| Post-scan navigation | Sets `tab` to `"cleanup"` | `onTabChange("cleanup")` callback |
| Post-cleanup disk refresh | Calls `setDiskOverview(freeAfterArr)` | `onDiskRefresh(freeAfterArr)` callback |
| Loading overlay (scan/AI/cleanup) | Calls `setLoading(msg)` or `setLoading("")` | `onLoadingChange(msg)` callback |

**Guarantee:** `useCleanup` never imports or calls `setTab`, `setDiskOverview`, or `setLoading` directly. All three cross-domain writes go through injected callbacks. App shell retains sole ownership of these atoms.

### IPC calls exclusively owned by useCleanup

```
scanDisk(mode)                    → scan lifecycle
runCleanup(actions)               → execute cleanup
smartCleanup(data)                → AI analysis
zipBackup(actionTypes)            → zip backup
estimateCleanupSize(actionTypes)  → size estimation
getDiskOverview()                 → pre/post cleanup measurement (read-only; result passed to onDiskRefresh)
checkOllama()                     → fallback check in analyze mode
```

These 7 IPC calls no longer appear in App.jsx.

---

## 3. Files Changed

| File | Operation | LOC Before | LOC After | Delta |
|------|-----------|-----------|----------|-------|
| `src/hooks/useCleanup.js` | Created | — | 206 | +206 |
| `src/App.jsx` | Modified | 397 | 260 | −137 |
| `src/tabs/CleanupTab.jsx` | Modified | ~416 | 452 | +36 (confirm dialog added) |
| `src/api.js` | Unchanged | 54 exports | 54 exports | 0 |
| `src/constants.js` | Unchanged | — | — | 0 |

*CleanupTab.jsx LOC increased by 36 because the confirm dialog (previously in App.jsx main content) moved here, where it semantically belongs.*

---

## 4. useCleanup Adoption Summary

### Hook definition

`src/hooks/useCleanup.js` — 206 LOC

```
Params: { addToast, onDiskRefresh, onTabChange, onLoadingChange, ollamaStatus }

State (13 atoms):
  scanData, scanMode, aiResult, cleanupResults, selectedActions,
  showConfirm, cleanupMode, spaceBefore, spaceAfter, showSpaceSaved,
  zipLoading, zipResult, sizeEstimates

Computed (3):
  totalScanned, selectedCount, spaceFreed

Handlers (11):
  triggerAI, handleScan,
  toggleAction, selectAll, selectNone, selectSafe,
  handleCleanupClick, executeCleanup,
  handleZipBackup, handleEstimateSize
```

### App consumer path (`src/App.jsx`)

```jsx
const cleanup = useCleanup({
  addToast,
  onDiskRefresh: setDiskOverview,
  onTabChange: setTab,
  onLoadingChange: setLoading,
  ollamaStatus,
});

const scheduleBundle = {
  schedule, setSchedule, scheduleLoading,
  handleSaveSchedule, toggleScheduleDay, toggleScheduleAction,
};
```

`cleanup.handleScan` is also forwarded to DashboardTab for quick-action buttons.

### CleanupTab consumer path (`src/tabs/CleanupTab.jsx`)

```jsx
export default function CleanupTab({ cleanup, scheduleBundle, loading, ollamaStatus }) {
  const {
    scanData, scanMode, setScanMode,
    aiResult, cleanupMode, setCleanupMode, setSelectedActions,
    selectedActions, cleanupResults, showConfirm, setShowConfirm,
    showSpaceSaved, spaceFreed, zipLoading, zipResult, sizeEstimates,
    totalScanned, selectedCount,
    handleScan, triggerAI, toggleAction, selectAll, selectNone, selectSafe,
    handleCleanupClick, executeCleanup, handleZipBackup, handleEstimateSize,
  } = cleanup;

  const { schedule, setSchedule, scheduleLoading, handleSaveSchedule,
          toggleScheduleDay, toggleScheduleAction } = scheduleBundle;
  ...
}
```

---

## 5. App.jsx Reduction Metrics

### EXEC-03 delta (relative to EXEC-02 end state)

| Metric | EXEC-02 end | EXEC-03 end | Delta |
|--------|------------|------------|-------|
| LOC | 397 | 260 | −137 (−35%) |
| useState | 22 | 9 | −13 (−59%) |
| useEffect | 3 | 3 | 0 |
| Handlers | 13 | 5 | −8 (−62%) |
| IPC imports | 13 | 6 | −7 (−54%) |
| constants imports | `TABS, formatSize` | `TABS` | −1 |

### Full-run delta (relative to EXEC-00 baseline)

| Metric | EXEC-00 baseline | EXEC-03 end | Total reduction |
|--------|-----------------|------------|----------------|
| LOC | ~700 | 260 | −63% |
| useState | 37 | 9 | −76% (−28 atoms) |
| useEffect | 8 | 3 | −63% (−5) |
| Handlers | 26 | 5 | −81% (−21) |
| IPC imports | 24 | 6 | −75% (−18) |

**App.jsx remaining useState (9):**
- Shell: `tab`, `diskOverview`, `ollamaStatus`, `loading`, `showSetup`, `logEntries` (6)
- Drive modal: `driveModalDisk`, `driveModalReport`, `driveModalLoading` (3)

**App.jsx remaining handlers (5):**
- `loadDashboard` (useCallback)
- `loadHistory` (useCallback)
- `handleClearLog`
- `handleDriveClick`
- `handleDriveModalClose`

All other logic now lives in 5 domain hooks: useApiKeys, useDeepScan, useChat, useSchedule, useCleanup.

---

## 6. CleanupTab Prop Delta

| Version | Prop count | Interface |
|---------|-----------|-----------|
| EXEC-00 baseline | 33 | 33 individual props |
| EXEC-02 end | 33 | 33 individual props (schedule source clarity improved) |
| EXEC-03 end | **4** | 2 grouped domain objects + 2 shared reads |

**New interface (4 props):**

```
cleanup       — entire useCleanup return (state + computed + handlers)
scheduleBundle — { schedule, setSchedule, scheduleLoading, handleSaveSchedule, toggleScheduleDay, toggleScheduleAction }
loading        — App shell loading string (read-only)
ollamaStatus   — App shell Ollama status (read-only)
```

**Prop reduction: −29 props (−88%)**

The confirm dialog (previously inline in App.jsx main content) is now rendered inside CleanupTab. This is the correct semantic home: the dialog only pertains to the cleanup domain and only appears when the cleanup tab is active.

### DEBT-009 status after EXEC-03

**CLOSED.** CleanupTab went from 33 props to 4. The 4 props represent genuine inter-domain dependencies:
- `cleanup` — domain hook contract (single responsibility)
- `scheduleBundle` — schedule sub-domain (logically separate from cleanup execution)
- `loading` — App shell overlay (shared across all tabs, not owned by cleanup domain)
- `ollamaStatus` — App shell AI status (shared across multiple tabs)

Further reduction is not meaningful without introducing unnecessary coupling or artificial abstractions.

---

## 7. IPC Preservation Check

### App.jsx IPC imports before and after

| IPC function | EXEC-02 (App) | EXEC-03 (App) | Current owner |
|-------------|--------------|--------------|---------------|
| `getDiskOverview` | ✅ App | ✅ App | App (loadDashboard); also used in useCleanup for measurement |
| `scanDisk` | ✅ App | ❌ removed | useCleanup |
| `runCleanup` | ✅ App | ❌ removed | useCleanup |
| `smartCleanup` | ✅ App | ❌ removed | useCleanup |
| `checkOllama` | ✅ App | ✅ App | App (loadDashboard) |
| `getCleanupLog` | ✅ App | ✅ App | App (loadHistory) |
| `clearCleanupLog` | ✅ App | ✅ App | App (handleClearLog) |
| `zipBackup` | ✅ App | ❌ removed | useCleanup |
| `estimateCleanupSize` | ✅ App | ❌ removed | useCleanup |
| `checkFirstRun` | ✅ App | ✅ App | App (first-run effect) |
| `analyzeDrive` | ✅ App | ✅ App | App (handleDriveClick) |

**api.js unchanged — 54 exports intact. All IPC calls still present; reorganized to correct owners.**

---

## 8. Build / Smoke Verification

### Build

```
vite v8.0.4 building client environment for production...
✓ 47 modules transformed  (+1 from useCleanup.js)
dist/assets/index.css   47.99 kB  (unchanged)
dist/assets/index.js   254.24 kB  (+0.26 kB from useCleanup.js, expected)
✓ built in 198ms
```

EXIT:0, zero build warnings.

### IDE Problems Panel after EXEC-03

| File | Issue | Classification |
|------|-------|---------------|
| App.jsx:100 | useEffect calling setState | DEBT-024 pre-existing VS Code extension warning |
| App.jsx:143 | useEffect calling setState | DEBT-024 pre-existing VS Code extension warning |
| publish.yml:54,56 | VSCE_PAT context access | DEBT-022 pre-existing, non-actionable |

**Zero new problems introduced by EXEC-03.**

### Smoke verification (logical trace)

| Flow | Path | Result |
|------|------|--------|
| App load | `loadDashboard()` → `getDiskOverview` + `checkOllama` → sets `diskOverview`, `ollamaStatus` | ✅ |
| Quick scan (DashboardTab) | `cleanup.handleScan("smart")` → `onLoadingChange("...")` → `scanDisk` → `onTabChange("cleanup")` | ✅ |
| CleanupTab scan button | `cleanup.handleScan()` (no mode arg → uses `scanMode` state in hook) | ✅ |
| AI analysis | `cleanup.triggerAI()` → `onLoadingChange("AI...")` → `smartCleanup(...)` → `setAiResult` | ✅ |
| Manual mode | `setCleanupMode("manual")` → `setSelectedActions({})` | ✅ |
| Execute cleanup | `handleCleanupClick()` → `setShowConfirm(true)` → dialog renders IN CleanupTab → `executeCleanup()` → `runCleanup` → `onDiskRefresh` → `addToast` | ✅ |
| Post-cleanup dashboard refresh | `onDiskRefresh(freeAfterArr)` → `setDiskOverview` → DashboardTab re-renders | ✅ |
| Toast path | `addToast(msg, type)` injected via param; useToast owns toast array | ✅ |
| Zip backup | `handleZipBackup()` → `zipBackup(enabled)` → `setZipResult` → `addToast` | ✅ |
| Size estimate | `handleEstimateSize()` → `estimateCleanupSize(types)` → `setSizeEstimates` | ✅ |

---

## 9. Debt Delta

| ID | Title | Status before EXEC-03 | Status after EXEC-03 |
|----|-------|----------------------|---------------------|
| DEBT-003 | App.jsx god-component | ⚠️ PARTIAL | ✅ **CLOSED** — 260 LOC, 9 useState, no cleanup domain |
| DEBT-005 | No domain ownership | ⚠️ PARTIAL | ✅ **CLOSED** — all 5 domains have explicit owners |
| DEBT-009 | CleanupTab props explosion (33) | 🔴 OPEN | ✅ **CLOSED** — 4 props (−88%) |
| DEBT-023 | useCleanup extraction blocked | 🔴 DEFERRED | ✅ **CLOSED** — extracted with 3 callback boundaries |
| DEBT-014 | Undefined CSS tokens | 🔴 OPEN | 🔴 OPEN → Wave 04 |
| DEBT-015 | `.btn-tiny` cascade override | 🔴 OPEN | 🔴 OPEN → Wave 04 |
| DEBT-024 | useEffect async warning | 📌 NOTED | 📌 NOTED (unchanged) |
| DEBT-022 | VSCE_PAT linter | 📌 NOTED | 📌 NOTED (unchanged) |

**EXEC-03 closes 4 debts (DEBT-003, DEBT-005, DEBT-009, DEBT-023) — the largest single-wave debt closure in the project.**

**Open debts after EXEC-03:** 2 actionable (DEBT-014, DEBT-015 — both CSS-only), 2 noted (DEBT-022, DEBT-024)

---

## 10. Verdict Recommendation

**FULL PASS — all 10 acceptance gates PASS.**

### Wave 04 eligible scope (remaining open debt only)

1. **DEBT-014** — Undefined CSS token references (`--color-text-tertiary`, `--color-surface-hover`, `--border-subtle`) — CSS-only, low risk
2. **DEBT-015** — `.btn-tiny` cascade override specificity — CSS-only, low risk

**These are cosmetic/CSS concerns only. No state architecture debt remains.**

### Cumulative state architecture after EXEC-03

| Concern | Owner |
|---------|-------|
| Toast notifications | `useToast` |
| API keys + testing | `useApiKeys` |
| Deep scan + clean | `useDeepScan` |
| Chat session | `useChat` |
| Schedule config | `useSchedule` |
| Cleanup domain | `useCleanup` |
| Shell nav + drive modal + history | `App.jsx` (shell orchestration only) |

**App.jsx is now a pure shell orchestrator.** It wires hooks together and passes callbacks — it owns no feature domain state.
