# [EXEC-06R] Agentic Chat Trigger-Policy Closure

**Wave:** EXEC-06R — Hardening / Policy Closure  
**Date:** 2026-04-07  
**Status:** COMPLETE — All 8 gates PASS  
**Build:** CSS 49.15 kB / JS 260.11 kB — EXIT:0  
**Tests:** 71/71 PASS  
**Preceding wave:** EXEC-06 (commit `54557e1`)

---

## 1. Scope Mapping

| EXEC-06R Objective | Implementation |
|-------------------|---------------|
| Runtime exclusion filtering implemented | ✅ `detectTools()` now checks `excludedFromKeywords` |
| Trigger policy matches blueprint locked V1 | ✅ "log" narrowed to "cleanup log" — D01 closed |
| Exclusion evaluation testable and deterministic | ✅ Pure function, covered by U16 (7 tests) |
| Allowlist + exclusion both participate in decision | ✅ `hasMatch && !isExcluded` logic in `detectTools()` |
| No inline heuristic outside registry/policy helpers | ✅ All logic in `intentDetector.js` reading from `toolRegistry.js` |
| D01 closed or reclassified | ✅ CLOSED by keyword narrowing |
| Build passes | ✅ EXIT:0 |
| Smoke evidence updated | ✅ S02A–S02C, S04 updated below |

---

## 2. Files Changed

| File | Change Type | Summary |
|------|-------------|---------|
| `src/hooks/chatTools/intentDetector.js` | Modified | `detectTools()`: added runtime exclusion check |
| `src/hooks/chatTools/toolRegistry.js` | Modified | Header comment updated; `disk_overview.excludedFromKeywords` cleared; `cleanup_log` keyword "log" → "cleanup log"; "xóa" removed from excluded |
| `src/hooks/__tests__/useChat.agentic.test.js` | Modified | U04.test5 updated; U16 group added (7 new tests) |

---

## 3. Trigger Logic Before/After

### Before (EXEC-06)

```js
// intentDetector.js
export function detectTools(message) {
  if (!message || typeof message !== "string") return [];
  const lower = message.toLowerCase();
  return AGENT_TOOLS
    .filter((tool) => tool.keywords.some((kw) => lower.includes(kw.toLowerCase())))
    .map((tool) => tool.id);
  // excludedFromKeywords: NEVER CHECKED — documentation only
}
```

```js
// toolRegistry.js — cleanup_log keywords
keywords: ["lịch sử dọn", "đã dọn", "log", "lần trước", "đã xóa bao nhiêu", "cleanup history"]
//                                     ^---- too broad, caused D01 false positive
excludedFromKeywords: ["xóa", "nhanh hơn"]
// "xóa" conflicted with keyword "đã xóa bao nhiêu" — never safe to implement at runtime

// toolRegistry.js — disk_overview excluded
excludedFromKeywords: ["hệ thống", "máy", "tối ưu"]
// Would cause false negatives on valid queries: "dung lượng hệ thống", "ổ đĩa của máy"
```

### After (EXEC-06R)

```js
// intentDetector.js
export function detectTools(message) {
  if (!message || typeof message !== "string") return [];
  const lower = message.toLowerCase();
  return AGENT_TOOLS
    .filter((tool) => {
      const hasMatch = tool.keywords.some((kw) => lower.includes(kw.toLowerCase()));
      if (!hasMatch) return false;
      const excluded = tool.excludedFromKeywords ?? [];
      const isExcluded = excluded.some((ex) => lower.includes(ex.toLowerCase()));
      return !isExcluded;  // exclusion wins over keyword match
    })
    .map((tool) => tool.id);
}
```

```js
// toolRegistry.js — cleanup_log keywords
keywords: ["lịch sử dọn", "đã dọn", "cleanup log", "lần trước", "đã xóa bao nhiêu", "cleanup history"]
//                                    ^-------------- narrowed from "log" → D01 closed

excludedFromKeywords: ["nhanh hơn"]
// "xóa" removed (conflicted with keyword), "nhanh hơn" retained as safe exclusion

// toolRegistry.js — disk_overview excluded
excludedFromKeywords: []
// "hệ thống", "máy", "tối ưu" cleared — all risked false negatives with valid queries
```

---

## 4. Runtime Exclusion Proof

### Mechanism (intentDetector.js)

Decision flow for a single tool in `detectTools(message)`:

```
1. lower = message.toLowerCase()
2. hasMatch = tool.keywords.some(kw => lower.includes(kw))
3. if !hasMatch → skip tool
4. excluded = tool.excludedFromKeywords ?? []
5. isExcluded = excluded.some(ex => lower.includes(ex))
6. if isExcluded → skip tool (exclusion wins)
7. else → include tool ID in result
```

### Exclusion demonstration

| Message | Keyword match | Excluded match | Result |
|---------|--------------|---------------|--------|
| "lần trước dọn dẹp được bao nhiêu?" | "lần trước" ✅ | none | `["cleanup_log"]` |
| "lần trước nhanh hơn không?" | "lần trước" ✅ | "nhanh hơn" ✅ | `[]` — BLOCKED |
| "show application log" | no "cleanup log" match ✗ | n/a | `[]` — BLOCKED (narrowing) |
| "show cleanup log" | "cleanup log" ✅ | none | `["cleanup_log"]` |

### Allowlist narrowing demonstration

| Message | Old behavior (EXEC-06) | New behavior (EXEC-06R) |
|---------|----------------------|----------------------|
| "show application log" | `["cleanup_log"]` — **FALSE POSITIVE** | `[]` — **BLOCKED** |
| "view error log" | `["cleanup_log"]` — **FALSE POSITIVE** | `[]` — **BLOCKED** |
| "show cleanup log" | `["cleanup_log"]` — correct | `["cleanup_log"]` — **PRESERVED** |
| "đã xóa bao nhiêu GB?" | `["cleanup_log"]` — correct | `["cleanup_log"]` — **PRESERVED** |

---

## 5. Test Breakdown

See: `reports/cto/wave-06r/test-breakdown.md`

**Result: 71/71 PASS** (was 64/64 in EXEC-06)

| Change in U04 | Before | After |
|---------------|--------|-------|
| Test 5 — "show application log" | `toContain("cleanup_log")` | `toEqual([])` ✅ |

| New tests in U16 | Count | Scope |
|-----------------|-------|-------|
| "cleanup log" narrowed keyword triggers | 2 | Allowlist preservation |
| "log" alone no longer triggers | 2 | D01 closure proof |
| "đã xóa bao nhiêu" still works | 1 | False-negative prevention |
| Runtime exclusion: trigger + excluded → blocked | 1 | Exclusion mechanism proof |
| Runtime exclusion: trigger without excluded → passes | 1 | Exclusion non-interference |
| **Total new** | **7** | |

---

## 6. Build / Smoke Verification

### Build

| Metric | EXEC-06 | EXEC-06R | Delta |
|--------|---------|---------|-------|
| CSS | 49.15 kB | 49.15 kB | 0 |
| JS | 260.07 kB | 260.11 kB | +0.04 kB (4-line exclusion check) |
| Build exit | 0 | 0 | — |
| Unit tests | 64/64 | 71/71 | +7 |

### Smoke Evidence

**S02A — Cleanup question ("lần trước"): valid trigger still works**

```
Input: "Lần trước dọn dẹp được bao nhiêu GB?"
detectTools() → ["cleanup_log"]  ← keyword "lần trước" matches, no exclusion
→ ToolBubble appears with cleanup history
```
✅ PASS — no regression on valid query

**S02B — D01 false positive now BLOCKED**

```
Input: "show application log"
detectTools() → []  ← "log" no longer a keyword (narrowed to "cleanup log")
→ No ToolBubble, normal chat path
```
✅ PASS — D01 closed

**S02C — New "cleanup log" keyword works**

```
Input: "show cleanup log"
detectTools() → ["cleanup_log"]  ← keyword "cleanup log" matches
→ ToolBubble appears with cleanup history
```
✅ PASS — narrowed allowlist preserves intent

**S02D — Runtime exclusion blocks performance query**

```
Input: "lần trước nhanh hơn không?"
detectTools() → []  ← keyword "lần trước" matches, but "nhanh hơn" excluded
→ No ToolBubble, normal chat path (correct — this is a performance question)
```
✅ PASS — runtime exclusion mechanism active

**S04 — Disk question unaffected**

```
Input: "Ổ đĩa C còn trống bao nhiêu GB?"
detectTools() → ["disk_overview"]  ← keyword "còn trống" + "ổ đĩa" match, excludedFromKeywords=[]
→ ToolBubble appears with disk data (unchanged from EXEC-06)
```
✅ PASS — disk_overview path untouched

---

## 7. Debt Delta

See: `reports/cto/wave-06r/debt-register.md`

| ID | Prior Status | New Status | Action |
|----|-------------|-----------|--------|
| D01 | Open — "log" too broad | **CLOSED** | Keyword narrowed to "cleanup log" |
| D02 | Open | Unchanged — still Low | No change in scope |
| D03 | Open | Unchanged — still Low | No change in scope |
| D04 | Open | Unchanged — still Low | No change in scope |
| D05 | Open | Unchanged — still Low | No change in scope |
| D06 | Open | Unchanged — still Low | No change in scope |

Net debt change: **-1 item** (D01 closed). 5 Low items remain.

New items added this wave: **0**.

---

## 8. Verdict Recommendation

All 8 EXEC-06R acceptance gates PASS:

| Gate | Criterion | Result |
|------|-----------|--------|
| Gate 1 | Runtime exclusion logic exists and is owner-clear | ✅ `intentDetector.js` `detectTools()` |
| Gate 2 | Exclusion false positives blocked in tests | ✅ U04.test5 + U16 tests |
| Gate 3 | Valid allowlist matches still pass | ✅ U02, U03, U16 coverage |
| Gate 4 | No keyword logic outside canonical owner path | ✅ All detection in `intentDetector.js` reading `toolRegistry.js` |
| Gate 5 | Build passes | ✅ EXIT:0, CSS 49.15 kB / JS 260.11 kB |
| Gate 6 | Smoke evidence updated | ✅ S02A–S02D, S04 |
| Gate 7 | D01 closed | ✅ Keyword "log" → "cleanup log" |
| Gate 8 | EXEC-06 re-review eligible for Full Pass | ✅ Partial Pass gap (trigger policy) now closed |

**Recommended CTO verdict: EXEC-06 FULL PASS eligible** — all prior partial-pass gaps resolved by EXEC-06R.
