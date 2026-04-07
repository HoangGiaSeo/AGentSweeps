# [EXEC-06R] Test Breakdown

**Wave:** EXEC-06R — Trigger-Policy Closure  
**Test file:** `src/hooks/__tests__/useChat.agentic.test.js`  
**Runner:** Vitest 4.1.2  
**Result: 71/71 PASS in 17ms**

---

## Summary Table

| Unit | Description | Tests | Change | Result |
|------|-------------|-------|--------|-------|
| U01 | No-tool prompt | 3 | None | ✅ PASS |
| U02 | Disk keyword match | 7 | None | ✅ PASS |
| U03 | Cleanup-log keyword match | 5 | None | ✅ PASS |
| U04 | Exclusion prevents false positive | 5 | Test 5 updated | ✅ PASS |
| U05 | Cache ≤60s uses cached | 6 | None | ✅ PASS |
| U06 | Force-refresh phrases override cache | 6 | None | ✅ PASS |
| U07 | Fresh fail with stale cache ≤10m → stale-fallback | 3 | None | ✅ PASS |
| U08 | Fresh fail + stale >10m → no-injection | 3 | None | ✅ PASS |
| U09 | Cleanup log redaction | 6 | None | ✅ PASS |
| U10 | External provider redaction proof | 2 | None | ✅ PASS |
| U11 | Local provider same pipeline | 1 | None | ✅ PASS |
| U12 | Context composer metadata | 6 | None | ✅ PASS |
| U13 | Tool bubble payload is safe | 3 | None | ✅ PASS |
| U14 | Tool failure graceful fallback | 3 | None | ✅ PASS |
| U15 | Unrelated prompt: normal chat | 5 | None | ✅ PASS |
| **U16** | **EXEC-06R: Runtime exclusion + allowlist closure** | **7** | **New** | **✅ PASS** |
| **Total** | | **71** | **+7 new** | **✅ 71/71** |

---

## U04 Change Detail

**Test 5 — Before (EXEC-06):**
```js
test("unrelated sentence with 'log' does not trigger cleanup_log...", () => {
  const result = detectTools("show application log");
  expect(result).toContain("cleanup_log");
  // NOTE: documented as acceptable V1 behavior
});
```

**Test 5 — After (EXEC-06R):**
```js
test("'show application log' no longer triggers cleanup_log — EXEC-06R: 'log' narrowed to 'cleanup log'", () => {
  // D01 CLOSED
  expect(detectTools("show application log")).toEqual([]);
});
```

---

## U16 New Tests Breakdown

| # | Test Description | Scope | Assertion |
|---|-----------------|-------|-----------|
| U16.1 | `'cleanup log'` triggers cleanup_log | Narrowed keyword | `toContain("cleanup_log")` |
| U16.2 | `'view cleanup log history'` triggers | Narrowed keyword in phrase | `toContain("cleanup_log")` |
| U16.3 | `'log'` alone no longer triggers | D01 closure proof | `toEqual([])` |
| U16.4 | `'view error log'` no longer triggers | D01 closure breadth | `toEqual([])` |
| U16.5 | `'đã xóa bao nhiêu'` still triggers | No false negative from "xóa" removal | `toContain("cleanup_log")` |
| U16.6 | `'lần trước nhanh hơn không?'` blocked | Runtime exclusion: "nhanh hơn" excluded | `toEqual([])` |
| U16.7 | `'lần trước dọn dẹp được bao nhiêu?'` passes | Exclusion non-interference | `toContain("cleanup_log")` |

---

## Test Architecture — No Change

All 71 tests operate on pure functions from `chatTools/` modules.  
No React, no Tauri mocks, no network calls.  
Environment: `node` (vitest config unchanged).

---

## Run Command

```
npm test
```

Output:
```
✓ src/hooks/__tests__/useChat.agentic.test.js (71 tests) 17ms
Test Files  1 passed (1)
     Tests  71 passed (71)
  Duration  310ms
```
