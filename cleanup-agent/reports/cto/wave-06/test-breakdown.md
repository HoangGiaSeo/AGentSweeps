# [EXEC-06] Test Breakdown

**Wave:** EXEC-06  
**Test file:** `src/hooks/__tests__/useChat.agentic.test.js`  
**Runner:** Vitest 4.1.2  
**Result: 64/64 PASS in 15ms**

---

## Summary Table

| Unit | Description | Tests | Result |
|------|-------------|-------|--------|
| U01 | No-tool prompt: unrelated question triggers no tools | 3 | ✅ PASS |
| U02 | Disk keyword match: V1 locked keywords trigger disk_overview | 7 | ✅ PASS |
| U03 | Cleanup-log keyword match: V1 locked keywords trigger cleanup_log | 5 | ✅ PASS |
| U04 | Exclusion prevents false positive | 5 | ✅ PASS |
| U05 | Cache ≤60s uses cached (no fresh fetch decision) | 6 | ✅ PASS |
| U06 | Explicit force-refresh phrases override cache | 6 | ✅ PASS |
| U07 | Fresh fail + cache ≤10m → stale-fallback | 3 | ✅ PASS |
| U08 | Fresh fail + cache >10m → no injection | 3 | ✅ PASS |
| U09 | Cleanup log redaction strips path-like content | 6 | ✅ PASS |
| U10 | External provider receives only redacted summary | 2 | ✅ PASS |
| U11 | Local provider uses same pipeline | 1 | ✅ PASS |
| U12 | Context composer includes freshness + captured_at | 6 | ✅ PASS |
| U13 | Tool bubble payload is safe/redacted | 3 | ✅ PASS |
| U14 | Tool failure falls back without breaking chat | 3 | ✅ PASS |
| U15 | Unrelated prompt: normal chat, no tool augmentation | 5 | ✅ PASS |
| **Total** | | **64** | **✅ 64/64** |

---

## Notable Test Cases

### U04 — "log" keyword behavior documented

`detectTools("show application log")` → `["cleanup_log"]`

"log" is in the V1 locked allowlist by deliberate policy decision. This is expected behavior, not a bug. The test documents this as acceptable V1 behavior with inline comment.

### U10 — External provider redaction proof

Input entry with `path: "C:\\Users\\john\\AppData\\Local\\Temp\\chrome_cache"`:
- `formatRedactedLog` output: does NOT contain "chrome_cache", "C:\\", "john", "AppData", "Desktop"
- `containsPathLikeContent(output)`: false
- Test PASS confirms: raw path data never reaches formatted context string

### U15 — Normal chat path preserved

`buildEnrichedMessage("original", [])` → `"original"` (unchanged)

Confirms: when no tools match, the AI receives exactly the user's original message with no injected context.

---

## Test Architecture Notes

All 64 tests operate on pure functions imported from `chatTools/` modules:
- `intentDetector.js` — `detectTools`, `isForceRefresh`
- `freshnessPolicy.js` — `evaluateDiskCacheDecision`, `evaluateFreshFetchFallback`
- `redactionPipeline.js` — `redactLogEntry`, `formatRedactedLog`, `redactString`, `containsPathLikeContent`
- `contextComposer.js` — `composeDiskContext`, `composeLogContext`, `buildEnrichedMessage`
- `toolRegistry.js` — `CACHE_TTL_MS`, `STALE_FALLBACK_TTL_MS` (used as reference in boundary tests)

No React, no Tauri mocks, no network calls required. Tests run in `node` environment.

---

## Run Command

```
npm test
```

Output:
```
✓ src/hooks/__tests__/useChat.agentic.test.js (64 tests) 15ms
Test Files  1 passed (1)
     Tests  64 passed (64)
  Duration  283ms
```
