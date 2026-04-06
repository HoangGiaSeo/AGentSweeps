# [EXEC-06] Tool Registry / Ownership Map

**Wave:** EXEC-06  
**Date:** 2026-04-07  
**Status:** LOCKED V1

---

## Tool Registry (AGENT_TOOLS)

File: `src/hooks/chatTools/toolRegistry.js`

| Tool ID | Label | Status |
|---------|-------|--------|
| `disk_overview` | Thông tin ổ đĩa | Active V1 |
| `cleanup_log` | Lịch sử dọn dẹp | Active V1 |

### disk_overview

| Attribute | Value |
|-----------|-------|
| Keywords V1 | "ổ đĩa", "dung lượng", "còn trống", "storage", "disk", "drive", "ổ c", "ổ d" |
| Excluded terms | "hệ thống", "máy", "tối ưu" |
| API call | `getDiskOverview()` from `src/api.js` |
| Freshness policy | See `freshnessPolicy.js` — bounded cache 60s TTL, stale-fallback 10 min |
| Redaction required | No — volume metadata only |
| External provider safe | Yes |

### cleanup_log

| Attribute | Value |
|-----------|-------|
| Keywords V1 | "lịch sử dọn", "đã dọn", "log", "lần trước", "đã xóa bao nhiêu", "cleanup history" |
| Excluded terms | "xóa", "nhanh hơn" |
| API call | `getCleanupLog()` from `src/api.js` |
| Freshness policy | Always fresh — no cache |
| Redaction required | YES — mandatory via `redactionPipeline.js` |
| External provider safe | Only after redaction — safety gate in `useChat.js` |

---

## Source of Truth — Owner File Map

| Concern | Owner File | Owner Symbol / Layer |
|---------|-----------|---------------------|
| Tool registration (IDs, labels, statusText) | `src/hooks/chatTools/toolRegistry.js` | `AGENT_TOOLS` |
| Keyword allowlist V1 | `src/hooks/chatTools/toolRegistry.js` | `AGENT_TOOLS[*].keywords` |
| Force-refresh phrases | `src/hooks/chatTools/toolRegistry.js` | `FORCE_REFRESH_PHRASES` |
| Cache TTL constant | `src/hooks/chatTools/toolRegistry.js` | `CACHE_TTL_MS` |
| Stale-fallback TTL constant | `src/hooks/chatTools/toolRegistry.js` | `STALE_FALLBACK_TTL_MS` |
| Intent detection logic | `src/hooks/chatTools/intentDetector.js` | `detectTools()` |
| Force-refresh detection | `src/hooks/chatTools/intentDetector.js` | `isForceRefresh()` |
| Freshness evaluation (before fetch) | `src/hooks/chatTools/freshnessPolicy.js` | `evaluateDiskCacheDecision()` |
| Fallback evaluation (after fail) | `src/hooks/chatTools/freshnessPolicy.js` | `evaluateFreshFetchFallback()` |
| Log entry redaction | `src/hooks/chatTools/redactionPipeline.js` | `redactLogEntry()` |
| Log formatting (redacted) | `src/hooks/chatTools/redactionPipeline.js` | `formatRedactedLog()` |
| Path-content safety check | `src/hooks/chatTools/redactionPipeline.js` | `containsPathLikeContent()` |
| Disk context composition | `src/hooks/chatTools/contextComposer.js` | `composeDiskContext()` |
| Log context composition | `src/hooks/chatTools/contextComposer.js` | `composeLogContext()` |
| Enriched message builder | `src/hooks/chatTools/contextComposer.js` | `buildEnrichedMessage()` |
| Internal disk cache | `src/hooks/useChat.js` | `diskCacheRef` |
| Tool orchestration | `src/hooks/useChat.js` | `fetchSingleToolContext()`, `fetchAllToolContexts()` |
| Tool status display state | `src/hooks/useChat.js` | `toolStatus` state |
| Chat send flow | `src/hooks/useChat.js` | `sendChatMessage()` |
| Tool bubble schema | `{ role: "tool", toolResults: [{ id, label, contextText, freshness }] }` | ChatTab contract |
| Tool bubble UI | `src/tabs/ChatTab.jsx` | `ToolBubble` component |
| Tool status rendering | `src/tabs/ChatTab.jsx` | `toolStatus` prop in loading bubble |
| Disk API source | `src/api.js` | `getDiskOverview` |
| Cleanup log API source | `src/api.js` | `getCleanupLog` |

---

## Invariants

1. No tool logic inside `ChatTab.jsx` — Tab only renders
2. `useChat.js` calls only read-only API functions
3. Keyword allowlist changes require a new wave (not inline edits)
4. Role `"tool"` messages are filtered from AI payload before send
5. External provider never receives raw cleanup log content
