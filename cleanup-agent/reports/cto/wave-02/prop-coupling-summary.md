# [EXEC-02] Prop Coupling Summary

**Date:** 2026-04-07  
**Wave:** EXEC-02 — Frontend State Architecture Foundation  
**Baseline Wave:** EXEC-00 (initial audit)

---

## Intent Clarification

EXEC-02 is a **data-source refactoring**, not a **prop-interface refactoring**.

The goal was to extract domain state from `App.jsx` into domain hooks — clearing god-component debt without touching the JSX prop interfaces. This is deliberate: changing both the data source and the interface simultaneously creates dual-class diffs that are harder to verify and rollback independently.

**Result:** Prop counts are unchanged from EXEC-00 baseline. Source clarity is improved.  
**Wave 03 target:** CleanupTab props explosion (DEBT-009) — 33 props → targeted reduction via `useCleanup` extraction + context boundary decisions.

---

## Prop Count Table — Before vs. After EXEC-02

| Tab Component | Props (EXEC-00) | Props (EXEC-02) | Delta | Source Before | Source After |
|---------------|----------------|----------------|-------|---------------|--------------|
| `DashboardTab` | 4 | 4 | 0 | App.jsx state | App.jsx state (unchanged) |
| `CleanupTab` | 33 | 33 | 0 | App.jsx state | App.jsx state (unchanged — DEBT-023) |
| `DeepScanTab` | 5 | 5 | 0 | App.jsx state | → `useDeepScan` via App |
| `ChatTab` | 15 | 15 | 0 | App.jsx state | → `useChat` via App |
| `SettingsTab` | 10 | 10 | 0 | App.jsx state | → `useApiKeys` via App |
| `HistoryTab` | 3 | 3 | 0 | App.jsx state | App.jsx state (unchanged) |
| `SetupModal` | 2 | 2 | 0 | App.jsx state | App.jsx state (unchanged) |

**Total prop-passing lines across all tabs:** unchanged

---

## Tab-Level Prop Inventory

### DashboardTab — 4 props (App shell → Tab)
```jsx
<DashboardTab
  diskOverview={diskOverview}      // App: shell
  ollamaStatus={ollamaStatus}      // App: shell
  onDriveClick={handleDriveClick}  // App: handler
  formatSize={formatSize}          // constants.js: utility
/>
```
Source: App shell state only. No domain hook data flows here.

---

### DeepScanTab — 5 props (useDeepScan → App → Tab)
```jsx
<DeepScanTab
  scanning={deepScanLoading}        // ← useDeepScan
  scanResult={deepScanResult}       // ← useDeepScan
  cleanResults={deepCleanResults}   // ← useDeepScan
  onScan={handleDeepScan}           // ← useDeepScan
  onClean={handleDeepClean}         // ← useDeepScan
/>
```
**Source clarity improvement:** All 5 props now traceable to `useDeepScan` — zero ambiguity about data origin.

---

### ChatTab — 15 props (useChat + App → Tab)
```jsx
<ChatTab
  messages={chatMessages}                    // ← useChat
  input={chatInput}                          // ← useChat
  setInput={setChatInput}                    // ← useChat
  loading={chatLoading}                      // ← useChat
  onSend={sendChatMessage}                   // ← useChat
  onClear={clearChat}                        // ← useChat
  model={chatModel}                          // ← useChat
  setModel={setChatModel}                    // ← useChat
  provider={chatProvider}                    // ← useChat
  setProvider={setChatProvider}              // ← useChat
  externalModel={chatExternalModel}          // ← useChat
  setExternalModel={setChatExternalModel}    // ← useChat
  ollamaStatus={ollamaStatus}                // ← App shell
  apiKeys={apiKeys}                          // ← useApiKeys (via App)
  chatReady={chatReady}                      // ← useChat (computed)
/>
```
**Source clarity improvement:** 13/15 props now traceable to `useChat`. The 2 external props (`ollamaStatus`, `apiKeys`) are clearly passed through rather than created inline in App.

---

### SettingsTab — 10 props (useApiKeys → App → Tab)
```jsx
<SettingsTab
  apiKeys={apiKeys}                    // ← useApiKeys
  apiKeyInputs={apiKeyInputs}          // ← useApiKeys
  setApiKeyInputs={setApiKeyInputs}    // ← useApiKeys
  apiTestResults={apiTestResults}      // ← useApiKeys
  apiTesting={apiTesting}              // ← useApiKeys
  onSave={handleSaveApiKey}            // ← useApiKeys
  onRemove={handleRemoveApiKey}        // ← useApiKeys
  onTest={handleTestApiKey}            // ← useApiKeys
  onToggle={handleToggleApiKey}        // ← useApiKeys
  ollamaStatus={ollamaStatus}          // ← App shell
/>
```
**Source clarity improvement:** 9/10 props are `useApiKeys`-owned. Only `ollamaStatus` comes from App shell (displayed as status indicator in settings).

---

### CleanupTab — 33 props (App.jsx only — DEBT-009 open)
```jsx
<CleanupTab
  // --- Schedule (6 props) — now sourced from useSchedule via App ---
  schedule={schedule}
  setSchedule={setSchedule}
  scheduleLoading={scheduleLoading}
  handleSaveSchedule={handleSaveSchedule}
  toggleScheduleDay={toggleScheduleDay}
  toggleScheduleAction={toggleScheduleAction}
  // --- Shell (2 props) ---
  diskOverview={diskOverview}
  ollamaStatus={ollamaStatus}
  // --- Cleanup domain (25 props — DEBT-023 deferred) ---
  scanData={scanData}
  scanMode={scanMode}
  setScanMode={setScanMode}
  aiResult={aiResult}
  cleanupResults={cleanupResults}
  selectedActions={selectedActions}
  setSelectedActions={setSelectedActions}
  showConfirm={showConfirm}
  setShowConfirm={setShowConfirm}
  cleanupMode={cleanupMode}
  setCleanupMode={setCleanupMode}
  spaceBefore={spaceBefore}
  spaceAfter={spaceAfter}
  showSpaceSaved={showSpaceSaved}
  setShowSpaceSaved={setShowSpaceSaved}
  zipLoading={zipLoading}
  zipResult={zipResult}
  sizeEstimates={sizeEstimates}
  onScan={handleScan}
  onCleanup={executeCleanup}
  onBackup={handleBackup}
  onConfirmCleanup={confirmCleanup}
  onCancelCleanup={() => setShowConfirm(false)}
  formatSize={formatSize}
  addToast={addToast}
/>
```
**Status:** DEBT-009 open. 6 schedule props now sourced from `useSchedule` rather than inline App state — source visibility improved, but count unchanged.  
**Wave 03 target:** Extract `useCleanup`, resolve DEBT-023 blockers, refactor into 3-4 compound prop groups to reduce pass-through count.

---

### HistoryTab — 3 props (App shell → Tab)
```jsx
<HistoryTab
  logEntries={logEntries}        // App shell
  onClearLog={handleClearLog}    // App shell
  formatSize={formatSize}        // constants.js
/>
```

---

### SetupModal — 2 props (App shell → modal)
```jsx
<SetupModal
  onClose={() => setShowSetup(false)}  // App shell
  addToast={addToast}                  // useToast
/>
```

---

## Source Clarity Delta

| Metric | EXEC-00 | EXEC-02 |
|--------|---------|---------|
| Props with App.jsx as data origin | ~70/72 | ~45/72 |
| Props with domain hook as data origin | 0/72 | ~27/72 |
| Props traceable to single file without reading App.jsx | low | high (DeepScanTab: 5/5, SettingsTab: 9/10, ChatTab: 13/15) |
| Tabs with full domain hook backing | 0 | 3 (DeepScanTab, ChatTab, SettingsTab) |
| Tabs pending domain hook backing | all | 2 (CleanupTab, HistoryTab) |

---

## Wave 03 Prop Reduction Forecast (CleanupTab)

Assuming `useCleanup` extracted + cleanup context object introduced:

| Approach | Projected CleanupTab Props |
|----------|---------------------------|
| Current (EXEC-02) | 33 |
| After `useCleanup` extraction (Wave 03) | ~14 (7 cleanup compound obj + 6 schedule + 1 shell) |
| Target | ≤ 15 |

This forecast is non-binding. Actual reduction depends on DEBT-023 boundary decisions made in Wave 03.
