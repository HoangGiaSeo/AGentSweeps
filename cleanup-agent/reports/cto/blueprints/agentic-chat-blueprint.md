# Blueprint Review — Agentic Chat (Tool Orchestration)

**Status:** Q1–Q5 RESOLVED — Awaiting Wave Approval  
**Opened:** 2026-04-07  
**Q1–Q5 Decided:** 2026-04-07  
**CTO Reject verdict:** 2026-04-07 (out-of-scope feature spike, not an approved wave)  
**Spike branch:** `feature/agentic-chat-spike` (commit `6e4315e`) — isolated, NOT on main  
**Main HEAD:** `22886b6` — unaffected

---

## Lý do cần Blueprint (Rejection context)

Wave này bị reject vì:

1. **Không có blueprint được khóa** trước khi thi công
2. **Ngoài scope đã cấp** — các wave đã khóa (EXEC-00 → EXEC-05) không cấp lệnh cho Agentic Chat
3. **Source of truth chưa rõ** — tool registry, prompt builder, payload schema chưa có owner file
4. **Evidence thiếu** — chỉ có build pass + dev server, không có runtime trace, test matrix, failure paths
5. **Coupling risk** — feature mới có thể tăng coupling trở lại sau khi vừa hardening state architecture

Blueprint này phải được khóa và phê duyệt trước khi mở wave thi công.

---

## 1. Mục tiêu nghiệp vụ

### Bài toán cần giải

Người dùng hỏi AI trong tab Trò chuyện về trạng thái máy tính (dung lượng, lịch sử dọn...) nhưng AI không biết dữ liệu thực tế nên chỉ trả lời chung chung, không hữu ích.

### Must-have (tools cần có)

| Tool ID | Chức năng | Dữ liệu trả về |
|---------|-----------|----------------|
| `disk_overview` | Đọc thông tin ổ đĩa thực tế | Tên ổ, tổng GB, đã dùng, còn trống, % |
| `cleanup_log` | Đọc lịch sử dọn dẹp gần nhất | 8 entry gần nhất từ `get_cleanup_log` |

### Non-goals (KHÔNG triển khai trong wave này) — HARDCODED

- Chat **không được phép** thực thi cleanup / deep scan / backup — mọi hình thức destructive action qua chat đều bị cấm
- Chat **không được phép** xóa file bằng bất kỳ đường nào
- Chat **không có** autonomous multi-step tool chaining (detect → execute → detect → execute loop)
- Không có copy raw tool payload ở V1 — tool bubble chỉ expand/collapse, không có copy button
- Không thêm tool nào ngoài `disk_overview` và `cleanup_log` trong wave này

---

## 2. Tool Catalog

### Tool: `disk_overview`

| Thuộc tính | Giá trị |
|-----------|---------|
| Trigger keywords v1 (locked) | "ổ đĩa", "dung lượng", "còn trống", "storage", "disk", "drive", "ổ C", "ổ D" |
| Trigger exclusion | Từ quá rộng không trigger: "hệ thống", "máy", "tối ưu" (xem mục 3) |
| API call | `getDiskOverview()` từ `api.js` |
| Freshness policy | Dùng cached nếu tuổi ≤ 60s; gọi fresh nếu cache missing, cache > 60s, hoặc user dùng từ "hiện tại / bây giờ / lúc này / ngay lúc này"; nếu fresh fail: fallback cached ≤ 10 phút với nhãn stale (xem mục 5) |
| Output format | Text block: `• {name}: Tổng X GB, Đã dùng Y GB (Z%), Còn trống W GB` |
| Context metadata bắt buộc | `freshness: fresh \| cached \| stale-fallback`, `captured_at: <ISO timestamp>` |
| Redaction policy | Không redact — chỉ là volume metadata, không chứa tên file hay path nhạy cảm |
| Send to external provider? | Có — chỉ volume metrics, không có path riêng tư |

### Tool: `cleanup_log`

| Thuộc tính | Giá trị |
|-----------|---------|
| Trigger keywords v1 (locked) | "lịch sử dọn", "đã dọn", "log", "lần trước", "đã xóa bao nhiêu", "cleanup history" |
| Trigger exclusion | Từ quá rộng không trigger: "xóa", "nhanh hơn" (xem mục 3) |
| API call | `getCleanupLog()` từ `api.js` |
| Data owner | Không cached — fresh call mỗi lần |
| Output format | Redacted summary block (xem Redaction Pipeline mục 5) |
| Redaction policy | **MANDATORY** — log được coi là sensitive by default; phải qua full redaction pipeline trước khi inject vào context (xem mục 5) |
| Send to external provider? | Chỉ gửi redacted summary. **Không bao giờ gửi raw log line**. |

**Keyword allowlist versioning note:** Mọi từ khóa mới sau V1 là follow-up wave riêng. Không thêm ngầm vào `AGENT_TOOLS`.

---

## 3. Trigger Policy

### Lựa chọn: Keyword Heuristic với Locked Allowlist V1

**Lý do:** Explicit tool calling đòi hỏi model phải hỗ trợ function calling (Ollama local thường không có). Keyword heuristic đơn giản hơn và không phụ thuộc model.

**Nguyên tắc trigger (Q3 decision):**
- Phải có primary intent term **và** domain noun/context
- Không auto-trigger từ các từ quá rộng

### Keyword Allowlist V1 (locked)

| Tool | Trigger keywords | Từ bị loại (không trigger) |
|------|-----------------|---------------------------|
| `disk_overview` | "ổ đĩa", "dung lượng", "còn trống", "storage", "disk", "drive", "ổ C", "ổ D" | "hệ thống", "máy", "tối ưu" |
| `cleanup_log` | "lịch sử dọn", "đã dọn", "log", "lần trước", "đã xóa bao nhiêu", "cleanup history" | "xóa", "nhanh hơn" |

**Invariant:** `AGENT_TOOLS` constant trong `src/hooks/useChat.js` là source of truth cho keyword list. Bất kỳ từ khóa nào ngoài list trên đều không được thêm trong wave này.

**Rủi ro đã ghi nhận:**
- False positive: câu không hỏi về disk nhưng chứa từ "ổ" → có thể trigger `disk_overview`
- Keyword drift: từ mới có thể bị bỏ sót

**Mitigation:**
- Keyword list khoá trong `AGENT_TOOLS` constant
- Test matrix T04, T06 verify no-trigger behavior
- Không có hậu quả xấu nếu trigger nhầm — worst case là gửi thêm dữ liệu context, AI bỏ qua

---

## 4. Source of Truth — Owner File Map (bắt buộc đầy đủ)

| Concern | Owner File | Owner Layer |
|---------|-----------|-------------|
| Tool registry (ID, keywords, label) | `src/hooks/useChat.js` — `AGENT_TOOLS` constant | Hook |
| Keyword allowlist v1 | `src/hooks/useChat.js` — `AGENT_TOOLS[*].keywords` | Hook |
| Tool dispatch logic | `src/hooks/useChat.js` — `detectTools()` | Hook |
| Tool data fetching | `src/hooks/useChat.js` — `fetchToolContext()` | Hook |
| Freshness policy implementation | `src/hooks/useChat.js` — cache timestamp logic in `fetchToolContext()` | Hook |
| Redaction policy implementation | `src/hooks/useChat.js` — `redactLogEntry()` (new function) | Hook |
| Context composer / prompt injection | `src/hooks/useChat.js` — `enrichedContent` construction with metadata | Hook |
| Tool bubble payload schema | `{ role: "tool", toolResults: [{ id, label, content, freshness, captured_at }] }` | ChatTab contract |
| Tool bubble UI | `src/tabs/ChatTab.jsx` — `ToolBubble` component (expand/collapse only) | Tab |
| Tool status display | `src/tabs/ChatTab.jsx` — `toolStatus` prop | Tab |
| Disk data (cached) | `App.jsx` shell — `diskOverview` state with timestamp | Shell |
| Disk data (fresh call) | `src/api.js` — `getDiskOverview` | API adapter |
| Cleanup log (fresh call) | `src/api.js` — `getCleanupLog` | API adapter |

**Invariant:** Không có tool logic nào trong `ChatTab.jsx`. Tab chỉ render.  
**Invariant:** `useChat.js` không gọi bất kỳ destructive command nào (chỉ read-only).  
**Invariant:** Keyword allowlist chỉ được thay đổi khi mở wave mới — không thêm ngầm.

---

## 5. Security / Privacy

### Freshness Policy — diskOverview (Q2 decision: bounded cache)

| Điều kiện | Hành động |
|----------|-----------|
| Cache tuổi ≤ 60s | Dùng cached, `freshness: "cached"` |
| Cache tuổi > 60s hoặc cache missing | Gọi fresh `getDiskOverview()`, `freshness: "fresh"` |
| User dùng "hiện tại / bây giờ / lúc này / ngay lúc này" | Luôn gọi fresh bất kể tuổi cache |
| Fresh fetch thành công | `freshness: "fresh"`, `captured_at: <ISO>` |
| Fresh fetch fail, cached ≤ 10 phút | Dùng cached với `freshness: "stale-fallback"` + gắn nhãn cảnh báo |
| Fresh fetch fail, không có cached hoặc cached > 10 phút | Không inject context, AI thông báo không có dữ liệu hiện tại |

**Context metadata bắt buộc trong enrichedContent:**
```
[DISK - freshness: fresh | cached | stale-fallback | captured_at: YYYY-MM-DDTHH:mm:ss]
```

**Không dùng:**
- "Always fresh" policy (tốn tài nguyên không cần thiết)
- "Cache forever" policy (stale data risk)

### Redaction Policy — Cleanup Log (Q1 + TBD: CLOSED)

**Policy chính thức:** Cleanup log được coi là **sensitive by default**.

**Redaction pipeline (bắt buộc trước khi inject vào bất kỳ provider nào):**

1. Parse log entry thành các trường cấu trúc
2. Detect path-like segments (ký tự: `\`, `/`, `%`, drive letters, APPDATA, TEMP, username patterns)
3. Replace path segments bằng safe label:
   - `[USER_PATH]` — `C:\Users\<name>\...`
   - `[APPDATA_PATH]` — `%APPDATA%\...` hoặc path vào AppData
   - `[TEMP_PATH]` — `%TEMP%`, `%TMP%`, hay path vào Temp
   - `[DRIVE_C_PATH]`, `[DRIVE_D_PATH]` — root path drive cụ thể
4. Chỉ giữ lại trong redacted summary:
   - `timestamp`
   - `action_type` (e.g., "delete", "move")
   - `size_reclaimed` (bytes/KB/MB)
   - `success | failure`
   - `category` (e.g., "temp", "cache", "log")

**Provider rules:**

| Provider | Cleanup log format | Path allowed? |
|----------|-------------------|---------------|
| Local Ollama | Redacted summary | ❌ |
| External (OpenAI/Gemini/Anthropic) | Redacted summary | ❌ |

**Note:** V1 dùng chung một redaction pipeline cho cả local và external để tránh dual policy. Mọi thay đổi policy là change wave riêng.

### External provider — data send policy

| Data Category | Gửi được không? | Ghi chú |
|--------------|----------------|---------|
| Disk volume metrics (tổng/đã dùng/còn trống theo GB, %) | ✅ Có | Metadata thông thường |
| Drive path (`C:\`, `D:\`) | ✅ Có | Volume identifier, không nhạy cảm |
| Cleanup log — redacted summary | ✅ Có | Phải qua redaction pipeline trước |
| Cleanup log — raw log line | ❌ **Không bao giờ** | Vi phạm redaction policy |
| Tên file bất kỳ | ❌ Không | Phải redact trước khi gửi |
| Folder path chi tiết | ❌ Không | Phải redact trước khi gửi |
| Context metadata (freshness, captured_at) | ✅ Có | Không nhạy cảm |

---

## 6. Failure Paths

| Scenario | Expected Behavior |
|----------|------------------|
| `getDiskOverview` throws | Skip tool, không inject context, AI trả lời không có data, không crash |
| `getCleanupLog` throws | Skip tool, không inject context, AI trả lời không có data, không crash |
| Tool fetch timeout | Skip tool (no await loop), proceed without context |
| `diskOverview` cached rỗng (`[]`) | Gọi `getDiskOverview()` fresh |
| Cache tuổi > 60s, user hỏi disk | Gọi fresh; nếu fresh fail và cache ≤ 10 phút → stale-fallback với label |
| Cache tuổi > 10 phút và fresh fail | Không inject, AI thông báo không có số liệu hiện tại |
| User dùng "hiện tại / bây giờ" | Luôn gọi fresh, không dùng cache |
| Log rỗng (`[]`) | Inject text "Chưa có lịch sử dọn dẹp nào." (không gọi thêm) |
| Log chứa path — redaction applied | Inject redacted summary với labels `[USER_PATH]` etc. |
| Redaction pipeline throws | Skip tool, không crash, AI trả lời không có data |
| No keyword matched | No tool fired, `sendChatMessage` gọi AI trực tiếp như cũ |
| External provider + log path không redact sạch | Block tool context injection hoàn toàn, không gửi |
| AI call fails (network/timeout) | Existing error handling — không thay đổi |

---

## 7. Acceptance Criteria

### Unit Test Matrix (bắt buộc — Q5 decision)

File: `src/hooks/__tests__/useChat.agentic.test.js`

| # | Logic được test | Test case |
|---|----------------|-----------|
| U01 | Intent detection | `detectTools("ổ đĩa còn trống không?")` → `["disk_overview"]` |
| U02 | Intent detection — no trigger | `detectTools("hệ thống của tôi")` → `[]` |
| U03 | Tool selection | `detectTools("lịch sử dọn đây")` → `["cleanup_log"]` |
| U04 | Multi-tool selection | `detectTools("dung lượng và lịch sử dọn")` → `["disk_overview", "cleanup_log"]` |
| U05 | Freshness policy — cached hit | cache tuổi 30s → return cached, không gọi fresh |
| U06 | Freshness policy — stale | cache tuổi 90s → trigger fresh call |
| U07 | Freshness policy — force fresh | message chứa "hiện tại" → trigger fresh call bất kể tuổi |
| U08 | Freshness policy — stale fallback | fresh fail + cache 5 phút → stale-fallback với label |
| U09 | Freshness policy — no injection | fresh fail + cache 15 phút → no context injected |
| U10 | Redaction — user path | log entry chứa `C:\Users\john\Documents` → replaced với `[USER_PATH]` |
| U11 | Redaction — appdata path | log entry chứa `%APPDATA%\Microsoft` → replaced với `[APPDATA_PATH]` |
| U12 | Redaction — no path | log entry không có path → giữ nguyên (timestamp/action/size/category) |
| U13 | Context composition | enrichedContent chứa `freshness: fresh` khi gọi fresh |
| U14 | No-tool fallback | `detectTools("làm sao tăng tốc máy")` → `[]`, không inject gì |
| U15 | External-provider redaction proof | Tất cả cleanup context gửi external đều qua pipeline — không có raw path |

**Không được xin PASS chỉ bằng:** "dev server chạy", "build pass", "manual hỏi thử thấy ổn".

### Integration Test Matrix T01–T10

| # | Input | Expected tools fired | Context injected? |
|---|-------|--------------------|--------------------|
| T01 | "ổ đĩa C còn trống bao nhiêu?" | `disk_overview` | ✅ |
| T02 | "lịch sử dọn dẹp gần đây là gì?" | `cleanup_log` | ✅ |
| T03 | "hệ thống dùng bao nhiêu storage, dọn được gì?" | `disk_overview` + `cleanup_log` | ✅ |
| T04 | "máy tính chạy chậm, làm gì?" | none (no keyword match) | ❌ |
| T05 | "docker chiếm dung lượng nhiều không?" | `disk_overview` | ✅ |
| T06 | "làm sao xóa cache chrome?" | none | ❌ |
| T07 | `diskOverview` cache > 60s + disk question | fresh call `getDiskOverview` | ✅ |
| T08 | log = [] + history question | inject "Chưa có lịch sử" | ✅ |
| T09 | `getDiskOverview` throws | no crash, AI answers without data | — |
| T10 | `getCleanupLog` throws | no crash, AI answers without data | — |

### Smoke matrix — UI evidence (manual, bắt buộc — Q5 decision)

| # | Scenario | Expected UI |
|---|----------|------------|
| S01 | Disk question | "🔍 Đang đọc thông tin ổ đĩa..." hiện trong loading bubble |
| S02 | AI trả lời | Tool bubble "🔧 Agent đã thu thập 1 nguồn dữ liệu" hiện trước AI reply |
| S03 | Click expand tool bubble | Redacted content hiển thị (không có raw path), expand/collapse works |
| S04 | No-tool question | Không có tool bubble, typing indicator bình thường |
| S05 | Tool fetch fails | AI reply vẫn hiện, không có tool bubble, không crash |

### Gates bắt buộc (tất cả phải pass trước khi wave được khóa)

| Gate | Phương thức verify |
|------|--------------------|
| `cargo check` → EXIT:0 | Terminal |
| `npm run build` → EXIT:0, CSS ≤ 52 kB | Terminal |
| Unit test suite `useChat.agentic.test.js` → U01–U15 pass | `npm test` |
| Integration T01–T10 → 10/10 pass | Test runner hoặc manual trace |
| Smoke S01–S05 → 5/5 scenarios documented | Screenshot evidence |
| External-provider redaction proof: cleanup context không chứa raw path | Test U15 + manual inspection |
| Không có destructive IPC call trong `useChat.js` | `grep -n "cleanup\|delete\|remove\|smart_clean\|zip_backup" src/hooks/useChat.js` → 0 |
| Không có `role: "tool"` message trong `msgPayload` gửi AI | Code review + grep |
| Keyword allowlist không thay đổi từ V1 locked list | `git diff AGENT_TOOLS` → 0 thay đổi ngoài V1 list |

---

## 8. Non-Goals (explicit — HARDCODED)

**KHÔNG bao giờ được implement trong bất kỳ wave nào mà không có explicit CTO approval riêng:**

- Chat **không thể** gọi `runCleanup`, `smartCleanup`, `deepCleanItems`, `zipBackup`
- Chat **không thể** gọi bất kỳ lệnh ghi/xóa nào — **destructive action qua chat là cấm hoàn toàn**
- **Không có** autonomous multi-step tool chaining (detect → execute → detect → execute loop)
- **Không có** copy button cho raw tool payload ở V1 — expand/collapse là đủ, copy → defer
- Không thêm scan/deep scan tool trong wave này
- Không thêm tool result streaming
- Không thêm tool calling UI phức tạp hơn expand/collapse bubble

---

## 9. Q1–Q5 Decisions (RESOLVED 2026-04-07)

| # | Câu hỏi | Verdict | Policy chính thức |
|---|---------|---------|-------------------|
| Q1 | Cleanup log có chứa private path không? | **RESOLVED:** Có khả năng có — treated as sensitive by default | External provider: chỉ gửi redacted summary. Full redaction pipeline bắt buộc cho cả local và external V1. |
| Q2 | `diskOverview` cached đủ fresh hay luôn gọi fresh? | **RESOLVED:** Bounded cache with freshness threshold | ≤60s: cached; >60s hoặc "hiện tại/bây giờ": fresh; fresh fail ≤10 phút: stale-fallback; >10 phút: no injection |
| Q3 | Keyword list cần review thêm không? | **RESOLVED:** V1 allowlist locked và hẹp | Chỉ dùng keyword table tại mục 3. Từ khóa mới = follow-up wave riêng. |
| Q4 | Tool bubble cần copy button không? | **RESOLVED:** Không — scope creep | V1: expand/collapse only. copy button → defer. |
| Q5 | Wave cần unit test riêng không? | **RESOLVED:** Bắt buộc có unit tests | Unit test file riêng `useChat.agentic.test.js`. Manual smoke là bổ sung, không thay thế. |
| TBD | Cleanup log redaction policy | **RESOLVED (đóng):** | Sensitive by default. Chung một pipeline cho cả local và external V1. Không cần dual policy. |

---

## 10. Wave Readiness

| Gate | Status |
|------|--------|
| Blueprint khóa và phê duyệt | ⏳ AWAITING CTO APPROVAL |
| Q1–Q5 đã trả lời | ✅ RESOLVED 2026-04-07 |
| Redaction policy confirmed | ✅ CONFIRMED 2026-04-07 |
| Freshness policy confirmed | ✅ CONFIRMED 2026-04-07 |
| Keyword allowlist v1 locked | ✅ LOCKED 2026-04-07 |
| Unit test scope defined | ✅ DEFINED (U01–U15, T01–T10, S01–S05) |
| Source of truth owner files defined | ✅ DEFINED (mục 4) |
| Non-goals hardcoded | ✅ HARDCODED (mục 8) |
| Spike code isolated to feature branch | ✅ `feature/agentic-chat-spike` |
| Main HEAD clean | ✅ `22886b6` |

**Verdict: BLOCKED — Blueprint chưa được phê duyệt. Tất cả Q1–Q5 + TBD đã resolve. Chờ CTO ký APPROVED.**
