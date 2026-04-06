# [EXEC-06] Debt Register

**Wave:** EXEC-06  
**Date:** 2026-04-07

---

## Active Debt Items

| # | ID | Description | Type | Severity | Owner File | Resolution Path |
|---|----|-------------|------|----------|-----------|----------------|
| 1 | D01 | `log` keyword triggers on "show application log" (non-cleanup context) | UX / Trigger accuracy | Low | `toolRegistry.js` keywords | V1 behavior — documented in test U04. Narrow by requiring compound keyword in follow-up wave. |
| 2 | D02 | `useChat.js` maintains independent disk cache — startup data from App.jsx not reused | Architecture / Efficiency | Low | `useChat.js` diskCacheRef | Acceptable V1 isolation. Could be optimized by accepting a `diskSnapshot` prop in a future wave. |
| 3 | D03 | No pretty-printing in ToolBubble `contextText` — raw pre-formatted block | UX | Low | `ChatTab.jsx` ToolBubble | Structured display (table/list) is a V2 improvement. V1 `<pre>` is readable. |
| 4 | D04 | Keyword allowlist limited for non-Vietnamese users beyond basic English terms | Feature gap | Low | `toolRegistry.js` | V1 is Vietnamese-primary. Multilingual expansion is a scoped follow-up wave. |
| 5 | D05 | Stale-fallback context not visually distinguished in ToolBubble beyond freshness tag | UX | Low | `ChatTab.jsx` ToolBubble | V1 freshness tag in `.chat-tool-tag` shows "stale-fallback". Enhanced visual warning deferred. |
| 6 | D06 | Sequential tool fetch — parallel fetch not implemented | Performance | Low | `useChat.js` fetchAllToolContexts | V1 has only 2 tools; sequential is fast. `Promise.all` optimization deferred. |

---

## Non-Debt Items (Explicit Out-of-Scope, Not Debt)

| Item | Reason NOT Debt |
|------|----------------|
| Copy button for tool payload | Hardcoded non-goal in blueprint mục 8 |
| Multi-step tool chaining | Hardcoded non-goal |
| Destructive actions via chat | Hardcoded non-goal — never implement without explicit CTO wave |
| Tool result streaming | Hardcoded non-goal |
| Adding tools beyond disk_overview + cleanup_log | Requires new wave + blueprint amendment |

---

## Severity Legend

| Level | Meaning |
|-------|---------|
| High | Blocks correctness or safety |
| Medium | Degrades UX or architecture meaningfully |
| Low | Acceptable V1 limitation, documented |

All items in this wave are **Low** severity — no blockers.
