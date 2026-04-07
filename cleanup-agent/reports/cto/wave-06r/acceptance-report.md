# [EXEC-06R] Acceptance Report — Trigger-Policy Closure

**Wave:** EXEC-06R  
**Date:** 2026-04-07  
**Evaluator:** Agent (automated gate check)  
**Preceding wave:** EXEC-06 (commit `54557e1`) — previously PARTIAL PASS

---

## Gate Evaluation

| Gate | Criterion | Evidence | Result |
|------|-----------|----------|--------|
| **Gate 1** | Runtime exclusion logic exists and is owner-clear | `detectTools()` in `intentDetector.js`: `hasMatch && !isExcluded` logic reads `tool.excludedFromKeywords` from registry. Single owner, no duplication. | ✅ PASS |
| **Gate 2** | Exclusion false positives blocked in tests | U04.test5: `detectTools("show application log")` → `[]`. U16.3: `detectTools("log")` → `[]`. U16.4: `detectTools("view error log")` → `[]`. U16.6: runtime exclusion test passes. | ✅ PASS |
| **Gate 3** | Valid allowlist matches still pass | U02 (7), U03 (5), U16.1, U16.2, U16.5, U16.7 — all valid triggers preserved. No regression. | ✅ PASS |
| **Gate 4** | No keyword logic outside canonical owner path | `detectTools()` in `intentDetector.js` is the sole detection path. `toolRegistry.js` is sole data source. No inline detection elsewhere in codebase. | ✅ PASS |
| **Gate 5** | Build passes | `npm run build` → EXIT:0. CSS 49.15 kB (0 change). JS 260.11 kB (+0.04 kB — exclusion logic only). | ✅ PASS |
| **Gate 6** | Smoke evidence updated | S02A (valid trigger preserved), S02B (D01 false positive blocked), S02C ("cleanup log" new keyword works), S02D (exclusion mechanism active). See wave report §6. | ✅ PASS |
| **Gate 7** | D01 closed | `"log"` → `"cleanup log"` in `toolRegistry.js`. "show application log" → `[]`. "view error log" → `[]`. All valid cleanup queries preserved. D01 closed 2026-04-07. | ✅ PASS |
| **Gate 8** | EXEC-06 eligible for Full Pass re-review | All prior PARTIAL PASS gaps identified by CTO now resolved: trigger policy runtime-enforced, exclusion mechanism active, D01 closed, false-positive blocked in tests. | ✅ PASS |

---

## Build Baseline Comparison

| Metric | EXEC-05 | EXEC-06 | EXEC-06R | Note |
|--------|---------|---------|---------|------|
| CSS | 47.68 kB | 49.15 kB | 49.15 kB | No CSS change |
| JS | 254.24 kB | 260.07 kB | 260.11 kB | +0.04 kB exclusion check |
| Build exit | 0 | 0 | 0 | Clean |
| Unit tests | n/a | 64/64 | 71/71 | +7 exclusion tests |

---

## Prior PARTIAL PASS Gaps — Resolved

CTO had identified these gaps from EXEC-06 summary:

| Prior Gap | Resolution |
|-----------|-----------|
| "excludedFromKeywords processes at runtime?" — NOT proven | ✅ `detectTools()` now checks `excludedFromKeywords` — Gate 1 |
| "cleanup-log false positive prevented?" — NOT proven | ✅ "log" → "cleanup log" narrows keyword — Gate 2, Gate 7 |
| "cleanup log false positive blocked in tests?" — NOT proven | ✅ U04.test5 updated + U16 group with 7 tests — Gate 2 |
| "D01 reclassified or closed?" — NOT done | ✅ D01 CLOSED — Gate 7 |
| "no keyword logic outside canonical owner?" — NOT explicit | ✅ Confirmed — only `intentDetector.js` + `toolRegistry.js` — Gate 4 |

---

## Security Summary — No Regression

All EXEC-06 security gates remain intact:

| Check | Status |
|-------|--------|
| No destructive IPC in chat | ✅ Unchanged |
| Cleanup log redacted before AI injection | ✅ Unchanged |
| External provider safety gate active | ✅ Unchanged |
| Tool messages filtered from AI payload | ✅ Unchanged |
| No file path exposed in ToolBubble | ✅ Unchanged |
| Runtime exclusion cannot expose new paths | ✅ Exclusion only reduces trigger set, never expands |

---

## Wave Verdict

**ALL 8 EXEC-06R GATES PASS**

Recommended CTO verdict: **EXEC-06 FULL PASS**

> EXEC-06R closes the remaining acceptance gaps from EXEC-06:
> - Trigger policy is now runtime-enforced (not documentation only)
> - D01 closed by keyword narrowing ("log" → "cleanup log")
> - Runtime exclusion mechanism implemented and tested in U16
> - 71/71 unit tests pass — 7 new tests covering exclusion scenarios
> - Build clean, no regression on existing tests or functionality
> - No new capabilities added; hardening wave only
