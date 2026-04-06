# [EXEC-06] Agentic Chat V1 — Wave Report

**Wave:** EXEC-06  
**Status:** COMPLETE — All gates PASS  
**Date:** 2026-04-07  
**Build:** CSS 49.15 kB / JS 260.07 kB — EXIT:0  
**Tests:** 64/64 PASS  

---

## 1. Scope Mapping

| Blueprint Goal | Implementation |
|---------------|---------------|
| chat auto-collects context from 2 read-only tools | ✅ disk_overview + cleanup_log |
| locked V1 keyword allowlist | ✅ toolRegistry.js AGENT_TOOLS |
| freshness policy for disk data | ✅ freshnessPolicy.js |
| redaction pipeline for cleanup log | ✅ redactionPipeline.js — single pipeline for all providers |
| context composition with metadata | ✅ contextComposer.js with freshness + captured_at |
| tool bubble UI expand/collapse only | ✅ ToolBubble component in ChatTab.jsx |
| external provider never receives raw log | ✅ containsPathLikeContent() safety gate |
| no destructive actions via chat | ✅ useChat.js read-only only — grep verified |
| no multi-step chaining | ✅ sequential fetch, no autonomous loop |
| normal chat unaffected when no tools match | ✅ buildEnrichedMessage returns original when no tools |

---

## 2. Files Changed

### New files (chatTools helper modules)

| File | Purpose |
|------|---------|
| `src/hooks/chatTools/toolRegistry.js` | Locked V1 keyword allowlist, freshness/stale constants |
| `src/hooks/chatTools/intentDetector.js` | `detectTools()`, `isForceRefresh()` — pure functions |
| `src/hooks/chatTools/freshnessPolicy.js` | `evaluateDiskCacheDecision()`, `evaluateFreshFetchFallback()` |
| `src/hooks/chatTools/redactionPipeline.js` | `redactLogEntry()`, `formatRedactedLog()`, `containsPathLikeContent()` |
| `src/hooks/chatTools/contextComposer.js` | `composeDiskContext()`, `composeLogContext()`, `buildEnrichedMessage()` |
| `src/hooks/__tests__/useChat.agentic.test.js` | 64 unit tests covering U01–U15 |

### Modified files

| File | Change Summary |
|------|---------------|
| `src/hooks/useChat.js` | Added tool orchestration: diskCacheRef, fetchSingleToolContext, fetchAllToolContexts, toolStatus state; imports all helpers |
| `src/tabs/ChatTab.jsx` | Added ToolBubble component; `toolStatus` prop; role:"tool" message renderer; toolStatus in loading bubble |
| `src/styles/chat.css` | Added tool bubble CSS: `.chat-tool-bubble`, `.chat-tool-header`, `.chat-tool-tag`, `.chat-tool-toggle`, `.chat-tool-items`, `.chat-tool-item-content`, `.chat-tool-status`, `@keyframes toolStatusPulse` |
| `src/App.jsx` | Added `toolStatus` to useChat destructuring; added `toolStatus={toolStatus}` prop to ChatTab |
| `src/constants.js` | Updated CHAT_SUGGESTIONS: first 2 entries now trigger disk_overview and cleanup_log |
| `vite.config.js` | Added `test: { globals: true, environment: "node" }` for vitest |
| `package.json` | Added `"test": "vitest run"` and `"test:watch": "vitest"` scripts |

---

## 3. Tool Registry / Ownership Map

See: `reports/cto/wave-06/tool-registry-map.md`

Owner files:
- **Tool registry**: `src/hooks/chatTools/toolRegistry.js` — `AGENT_TOOLS`
- **Keyword allowlist v1**: `src/hooks/chatTools/toolRegistry.js` — `AGENT_TOOLS[*].keywords`
- **Freshness policy**: `src/hooks/chatTools/freshnessPolicy.js`
- **Redaction policy**: `src/hooks/chatTools/redactionPipeline.js`
- **Context composer**: `src/hooks/chatTools/contextComposer.js`
- **Orchestration**: `src/hooks/useChat.js`
- **UI presentation**: `src/tabs/ChatTab.jsx` — `ToolBubble`

---

## 4. Trigger Policy Implementation

File: `src/hooks/chatTools/intentDetector.js`

```
detectTools(message) → filters AGENT_TOOLS by keyword substring match (toLowerCase)
isForceRefresh(message) → checks FORCE_REFRESH_PHRASES for explicit real-time request
```

V1 allowlist:
- `disk_overview`: "ổ đĩa", "dung lượng", "còn trống", "storage", "disk", "drive", "ổ c", "ổ d"
- `cleanup_log`: "lịch sử dọn", "đã dọn", "log", "lần trước", "đã xóa bao nhiêu", "cleanup history"

Exclusions (not in keywords, documented in registry): "hệ thống", "máy", "tối ưu", "xóa", "nhanh hơn"

---

## 5. Redaction Policy Implementation

File: `src/hooks/chatTools/redactionPipeline.js`

`redactLogEntry(entry)` — extracts ONLY: timestamp, action_type, size_reclaimed, success, category. Path fields are never forwarded.

`formatRedactedLog(entries)` — formats 8 most recent entries using only safe fields.

`containsPathLikeContent(text)` — safety gate: tests `/[A-Z]:\\/i` and `/%[A-Z_]+%/i`.

External provider safety gate in `useChat.js`:
```js
if (providerRef.current !== "ollama" && containsPathLikeContent(redactedText)) {
  return null; // block injection
}
```

Single unified pipeline for local and external (no dual policy).

---

## 6. Freshness Policy Implementation

File: `src/hooks/chatTools/freshnessPolicy.js`

| Condition | Decision |
|-----------|----------|
| `forceRefresh=true` | `fetch-fresh` |
| cache empty or untimed | `fetch-fresh` |
| cache age ≤ 60s | `use-cached` |
| cache age > 60s | `fetch-fresh` |
| fresh fail + cache ≤ 10 min | `use-stale` (stale-fallback) |
| fresh fail + cache > 10 min | `no-injection` |

Context metadata injected: `freshness: fresh | cached | stale-fallback`, `captured_at: ISO timestamp`

---

## 7. Context Composition Summary

File: `src/hooks/chatTools/contextComposer.js`

- `composeDiskContext(diskData, freshness, capturedAt)` → `[DISK DATA — freshness: X, captured_at: Y]\n• drive: ...`
- `composeLogContext(redactedText)` → `[CLEANUP LOG — redacted summary]\n...`
- `buildEnrichedMessage(userMessage, toolContexts)` → wraps all contexts in `--- THÔNG TIN HỆ THỐNG --- / --- HẾT THÔNG TIN HỆ THỐNG ---` block

When `toolContexts = []`, `buildEnrichedMessage` returns `userMessage` unchanged — normal chat path preserved.

Role `"tool"` messages are UI-only: filtered from `msgPayload` before AI send via `newMessages.filter((m) => m.role !== "tool")`.

---

## 8. Runtime Adoption Proof

**`useChat.js`** (lines ~60–130):
- `diskCacheRef = useRef({ data: null, capturedAt: null })` — internal cache
- `fetchSingleToolContext(toolId, forceRefresh)` — per-tool fetch with freshness/redaction
- `fetchAllToolContexts(toolIds, message)` — orchestrates sequential tool execution
- `sendChatMessage`: `detectTools(content)` → `fetchAllToolContexts` → `setChatMessages(...tool bubble)` → `buildEnrichedMessage` → `msgPayload` filtered → AI call

**`ChatTab.jsx`**:
- `toolStatus` prop used in loading bubble: shows status text when truthy, typing dots when falsy
- `msg.role === "tool"` in message map → renders `<ToolBubble toolResults={msg.toolResults} />`
- `ToolBubble`: expand/collapse, shows label + freshness tag, pre-formatted contextText in item content

---

## 9. Unit Test Breakdown

See: `reports/cto/wave-06/test-breakdown.md`

**Result: 64/64 PASS**

| Group | Tests |
|-------|-------|
| U01 no-tool prompt | 3 |
| U02 disk keyword match | 7 |
| U03 cleanup-log keyword match | 5 |
| U04 exclusion prevents false positive | 5 |
| U05 cache TTL | 6 |
| U06 force refresh | 6 |
| U07 stale fallback | 3 |
| U08 stale expired | 3 |
| U09 redaction | 6 |
| U10 external provider proof | 2 |
| U11 local same pipeline | 1 |
| U12 context composer metadata | 6 |
| U13 tool bubble payload safe | 3 |
| U14 tool failure fallback | 3 |
| U15 unrelated normal chat | 5 |

---

## 10. Smoke Evidence

See: `reports/cto/wave-06/smoke-evidence.md`

S01–S05 paths wired correctly by code evidence:
- S01 disk question → `detectTools` → `disk_overview` → `toolStatus = "Đang đọc thông tin ổ đĩa..."` → ToolBubble
- S02 cleanup question → `detectTools` → `cleanup_log` → redact → ToolBubble
- S03 mixed question → both tools fire → two toolResults entries in ToolBubble
- S04 unrelated → `detectTools([]) = []` → no ToolBubble, normal typing indicator
- S05 tool fail → `fetchSingleToolContext` returns null → toolResults=[] → no bubble, AI continues

---

## 11. Security / Provider Safety Proof

1. `useChat.js` imports: `getDiskOverview`, `getCleanupLog` only — no destructive IPC
2. `containsPathLikeContent` safety gate before external provider injection of log context
3. `redactLogEntry` never forwards `path`, `full_path`, or any raw path field
4. `formatRedactedLog` uses only safe structured fields: timestamp, action_type, size_reclaimed, success, category
5. AI `msgPayload` filters `role: "tool"` — tool messages never sent to AI provider
6. `enrichedContent` built from `buildEnrichedMessage` which only injects already-composed, already-redacted contextText

Grep verification:
```
grep -n "runCleanup\|smartCleanup\|deepClean\|zipBackup" src/hooks/useChat.js → 0 matches
```

---

## 12. Debt Delta

See: `reports/cto/wave-06/debt-register.md`

| Item | Type | Severity | Note |
|------|------|----------|------|
| `log` keyword broad match | UX debt | Low | "show application log" triggers cleanup_log — documented in U04 test as expected V1 behavior |
| No disk overview data de-duplication with App.jsx | Architecture | Low | useChat maintains independent diskCacheRef — initial startup data from App not reused |
| Tool bubble `contextText` shows raw formatted block | UX | Low | No pretty-printing; acceptable for V1 evidence display |
| Keyword allowlist too narrow for non-Vietnamese users | Feature gap | Low | V1 scoped to Vietnamese UI; English keywords limited |

---

## 13. Verdict Recommendation

All 12 acceptance gates PASS. Wave EXEC-06 is complete.

**Recommended verdict: PRODUCTION ADOPTION**

| Gate | Result |
|------|--------|
| Gate 1: Tool registry / owner map explicit | ✅ PASS |
| Gate 2: V1 allowlist implemented exactly | ✅ PASS |
| Gate 3: Redaction policy implemented + proven | ✅ PASS |
| Gate 4: Freshness policy implemented + proven | ✅ PASS |
| Gate 5: useChat runtime uses tools truly | ✅ PASS |
| Gate 6: External provider never receives raw log | ✅ PASS |
| Gate 7: Tool bubble UI present, safe, scope-bounded | ✅ PASS |
| Gate 8: 64/64 unit tests pass | ✅ PASS |
| Gate 9: Smoke evidence S01–S05 wired | ✅ PASS |
| Gate 10: Build EXIT:0, CSS 49.15 kB ≤ 52 kB, App.jsx not bloated | ✅ PASS |
| Gate 11: No destructive action path in chat | ✅ PASS |
| Gate 12: Debt delta explicit | ✅ PASS |
