# [EXEC-06R] Debt Register

**Wave:** EXEC-06R — Trigger-Policy Closure  
**Date:** 2026-04-07

---

## D01 — CLOSED

| Field | Value |
|-------|-------|
| ID | D01 |
| Prior description | `log` keyword triggers on "show application log" (non-cleanup context) |
| Prior severity | Low |
| Prior owner | `toolRegistry.js` keywords |
| Resolution | **CLOSED by EXEC-06R** |
| Resolution method | Keyword `"log"` replaced by `"cleanup log"` in `toolRegistry.js`. Eliminates all broad "log" false positives without breaking any valid cleanup query. "cleanup log" and "cleanup history" keywords provide full English-language coverage. |
| Closed date | 2026-04-07 |

---

## Active Debt Items (Unchanged from EXEC-06)

| # | ID | Description | Type | Severity | Owner File | Resolution Path |
|---|----|-------------|------|----------|-----------|----------------|
| 1 | D02 | `useChat.js` maintains independent disk cache — startup data from App.jsx not reused | Architecture / Efficiency | Low | `useChat.js` diskCacheRef | Acceptable V1 isolation. Could be optimized by accepting a `diskSnapshot` prop in a future wave. |
| 2 | D03 | No pretty-printing in ToolBubble `contextText` — raw pre-formatted block | UX | Low | `ChatTab.jsx` ToolBubble | Structured display (table/list) is a V2 improvement. V1 `<pre>` is readable. |
| 3 | D04 | Keyword allowlist limited for non-Vietnamese users beyond basic English terms | Feature gap | Low | `toolRegistry.js` | V1 is Vietnamese-primary. Multilingual expansion is a scoped follow-up wave. |
| 4 | D05 | Stale-fallback context not visually distinguished in ToolBubble beyond freshness tag | UX | Low | `ChatTab.jsx` ToolBubble | V1 freshness tag in `.chat-tool-tag` shows "stale-fallback". Enhanced visual warning deferred. |
| 5 | D06 | Sequential tool fetch — parallel fetch not implemented | Performance | Low | `useChat.js` fetchAllToolContexts | V1 has only 2 tools; sequential is fast. `Promise.all` optimization deferred. |

---

## New Debt Items (This Wave)

None. EXEC-06R is a hardening wave. No new capability added.

---

## Notes on Cleared Excluded Terms

The following `excludedFromKeywords` entries were removed in EXEC-06R:

| Term | Tool | Reason Removed |
|------|------|---------------|
| `"hệ thống"` | disk_overview | Would block "dung lượng hệ thống" — valid disk query |
| `"máy"` | disk_overview | Would block "ổ đĩa của máy" — valid disk query |
| `"tối ưu"` | disk_overview | Would block "còn trống để tối ưu không?" — valid disk query |
| `"xóa"` | cleanup_log | Substring of keyword "đã xóa bao nhiêu" — would block valid cleanup query |

None of these terms provided practical false-positive coverage in V1 since:
- They don't appear in any disk_overview or cleanup_log keyword  
- But they do appear in valid user queries alongside those keywords

`"nhanh hơn"` retained for cleanup_log: safe exclusion (blocks "lần trước nhanh hơn không?" — a speed/performance question misidentified via "lần trước" keyword).

---

## Debt Summary

| Wave | Items Added | Items Closed | Net |
|------|------------|--------------|-----|
| EXEC-06 | 6 (D01–D06) | 0 | 6 open |
| EXEC-06R | 0 | 1 (D01) | **5 open** |
