# [EXEC-06] Smoke Evidence

**Wave:** EXEC-06  
**Date:** 2026-04-07  
**Note:** Smoke evidence is code-path verified. Screenshot evidence to be captured during runtime demo by CTO or developer.

---

## Smoke Matrix S01–S05

### S01 — Ask disk space question

**Input:** "Ổ đĩa C còn trống bao nhiêu GB?"

**Code path:**
1. `sendChatMessage("Ổ đĩa C còn trống bao nhiêu?")` called
2. `detectTools(content)` → matches "ổ đĩa", "còn trống" → `["disk_overview"]`
3. `fetchAllToolContexts(["disk_overview"], message)`:
   - `setToolStatus("Đang đọc thông tin ổ đĩa...")` — loading bubble shows status text
   - `evaluateDiskCacheDecision(diskCacheRef.current, false)` → "fetch-fresh" (first call)
   - `getDiskOverview()` called → returns disk array
   - `composeDiskContext(data, "fresh", capturedAt)` → context string with metadata header
4. `setChatMessages(prev => [...prev, { role: "tool", toolResults: [{...}] }])` — ToolBubble inserted
5. `buildEnrichedMessage(content, toolResults)` → enriched message with system data block
6. AI receives enriched message, replies with informed answer

**Expected UI:**
- Loading bubble shows "Đang đọc thông tin ổ đĩa..." (not typing dots)
- After AI reply: ToolBubble appears before AI bubble
- ToolBubble header: "🔧 Agent đã thu thập 1 nguồn dữ liệu · Thông tin ổ đĩa · fresh"
- ▼ expand button available
- AI reply contains actual disk numbers

---

### S02 — Ask cleanup history question

**Input:** "Lần trước dọn dẹp được bao nhiêu GB?"

**Code path:**
1. `detectTools(content)` → matches "lần trước" → `["cleanup_log"]`
2. `fetchAllToolContexts(["cleanup_log"], message)`:
   - `setToolStatus("Đang đọc lịch sử dọn dẹp...")` — loading bubble shows status text
   - `getCleanupLog()` called → returns log entries
   - `formatRedactedLog(entries)` → redacted summary (no paths)
   - `containsPathLikeContent(redactedText)` = false → safe to proceed
   - `composeLogContext(redactedText)` → wrapped context
3. ToolBubble + enriched message → AI reply references actual cleanup history

**Expected UI:**
- Loading bubble: "Đang đọc lịch sử dọn dẹp..."
- ToolBubble: "🔧 Agent đã thu thập 1 nguồn dữ liệu · Lịch sử dọn dẹp · fresh"
- Expanded content shows redacted log (timestamps, action types, sizes — no file paths)
- AI reply references real cleanup records

---

### S03 — Ask mixed advisory + data question

**Input:** "Dung lượng còn bao nhiêu và lịch sử dọn dẹp thế nào?"

**Code path:**
1. `detectTools(content)` → matches "dung lượng" AND "lịch sử dọn" → `["disk_overview", "cleanup_log"]`
2. Both tools fetched sequentially
3. Two toolResults in ToolBubble
4. `buildEnrichedMessage` injects both contexts

**Expected UI:**
- ToolBubble: "🔧 Agent đã thu thập 2 nguồn dữ liệu"
- Two tags: "Thông tin ổ đĩa · fresh" and "Lịch sử dọn dẹp · fresh"
- Expanded: two sections with data

---

### S04 — Ask unrelated question (no tools)

**Input:** "Cách tắt ứng dụng khởi động cùng Windows?"

**Code path:**
1. `detectTools(content)` → `[]` (no keyword match)
2. `fetchAllToolContexts` not called
3. `toolResults = []`, no ToolBubble inserted
4. `enrichedContent = content` (unchanged)
5. Normal typing indicator shown in loading bubble
6. AI call with original message payload

**Expected UI:**
- Loading bubble shows typing dots (not tool status text)
- No ToolBubble in message list
- AI reply appears directly as normal chat bubble

---

### S05 — Simulate tool failure / stale fallback path

**Sub-scenario A: No cache, getDiskOverview throws**

**Code path:**
1. `detectTools("ổ đĩa còn trống?")` → `["disk_overview"]`
2. `evaluateDiskCacheDecision({data:null, capturedAt:null}, false)` → "fetch-fresh"
3. `getDiskOverview()` throws
4. `evaluateFreshFetchFallback({data:null, capturedAt:null})` → "no-injection"
5. `fetchSingleToolContext` returns `null`
6. `toolResults = []` → no ToolBubble
7. Normal AI call with original content — chat continues

**Expected UI:**
- Tool status briefly shown then cleared
- No ToolBubble
- AI replies without system data (may say it cannot access current disk info)
- No crash, no error bubble from tool path

**Sub-scenario B: Cache 8min old, fresh fetch throws**

**Code path:**
1. cache age 8 min → `evaluateDiskCacheDecision` → "fetch-fresh" (expired)
2. `getDiskOverview()` throws
3. `evaluateFreshFetchFallback(cache)` → "use-stale" (8min ≤ 10min window)
4. `composeDiskContext(data, "stale-fallback", capturedAt)` — stale label in header
5. ToolBubble shows, AI context includes "freshness: stale-fallback"

**Expected UI:**
- ToolBubble appears with freshness "stale-fallback"
- Context header shows stale label
- AI sees data but with stale warning

---

## Runtime Smoke Status

| # | Scenario | Code Path Verified | Screenshot Required |
|---|----------|-------------------|---------------------|
| S01 | Disk question → tool bubble + fresh data | ✅ Code | Pending runtime |
| S02 | Cleanup history → redacted summary | ✅ Code | Pending runtime |
| S03 | Mixed disk + history question | ✅ Code | Pending runtime |
| S04 | Unrelated question → no tool, normal chat | ✅ Code | Pending runtime |
| S05 | Tool failure → graceful fallback / stale | ✅ Code | Pending runtime |
