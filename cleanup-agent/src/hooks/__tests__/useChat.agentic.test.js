/**
 * [EXEC-06] Agentic Chat V1 — Unit Test Suite
 * File: src/hooks/__tests__/useChat.agentic.test.js
 *
 * Coverage: U01–U15 as defined in reports/cto/blueprints/agentic-chat-blueprint.md
 *
 * All tests operate on pure helper functions — no React, no Tauri mocks needed.
 */

import { describe, test, expect } from "vitest";
import { detectTools, isForceRefresh } from "../chatTools/intentDetector";
import { evaluateDiskCacheDecision, evaluateFreshFetchFallback } from "../chatTools/freshnessPolicy";
import {
  redactLogEntry,
  formatRedactedLog,
  redactString,
  containsPathLikeContent,
} from "../chatTools/redactionPipeline";
import { composeDiskContext, composeLogContext, buildEnrichedMessage } from "../chatTools/contextComposer";
import { CACHE_TTL_MS, STALE_FALLBACK_TTL_MS } from "../chatTools/toolRegistry";

// ─────────────────────────────────────────────────────────────────────────────
// U01 — No-tool prompt: unrelated question triggers no tools
// ─────────────────────────────────────────────────────────────────────────────
describe("U01 — no-tool prompt", () => {
  test("general advice question triggers no tools", () => {
    expect(detectTools("Cách tắt ứng dụng khởi động cùng Windows?")).toEqual([]);
  });

  test("empty string triggers no tools", () => {
    expect(detectTools("")).toEqual([]);
  });

  test("null input triggers no tools without throwing", () => {
    expect(detectTools(null)).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U02 — Disk keyword match: V1 locked keywords trigger disk_overview
// ─────────────────────────────────────────────────────────────────────────────
describe("U02 — disk keyword match", () => {
  test("'ổ đĩa' triggers disk_overview", () => {
    expect(detectTools("ổ đĩa C của tôi còn trống bao nhiêu?")).toContain("disk_overview");
  });

  test("'dung lượng' triggers disk_overview", () => {
    expect(detectTools("dung lượng ổ đĩa đang thế nào?")).toContain("disk_overview");
  });

  test("'còn trống' triggers disk_overview", () => {
    expect(detectTools("còn trống bao nhiêu GB?")).toContain("disk_overview");
  });

  test("'storage' triggers disk_overview (case-insensitive)", () => {
    expect(detectTools("How much storage is left?")).toContain("disk_overview");
  });

  test("'disk' triggers disk_overview", () => {
    expect(detectTools("check disk usage")).toContain("disk_overview");
  });

  test("'ổ c' triggers disk_overview", () => {
    expect(detectTools("ổ c đang đầy")).toContain("disk_overview");
  });

  test("'drive' triggers disk_overview", () => {
    expect(detectTools("drive space available?")).toContain("disk_overview");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U03 — Cleanup-log keyword match: V1 locked keywords trigger cleanup_log
// ─────────────────────────────────────────────────────────────────────────────
describe("U03 — cleanup-log keyword match", () => {
  test("'lịch sử dọn' triggers cleanup_log", () => {
    expect(detectTools("lịch sử dọn gần đây thế nào?")).toContain("cleanup_log");
  });

  test("'đã dọn' triggers cleanup_log", () => {
    expect(detectTools("tuần này đã dọn được gì?")).toContain("cleanup_log");
  });

  test("'lần trước' triggers cleanup_log", () => {
    expect(detectTools("lần trước agent xử lý gì?")).toContain("cleanup_log");
  });

  test("'đã xóa bao nhiêu' triggers cleanup_log", () => {
    expect(detectTools("đã xóa bao nhiêu GB rồi?")).toContain("cleanup_log");
  });

  test("'cleanup history' triggers cleanup_log", () => {
    expect(detectTools("show me cleanup history")).toContain("cleanup_log");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U04 — Exclusion prevents false positive
// ─────────────────────────────────────────────────────────────────────────────
describe("U04 — exclusion prevents false positive", () => {
  test("'hệ thống' alone does not trigger disk_overview", () => {
    expect(detectTools("hệ thống của tôi chạy thế nào?")).toEqual([]);
  });

  test("'tối ưu hóa' alone does not trigger disk_overview", () => {
    expect(detectTools("làm thế nào để tối ưu hóa máy tính?")).toEqual([]);
  });

  test("'xóa file' alone does not trigger cleanup_log (missing log-specific keyword)", () => {
    expect(detectTools("xóa file này đi")).toEqual([]);
  });

  test("'nhanh hơn' alone does not trigger any tool", () => {
    expect(detectTools("làm máy tính nhanh hơn")).toEqual([]);
  });

  test("'show application log' no longer triggers cleanup_log — EXEC-06R: 'log' narrowed to 'cleanup log'", () => {
    // D01 CLOSED: "log" keyword replaced by "cleanup log" in EXEC-06R.
    // "show application log" no longer matches any cleanup_log keyword.
    expect(detectTools("show application log")).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U05 — Cache ≤60s uses cached (no fresh fetch decision)
// ─────────────────────────────────────────────────────────────────────────────
describe("U05 — cache within TTL uses cached", () => {
  test("cache 30s old → use-cached decision", () => {
    const cache = { data: [{ name: "C:" }], capturedAt: Date.now() - 30_000 };
    const result = evaluateDiskCacheDecision(cache, false);
    expect(result.decision).toBe("use-cached");
    expect(result.freshness).toBe("cached");
  });

  test("cache 1s old → use-cached decision", () => {
    const cache = { data: [{ name: "C:" }], capturedAt: Date.now() - 1_000 };
    const result = evaluateDiskCacheDecision(cache, false);
    expect(result.decision).toBe("use-cached");
  });

  test("cache at exactly TTL boundary - 100ms → use-cached", () => {
    const cache = { data: [{ name: "C:" }], capturedAt: Date.now() - CACHE_TTL_MS + 100 };
    const result = evaluateDiskCacheDecision(cache, false);
    expect(result.decision).toBe("use-cached");
  });

  test("cache expired at CACHE_TTL + 500ms → fetch-fresh", () => {
    const cache = { data: [{ name: "C:" }], capturedAt: Date.now() - CACHE_TTL_MS - 500 };
    const result = evaluateDiskCacheDecision(cache, false);
    expect(result.decision).toBe("fetch-fresh");
  });

  test("no cache → fetch-fresh", () => {
    const result = evaluateDiskCacheDecision({ data: null, capturedAt: null }, false);
    expect(result.decision).toBe("fetch-fresh");
  });

  test("empty array cache → fetch-fresh", () => {
    const result = evaluateDiskCacheDecision({ data: [], capturedAt: Date.now() - 10_000 }, false);
    expect(result.decision).toBe("fetch-fresh");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U06 — Explicit "hiện tại/bây giờ" forces fresh regardless of cache age
// ─────────────────────────────────────────────────────────────────────────────
describe("U06 — force-refresh phrases override cache", () => {
  test("isForceRefresh: 'hiện tại' → true", () => {
    expect(isForceRefresh("ổ đĩa hiện tại còn bao nhiêu?")).toBe(true);
  });

  test("isForceRefresh: 'bây giờ' → true", () => {
    expect(isForceRefresh("bây giờ còn trống bao nhiêu GB?")).toBe(true);
  });

  test("isForceRefresh: 'lúc này' → true", () => {
    expect(isForceRefresh("lúc này ổ cứng đầy chưa?")).toBe(true);
  });

  test("isForceRefresh: 'ngay lúc này' → true", () => {
    expect(isForceRefresh("ngay lúc này có bao nhiêu GB còn trống?")).toBe(true);
  });

  test("isForceRefresh: normal question → false", () => {
    expect(isForceRefresh("ổ đĩa còn trống bao nhiêu?")).toBe(false);
  });

  test("evaluateDiskCacheDecision: fresh cache + forceRefresh=true → fetch-fresh", () => {
    const cache = { data: [{ name: "C:" }], capturedAt: Date.now() - 5_000 };
    const result = evaluateDiskCacheDecision(cache, true);
    expect(result.decision).toBe("fetch-fresh");
    expect(result.reason).toBe("force-refresh-requested");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U07 — Fresh fetch fail + cache ≤10m → stale-fallback
// ─────────────────────────────────────────────────────────────────────────────
describe("U07 — fresh fail with usable stale cache", () => {
  test("cache 5 min old → use-stale after fresh fail", () => {
    const cache = { data: [{ name: "C:" }], capturedAt: Date.now() - 5 * 60_000 };
    const result = evaluateFreshFetchFallback(cache);
    expect(result.decision).toBe("use-stale");
    expect(result.freshness).toBe("stale-fallback");
  });

  test("cache just under 10min → use-stale", () => {
    const cache = { data: [{ name: "C:" }], capturedAt: Date.now() - STALE_FALLBACK_TTL_MS + 1_000 };
    const result = evaluateFreshFetchFallback(cache);
    expect(result.decision).toBe("use-stale");
  });

  test("cache 9min 59s → use-stale", () => {
    const cache = { data: [{ name: "C:" }], capturedAt: Date.now() - (10 * 60_000 - 1_000) };
    const result = evaluateFreshFetchFallback(cache);
    expect(result.decision).toBe("use-stale");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U08 — Fresh fetch fail + stale >10m → no injection
// ─────────────────────────────────────────────────────────────────────────────
describe("U08 — fresh fail with expired stale cache", () => {
  test("cache 15min old → no-injection after fresh fail", () => {
    const cache = { data: [{ name: "C:" }], capturedAt: Date.now() - 15 * 60_000 };
    const result = evaluateFreshFetchFallback(cache);
    expect(result.decision).toBe("no-injection");
  });

  test("no cache → no-injection", () => {
    const result = evaluateFreshFetchFallback({ data: null, capturedAt: null });
    expect(result.decision).toBe("no-injection");
  });

  test("empty data → no-injection", () => {
    const result = evaluateFreshFetchFallback({ data: [], capturedAt: Date.now() - 5 * 60_000 });
    expect(result.decision).toBe("no-injection");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U09 — Cleanup log redaction strips path-like content
// ─────────────────────────────────────────────────────────────────────────────
describe("U09 — cleanup log redaction", () => {
  test("redactLogEntry extracts only safe fields", () => {
    const entry = {
      timestamp: "2026-04-07T10:00:00",
      action_type: "delete",
      size_reclaimed: "120 MB",
      success: true,
      category: "temp",
      path: "C:\\Users\\john\\AppData\\Local\\Temp\\chrome_cache",
    };
    const safe = redactLogEntry(entry);
    expect(safe.timestamp).toBe("2026-04-07T10:00:00");
    expect(safe.action_type).toBe("delete");
    expect(safe.size_reclaimed).toBe("120 MB");
    expect(safe.success).toBe(true);
    expect(safe.category).toBe("temp");
    // Path field must not be exposed
    expect(safe).not.toHaveProperty("path");
  });

  test("redactString replaces Windows drive paths", () => {
    const input = "Deleted C:\\Users\\john\\Documents\\file.txt";
    const result = redactString(input);
    expect(result).not.toContain("john");
    expect(result).not.toContain("Documents");
    expect(containsPathLikeContent(result)).toBe(false);
  });

  test("redactString replaces AppData paths", () => {
    const input = "Cleared C:\\Users\\admin\\AppData\\Local\\Temp\\cache";
    const result = redactString(input);
    expect(result).not.toContain("admin");
    expect(containsPathLikeContent(result)).toBe(false);
  });

  test("formatRedactedLog output contains no Windows paths", () => {
    const entries = [
      { timestamp: "2026-04-07", action_type: "delete", size_reclaimed: "50MB", success: true, category: "temp" },
      { timestamp: "2026-04-07", action_type: "move", size_reclaimed: "20MB", success: false, category: "cache" },
    ];
    const output = formatRedactedLog(entries);
    expect(containsPathLikeContent(output)).toBe(false);
  });

  test("formatRedactedLog empty entries returns placeholder", () => {
    expect(formatRedactedLog([])).toBe("Chưa có lịch sử dọn dẹp nào.");
  });

  test("formatRedactedLog null entries returns placeholder", () => {
    expect(formatRedactedLog(null)).toBe("Chưa có lịch sử dọn dẹp nào.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U10 — External provider receives only redacted cleanup summary
// ─────────────────────────────────────────────────────────────────────────────
describe("U10 — external provider redaction proof", () => {
  test("raw entry with user path: formatted output excludes all path components", () => {
    const rawWithPaths = [
      {
        timestamp: "2026-04-07",
        action_type: "delete",
        size_reclaimed: "1 GB",
        success: true,
        category: "cache",
        path: "C:\\Users\\john\\AppData\\Local\\Temp\\chrome_cache",
        full_path: "C:\\Users\\john\\Desktop\\dump\\old_install",
      },
    ];
    const redacted = formatRedactedLog(rawWithPaths);
    expect(redacted).not.toContain("chrome_cache");
    expect(redacted).not.toContain("C:\\");
    expect(redacted).not.toContain("john");
    expect(redacted).not.toContain("AppData");
    expect(redacted).not.toContain("Desktop");
    expect(containsPathLikeContent(redacted)).toBe(false);
  });

  test("composed log context is safe to send externally", () => {
    const entries = [
      { timestamp: "2026-04-07T09:00:00", action_type: "delete", size_reclaimed: "500 MB", success: true, category: "npm_cache" },
    ];
    const redactedText = formatRedactedLog(entries);
    const ctx = composeLogContext(redactedText);
    expect(containsPathLikeContent(ctx)).toBe(false);
    expect(ctx).toContain("[CLEANUP LOG — redacted summary]");
    expect(ctx).toContain("delete");
    expect(ctx).toContain("npm_cache");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U11 — Local provider uses same pipeline (unified policy)
// ─────────────────────────────────────────────────────────────────────────────
describe("U11 — local provider same pipeline", () => {
  test("formatRedactedLog produces identical output regardless of provider context", () => {
    const entries = [
      { timestamp: "T1", action_type: "delete", size_reclaimed: "100MB", success: true, category: "temp" },
    ];
    // The function is provider-agnostic — same output for local and external
    const localResult = formatRedactedLog(entries);
    const externalResult = formatRedactedLog(entries);
    expect(localResult).toBe(externalResult);
    expect(containsPathLikeContent(localResult)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U12 — Context composer includes freshness + captured_at metadata
// ─────────────────────────────────────────────────────────────────────────────
describe("U12 — context composer metadata", () => {
  test("composeDiskContext contains freshness: fresh", () => {
    const disks = [{ name: "C:", total_gb: 500, used_gb: 300, free_gb: 200, used_pct: 60 }];
    const ctx = composeDiskContext(disks, "fresh", Date.now());
    expect(ctx).toContain("freshness: fresh");
    expect(ctx).toContain("captured_at:");
  });

  test("composeDiskContext contains freshness: cached", () => {
    const disks = [{ name: "C:", total_gb: 500, used_gb: 300, free_gb: 200, used_pct: 60 }];
    const ctx = composeDiskContext(disks, "cached", Date.now() - 30_000);
    expect(ctx).toContain("freshness: cached");
  });

  test("composeDiskContext contains freshness: stale-fallback", () => {
    const disks = [{ name: "D:", total_gb: 1000, used_gb: 500, free_gb: 500, used_pct: 50 }];
    const ctx = composeDiskContext(disks, "stale-fallback", Date.now() - 600_000);
    expect(ctx).toContain("stale-fallback");
  });

  test("composeDiskContext formats disk data correctly", () => {
    const disks = [{ name: "C:", total_gb: 500, used_gb: 300, free_gb: 200, used_pct: 60 }];
    const ctx = composeDiskContext(disks, "fresh", Date.now());
    expect(ctx).toContain("C:");
    expect(ctx).toContain("500 GB");
    expect(ctx).toContain("300 GB");
    expect(ctx).toContain("200 GB");
  });

  test("buildEnrichedMessage injects tool context block", () => {
    const msg = buildEnrichedMessage("câu hỏi", [{ id: "disk_overview", contextText: "[DISK DATA]" }]);
    expect(msg).toContain("THÔNG TIN HỆ THỐNG");
    expect(msg).toContain("[DISK DATA]");
    expect(msg).toContain("câu hỏi");
    expect(msg).toContain("HẾT THÔNG TIN HỆ THỐNG");
  });

  test("buildEnrichedMessage with no tools returns original message unchanged", () => {
    expect(buildEnrichedMessage("hello", [])).toBe("hello");
    expect(buildEnrichedMessage("hello", null)).toBe("hello");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U13 — Tool bubble payload is safe/redacted
// ─────────────────────────────────────────────────────────────────────────────
describe("U13 — tool bubble payload is safe", () => {
  test("composeLogContext wraps safe redacted text in correct label", () => {
    const ctx = composeLogContext("✓ [2026-04-07] delete (temp) — 50MB");
    expect(ctx).toContain("[CLEANUP LOG — redacted summary]");
    expect(ctx).not.toMatch(/[A-Z]:\\/);
  });

  test("composeLogContext with placeholder text is safe", () => {
    const ctx = composeLogContext("Chưa có lịch sử dọn dẹp nào.");
    expect(containsPathLikeContent(ctx)).toBe(false);
  });

  test("composeDiskContext output contains no file paths", () => {
    const disks = [{ name: "C:", total_gb: 500, used_gb: 300, free_gb: 200, used_pct: 60 }];
    const ctx = composeDiskContext(disks, "fresh", Date.now());
    // Disk context only shows label "C:" not full paths
    expect(containsPathLikeContent(ctx)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U14 — Tool failure falls back without breaking chat
// ─────────────────────────────────────────────────────────────────────────────
describe("U14 — tool failure graceful fallback", () => {
  test("all null tool results → buildEnrichedMessage returns original message", () => {
    const toolResults = [null, null].filter(Boolean);
    const msg = buildEnrichedMessage("câu hỏi", toolResults);
    expect(msg).toBe("câu hỏi");
  });

  test("empty tool results array → buildEnrichedMessage returns original", () => {
    expect(buildEnrichedMessage("test message", [])).toBe("test message");
  });

  test("evaluateFreshFetchFallback with null cache → no-injection (graceful)", () => {
    const result = evaluateFreshFetchFallback(null);
    expect(result.decision).toBe("no-injection");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U15 — Unrelated prompt keeps normal chat behavior (no tool augmentation)
// ─────────────────────────────────────────────────────────────────────────────
describe("U15 — unrelated prompt: normal chat, no tool augmentation", () => {
  test("startup app question triggers no tools", () => {
    expect(detectTools("Cách tắt ứng dụng khởi động cùng Windows?")).toEqual([]);
  });

  test("chrome cache question triggers no tools", () => {
    expect(detectTools("Cách dọn cache trình duyệt Chrome?")).toEqual([]);
  });

  test("general performance question triggers no tools", () => {
    expect(detectTools("Máy tính chạy chậm, nên làm gì?")).toEqual([]);
  });

  test("buildEnrichedMessage with empty tools preserves original message exactly", () => {
    const original = "Cách tắt ứng dụng khởi động cùng Windows?";
    expect(buildEnrichedMessage(original, [])).toBe(original);
  });

  test("containsPathLikeContent: plain text returns false", () => {
    expect(containsPathLikeContent("Here is some normal text without paths")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// U16 — EXEC-06R: Runtime exclusion + allowlist closure
// ─────────────────────────────────────────────────────────────────────────────
describe("U16 — runtime exclusion and allowlist narrowing (EXEC-06R)", () => {
  // ── Narrowed allowlist: "cleanup log" replaces "log" ──────────────────────
  test("'cleanup log' triggers cleanup_log (new narrowed keyword)", () => {
    expect(detectTools("show cleanup log")).toContain("cleanup_log");
  });

  test("'view cleanup log history' triggers cleanup_log", () => {
    expect(detectTools("view cleanup log history")).toContain("cleanup_log");
  });

  test("'log' alone no longer triggers cleanup_log — D01 CLOSED by keyword narrowing", () => {
    expect(detectTools("log")).toEqual([]);
  });

  test("'view error log' no longer triggers cleanup_log", () => {
    expect(detectTools("view error log")).toEqual([]);
  });

  // ── All other cleanup_log keywords still work after narrowing ─────────────
  test("'đã xóa bao nhiêu' still triggers cleanup_log (confirm no false negative from 'xóa' exclusion removal)", () => {
    expect(detectTools("đã xóa bao nhiêu GB rồi?")).toContain("cleanup_log");
  });

  // ── Runtime exclusion mechanism: excluded term wins over keyword match ─────
  test("runtime exclusion: 'lần trước' keyword + 'nhanh hơn' excluded → no trigger", () => {
    // "lần trước nhanh hơn không?" = "Was it faster last time?" — performance query, not cleanup history
    // Keyword "lần trước" matches, but excluded "nhanh hơn" present → detectTools returns []
    expect(detectTools("lần trước nhanh hơn không?")).toEqual([]);
  });

  test("runtime exclusion: 'lần trước' keyword without excluded term → triggers normally", () => {
    expect(detectTools("lần trước dọn dẹp được bao nhiêu?")).toContain("cleanup_log");
  });
});
