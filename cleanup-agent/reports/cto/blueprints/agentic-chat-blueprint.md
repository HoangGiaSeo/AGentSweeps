# Blueprint Review — Agentic Chat (Tool Orchestration)

**Status:** OPEN — Awaiting CTO approval before any thi công  
**Opened:** 2026-04-07  
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

### Non-goals (KHÔNG triển khai trong wave này)

- Chat không được phép **thực thi** cleanup / deep scan / backup
- Chat không được phép **xóa file** bằng bất kỳ đường nào
- Chat không dùng autonomous agent loop (không có multi-step execution chain)
- Không thêm tool nào ngoài `disk_overview` và `cleanup_log` trong wave này

---

## 2. Tool Catalog

### Tool: `disk_overview`

| Thuộc tính | Giá trị |
|-----------|---------|
| Trigger keywords | "ổ đĩa", "dung lượng", "còn trống", "storage", "ổ c/d/e", "bộ nhớ", "free space", "bao nhiêu gb", "đang đầy", "kiểm tra ổ", "xem ổ" |
| API call | `getDiskOverview()` từ `api.js` |
| Data owner | `diskOverview` state trong `App.jsx` (ưu tiên dùng cached, fallback gọi fresh) |
| Output format | Text block: `• {name}: Tổng X GB, Đã dùng Y GB (Z%), Còn trống W GB` |
| Redaction policy | Không redact — chỉ là metadata, không chứa tên file hay path nhạy cảm |
| Send to external provider? | Có — chỉ volume metrics, không có path riêng tư |

### Tool: `cleanup_log`

| Thuộc tính | Giá trị |
|-----------|---------|
| Trigger keywords | "lịch sử", "đã dọn", "log", "đã xóa", "trước đây", "kết quả dọn", "history", "dọn được gì", "lần trước" |
| API call | `getCleanupLog()` từ `api.js` |
| Data owner | Không cached — fresh call mỗi lần |
| Output format | Text block: 8 entry gần nhất, join "\n" |
| Redaction policy | TODO: kiểm tra xem log có chứa path hay tên file không — nếu có, cần redact trước khi gửi external provider |
| Send to external provider? | **TBD** — phụ thuộc redaction review |

---

## 3. Trigger Policy

### Lựa chọn: Keyword Heuristic (không phải explicit tool calling)

**Lý do:** Explicit tool calling đòi hỏi model phải hỗ trợ function calling (Ollama local thường không có). Keyword heuristic đơn giản hơn và không phụ thuộc model.

**Rủi ro đã ghi nhận:**
- False positive: câu không hỏi về disk nhưng chứa từ "ổ" → có thể trigger `disk_overview`
- Keyword drift: từ mới có thể bị bỏ sót
- Pattern list cần được test rõ ràng

**Mitigation:**
- Keyword list phải được khoá trong file riêng (`AGENT_TOOLS` constant trong `useChat.js`)
- Cần test matrix rõ (xem mục 7)
- Không có hậu quả xấu nếu trigger nhầm — worst case là gửi thêm dữ liệu context, AI bỏ qua

---

## 4. Source of Truth — Owner File Map

| Concern | Owner File | Owner Layer |
|---------|-----------|-------------|
| Tool registry (ID, keywords, label) | `src/hooks/useChat.js` — `AGENT_TOOLS` constant | Hook |
| Tool dispatch logic | `src/hooks/useChat.js` — `detectTools()` | Hook |
| Tool data fetching | `src/hooks/useChat.js` — `fetchToolContext()` | Hook |
| Prompt/context injection builder | `src/hooks/useChat.js` — `enrichedContent` construction | Hook |
| Tool bubble payload schema | `{ role: "tool", toolResults: [{ id, label, content }] }` | ChatTab contract |
| Tool bubble UI | `src/tabs/ChatTab.jsx` — `ToolBubble` component | Tab |
| Tool status display | `src/tabs/ChatTab.jsx` — `toolStatus` prop | Tab |
| Disk data (cached) | `App.jsx` shell — `diskOverview` state | Shell |
| Disk data (fresh call) | `src/api.js` — `getDiskOverview` | API adapter |
| Cleanup log | `src/api.js` — `getCleanupLog` | API adapter |

**Invariant:** Không có tool logic nào trong `ChatTab.jsx`. Tab chỉ render.  
**Invariant:** `useChat.js` không gọi bất kỳ destructive command nào (chỉ read-only).

---

## 5. Security / Privacy

### Local Ollama provider

- Dữ liệu gửi chỉ đến `localhost:11434` — không ra internet
- Không cần redact gì — tất cả dữ liệu ở local

### External provider (OpenAI, Gemini, Anthropic)

| Data Category | Gửi được không? | Ghi chú |
|--------------|----------------|---------|
| Disk volume metrics (tổng/đã dùng/còn trống theo GB, %) | ✅ Có | Metadata thông thường |
| Drive path (`C:\`, `D:\`) | ✅ Có | Không nhạy cảm |
| Cleanup log entries | **⚠️ TBD** | Cần kiểm tra format log — nếu có tên file, folder riêng tư thì phải redact |
| Tên file bất kỳ | ❌ Không | Phải redact trước khi gửi external |
| Folder path chi tiết | ❌ Không | Phải redact trước khi gửi external |

**Action required trước khi pass gate:** Kiểm tra `get_cleanup_log` output format. Nếu log chứa path riêng, thêm redact step trong `fetchToolContext` trước khi gửi external provider.

---

## 6. Failure Paths

| Scenario | Expected Behavior |
|----------|------------------|
| `getDiskOverview` throws | Skip tool, không inject context, AI trả lời không có data, không crash |
| `getCleanupLog` throws | Skip tool, không inject context, AI trả lời không có data, không crash |
| Tool fetch timeout | Skip tool (no await loop), proceed without context |
| `diskOverview` cached rỗng (`[]`) | Gọi `getDiskOverview()` fresh |
| Log rỗng (`[]`) | Inject text "Chưa có lịch sử dọn dẹp nào." (không gọi thêm) |
| No keyword matched | No tool fired, `sendChatMessage` gọi AI trực tiếp như cũ |
| External provider + log chứa path | Block gửi log đến external (redact rule — xem mục 5) |
| AI call fails (network/timeout) | Existing error handling — không thay đổi |

---

## 7. Acceptance Criteria

### Test matrix (phải pass trước khi wave được khóa)

| # | Input | Expected tools fired | Context injected? |
|---|-------|--------------------|--------------------|
| T01 | "ổ đĩa C còn trống bao nhiêu?" | `disk_overview` | ✅ |
| T02 | "lịch sử dọn dẹp gần đây là gì?" | `cleanup_log` | ✅ |
| T03 | "hệ thống dùng bao nhiêu storage, dọn được gì?" | `disk_overview` + `cleanup_log` | ✅ |
| T04 | "máy tính chạy chậm, làm gì?" | none (no keyword match) | ❌ |
| T05 | "docker chiếm dung lượng nhiều không?" | `disk_overview` | ✅ |
| T06 | "làm sao xóa cache chrome?" | none | ❌ |
| T07 | `diskOverview = []` + disk question | fresh call `getDiskOverview` | ✅ |
| T08 | log = [] + history question | inject "Chưa có lịch sử" | ✅ |
| T09 | `getDiskOverview` throws | no crash, AI answers without data | — |
| T10 | `getCleanupLog` throws | no crash, AI answers without data | — |

### Smoke matrix — UI evidence cần chụp

| # | Scenario | Expected UI |
|---|----------|------------|
| S01 | Disk question | "🔍 Đang đọc thông tin ổ đĩa..." hiện trong loading bubble |
| S02 | AI trả lời | Tool bubble "🔧 Agent đã thu thập 1 nguồn dữ liệu" hiện trước AI reply |
| S03 | Click expand tool bubble | Raw data hiển thị trong `.chat-tool-item-content` |
| S04 | No-tool question | Không có tool bubble, typing indicator bình thường |
| S05 | Tool fetch fails | AI reply vẫn hiện, không có tool bubble, không crash |

### Gates bổ sung cần pass

- `cargo check` → EXIT:0 (no Rust changes, should trivially pass)
- `npm run build` → EXIT:0, CSS ≤ 52 kB
- Không có destructive IPC call nào trong `useChat.js` (grep verify)
- Không có `role: "tool"` message nào được gửi trong `msgPayload` đến AI (tool messages filtered before sending)

---

## 8. Non-Goals (explicit)

- Chat **không thể** gọi `runCleanup`, `smartCleanup`, `deepCleanItems`, `zipBackup`
- Chat **không thể** gọi bất kỳ lệnh ghi/xóa nào
- Không có autonomous loop (detect → execute → detect → execute)
- Không thêm scan/deep scan tool trong wave này
- Không thêm tool result streaming
- Không thêm tool calling UI phức tạp hơn expand/collapse bubble

---

## 9. Open Questions cần CTO quyết trước khi cấp lệnh

| # | Câu hỏi | Impact |
|---|---------|--------|
| Q1 | Cleanup log output format có chứa private path không? | Redaction policy cho external provider |
| Q2 | `diskOverview` cached có đủ fresh không, hay luôn phải gọi fresh? | Staleness risk |
| Q3 | Keyword list có cần review thêm trước khi lock? | False positive/negative rate |
| Q4 | Tool bubble expand/collapse có đủ hay cần thêm "copy" button? | UI scope |
| Q5 | Wave này có cần unit test file riêng hay chỉ cần manual smoke? | Test scope |

---

## 10. Wave Readiness

| Gate | Status |
|------|--------|
| Blueprint khóa và phê duyệt | ❌ PENDING |
| Q1–Q5 đã trả lời | ❌ PENDING |
| Redaction policy confirmed | ❌ PENDING |
| Test matrix T01–T10 defined | ✅ (defined above) |
| Smoke matrix S01–S05 defined | ✅ (defined above) |
| Spike code isolated to feature branch | ✅ `feature/agentic-chat-spike` |
| Main HEAD clean | ✅ `22886b6` |

**Verdict: BLOCKED — Blueprint chưa được phê duyệt**
