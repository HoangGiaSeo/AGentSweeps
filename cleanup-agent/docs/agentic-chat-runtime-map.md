# Agentic Chat Runtime Map

**Locked:** EXEC-07 (2026-04-07)  
**Status:** LOCKED ✅  
**HEAD at lock:** `57ab566`  
**Source:** Post-EXEC-06R full pass — trigger-policy closure confirmed

---

## Overview

Agentic Chat V1 is a **read-only, tool-augmented chat** that injects structured context
into the AI prompt based on the user's message intent. It is NOT an autonomous agent —
it cannot trigger any write or cleanup operation.

The architecture separates concerns across 5 pure-function helper modules and one
orchestrating hook (`useChat.js`). All modules are fully unit-tested (71 Vitest tests).

---

## Tool Registry V1

**File:** `src/hooks/chatTools/toolRegistry.js`  
**Governance:** Do NOT modify `keywords[]` or `excludedFromKeywords[]` inline —
any change requires a blueprint-approved wave (see gate-baselines.md Gate 8).

| Tool ID | Label | Trigger Keywords | Excluded Keywords | Notes |
|---------|-------|-----------------|-------------------|-------|
| `disk_overview` | Thông tin ổ đĩa | `ổ đĩa`, `dung lượng`, `còn trống`, `storage`, `disk`, `drive`, `ổ c`, `ổ d` | _(none)_ | EXEC-06R: former exclusions `["hệ thống","máy","tối ưu"]` cleared — risk of false negatives with valid compound phrases |
| `cleanup_log` | Lịch sử dọn dẹp | `lịch sử dọn`, `đã dọn`, `cleanup log`, `lần trước`, `đã xóa bao nhiêu`, `cleanup history` | `nhanh hơn` | EXEC-06R: `"log"` narrowed to `"cleanup log"` (D01 closed); `"xóa"` removed (substring in keyword) |

**Force-refresh phrases** (any match → bypass cache regardless of age):
`hiện tại`, `bây giờ`, `lúc này`, `ngay lúc này`

**TTL constants:**  
- `CACHE_TTL_MS` = 60 000 ms (1 min) — normal cache hit window  
- `STALE_FALLBACK_TTL_MS` = 600 000 ms (10 min) — stale fallback after failed fresh fetch

---

## Intent Detection

**File:** `src/hooks/chatTools/intentDetector.js`  
**Export:** `detectTools(message: string): string[]`  
**Export:** `isForceRefresh(message: string): boolean`

### `detectTools()` Algorithm

```
1. Lowercase message
2. For each tool in AGENT_TOOLS:
   a. Check if any keyword substring matches → include candidate
   b. Check if any excludedFromKeywords substring matches → exclusion wins → drop
3. Return ordered array of matched tool IDs
```

Exclusion wins over keyword match. This is the runtime enforcement of the trigger-policy
governance rule — not documentation-only (closed D01 in EXEC-06R).

### `isForceRefresh()` Algorithm

```
1. Lowercase message
2. Return true if any FORCE_REFRESH_PHRASES substring is present
```

Caller: `useChat.js` → `fetchSingleToolContext()` passes result as `forceRefresh` param
to `evaluateDiskCacheDecision()`.

---

## Freshness Policy

**File:** `src/hooks/chatTools/freshnessPolicy.js`  
**Export:** `evaluateDiskCacheDecision(cache, forceRefresh): DecisionResult`  
**Export:** `evaluateFreshFetchFallback(cache): FallbackResult`

### Decision Table — `evaluateDiskCacheDecision`

| Condition | Decision | `freshness` label |
|-----------|----------|-------------------|
| `forceRefresh === true` | `fetch-fresh` | `fresh` |
| Cache empty or `capturedAt` missing | `fetch-fresh` | `fresh` |
| Cache age ≤ 60 s | `use-cached` | `cached` |
| Cache age > 60 s | `fetch-fresh` | `fresh` |

### Decision Table — `evaluateFreshFetchFallback` (called only after fresh fetch fails)

| Condition | Decision | `freshness` label |
|-----------|----------|-------------------|
| Cache has data AND age ≤ 10 min | `use-stale` | `stale` |
| Cache missing or age > 10 min | `no-injection` | `none` |

The `freshness` label string is passed through to `contextComposer.js` and injected
into the AI prompt so the LLM is aware of data staleness.

---

## Redaction Pipeline

**File:** `src/hooks/chatTools/redactionPipeline.js`  
**Scope:** `cleanup_log` data ONLY (`disk_overview` is aggregate and path-free)  
**Policy:** **Mandatory for all AI providers** (both local Ollama and external).

### Safety Functions

| Export | Purpose |
|--------|---------|
| `redactString(text)` | Apply 7 ordered path-pattern regexes to any string |
| `redactLogEntry(entry)` | Extract only safe fields from a raw log entry |
| `formatCleanupLogForContext(entries)` | Full pipeline: safe field extraction → per-entry path regex → formatted text block |

### Safe Field Allowlist (per log entry)

`timestamp`, `action_type`, `size_reclaimed`, `success`, `category`

All other fields (especially `path` / `target_path`) are **dropped silently** by
`redactLogEntry()` — they never reach `redactString()`.

### Path Pattern Replacement Map

| Pattern | Label |
|---------|-------|
| `%ENV_VAR%\...` | `[APPDATA_PATH]` |
| `C:\Users\*\AppData\...` | `[APPDATA_PATH]` |
| `C:\(Windows\)?Temp\...` | `[TEMP_PATH]` |
| `C:\Windows\...` | `[WINDOWS_PATH]` |
| `C:\Users\*\...` | `[USER_PATH]` |
| Any other `X:\...` | `[DRIVE_C_PATH]` |
| Unix `/path/...` (len > 4) | `[USER_PATH]` |

**Post-redaction provider safety gate** (in `useChat.js`): `containsPathLikeContent(text)` is
applied to the entire formatted block. If any path-like pattern survives redaction, the data
block is dropped and not injected. This is the final safety net.

---

## Context Composition

**File:** `src/hooks/chatTools/contextComposer.js`  
**Export:** `buildToolContext(toolResults): string`  
**Export:** `buildSystemPromptAddendum(toolContext): string`

Combines all tool results (each with `id`, `data`, `freshness`) into a single structured text
block that is appended to the system prompt header. The LLM sees freshness labels so it can
qualify its response ("based on disk data captured 45 seconds ago…").

Format produced:

```
[CONTEXT — DISK OVERVIEW (fresh)]
...metric lines...

[CONTEXT — CLEANUP LOG (cached)]
...log lines...
```

---

## Per-Tool Data Path

### `disk_overview`

| Stage | Owner | Notes |
|-------|-------|-------|
| Trigger detection | `intentDetector.js` `detectTools()` | keyword match |
| Freshness decision | `freshnessPolicy.js` `evaluateDiskCacheDecision()` | TTL: 60 s |
| Data source | Rust `scan.rs` → Tauri `get_disk_overview` → `api.js` `getDiskOverview()` | Read-only |
| Cache storage | `diskCacheRef` in `useChat.js` | `{ data, capturedAt }` |
| Redaction | _(none — disk overview is path-free aggregate)_ | |
| Provider safety gate | `useChat.js` `containsPathLikeContent()` | Applied post-format |
| Context injection | `contextComposer.js` `buildToolContext()` | Appended to system prompt |
| UI rendering | `ChatTab.jsx` `ToolBubble` component | Shows label + freshness |

### `cleanup_log`

| Stage | Owner | Notes |
|-------|-------|-------|
| Trigger detection | `intentDetector.js` `detectTools()` | keyword match + exclusion |
| Freshness decision | _(no cache — fetched fresh on every call)_ | cleanup_log is not cached |
| Data source | Rust `system.rs` → Tauri `get_cleanup_log` → `api.js` `getCleanupLog()` | Read-only |
| Cache storage | _(none)_ | |
| Redaction | `redactionPipeline.js` `formatCleanupLogForContext()` | **Mandatory, all providers** |
| Provider safety gate | `useChat.js` `containsPathLikeContent()` | Applied post-redaction |
| Context injection | `contextComposer.js` `buildToolContext()` | Appended to system prompt |
| UI rendering | `ChatTab.jsx` `ToolBubble` component | Shows label + item count |

---

## Provider Safety Invariants

These invariants are enforced in `useChat.js` and are NOT delegated to individual helper modules:

| # | Invariant | Enforcement Point |
|---|-----------|-------------------|
| 1 | `cleanup_log` context MUST pass through `redactionPipeline.js` before any provider call | `fetchSingleToolContext()` in `useChat.js` |
| 2 | Any formatted block with path-like content is dropped before injection | `containsPathLikeContent()` gate in `useChat.js` |
| 3 | AI send payload must NOT contain `role:"tool"` messages | Filter before `chatAI` / `chatExternal` IPC call |
| 4 | `providerRef` must be valid non-empty string before any AI send | Guard in `handleSend()` |
| 5 | No destructive Tauri command is accessible from the chat code path | Architecture boundary — only `getDiskOverview` and `getCleanupLog` are called |

---

## Agentic Chat V1 — Boundary Declaration

The following operations are **outside the chat code path** and cannot be triggered by any
user message through Agentic Chat V1:

- `runCleanup`, `cancelCleanup`, `confirmCleanup` — cleanup execution
- `deepScan`, `runDeepScan` — deep scan execution
- `deleteFile`, `moveFile` — file operations
- Any write-path Tauri command

This boundary is maintained by architecture (the chat hooks/modules import only `getDiskOverview`
and `getCleanupLog` from `api.js`) — not by runtime access control.

---

## File Inventory

| File | LOC | Role |
|------|-----|------|
| `src/hooks/chatTools/toolRegistry.js` | ~60 | Tool allowlist + TTL constants |
| `src/hooks/chatTools/intentDetector.js` | ~50 | Keyword match + runtime exclusion |
| `src/hooks/chatTools/freshnessPolicy.js` | ~70 | Cache TTL decisions |
| `src/hooks/chatTools/redactionPipeline.js` | ~100 | Path redaction for cleanup_log |
| `src/hooks/chatTools/contextComposer.js` | ~50 | Prompt assembly |
| `src/hooks/useChat.js` | 219 | Orchestrator (state, IPC, tool dispatch) |
| `src/tabs/ChatTab.jsx` | — | `ToolBubble` UI component |
| `src/hooks/chatTools/__tests__/chatTools.test.js` | — | 71 Vitest tests (U01–U16) |

---

*This document is locked as part of the EXEC-07 Documentation Lock.*  
*Next modification requires opening a new blueprint-approved wave.*
