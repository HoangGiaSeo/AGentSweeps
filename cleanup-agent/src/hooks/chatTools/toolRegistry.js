/**
 * AGENT_TOOLS — Versioned Locked Allowlist V1 (2026-04-07)
 *
 * Source of truth for:
 *   - Tool IDs and labels
 *   - Keyword trigger lists
 *   - Excluded broad terms (runtime exclusion policy — processed by detectTools() in intentDetector.js)
 *
 * GOVERNANCE: Do NOT add keywords inline without opening a new wave.
 * Any modification to keywords[] requires a blueprint-approved wave.
 */
export const AGENT_TOOLS = [
  {
    id: "disk_overview",
    label: "Thông tin ổ đĩa",
    statusText: "Đang đọc thông tin ổ đĩa...",
    keywords: [
      "ổ đĩa",
      "dung lượng",
      "còn trống",
      "storage",
      "disk",
      "drive",
      "ổ c",
      "ổ d",
    ],
    // EXEC-06R: Prior terms ["hệ thống", "máy", "tối ưu"] cleared — all risk false negatives
    // when combined with valid keywords (e.g. "dung lượng hệ thống", "ổ đĩa của máy").
    // Disk exclusions deferred until safer compound terms are identified in a future wave.
    excludedFromKeywords: [],
  },
  {
    id: "cleanup_log",
    label: "Lịch sử dọn dẹp",
    statusText: "Đang đọc lịch sử dọn dẹp...",
    keywords: [
      "lịch sử dọn",
      "đã dọn",
      "cleanup log",  // EXEC-06R: narrowed from "log" — eliminates "show application log" false positive (D01)
      "lần trước",
      "đã xóa bao nhiêu",
      "cleanup history",
    ],
    // EXEC-06R: "xóa" removed — it appears inside keyword "đã xóa bao nhiêu" causing false negatives.
    // "nhanh hơn" retained — safe exclusion for performance-context queries (e.g. "lần trước nhanh hơn?").
    excludedFromKeywords: ["nhanh hơn"],
  },
];

/**
 * Force-refresh phrases — if message contains any of these,
 * disk data must always be fetched fresh regardless of cache age.
 */
export const FORCE_REFRESH_PHRASES = [
  "hiện tại",
  "bây giờ",
  "lúc này",
  "ngay lúc này",
];

/** Maximum cache age for a normal cache hit (60 seconds). */
export const CACHE_TTL_MS = 60 * 1000;

/** Maximum cache age for stale-fallback after fresh fetch failure (10 minutes). */
export const STALE_FALLBACK_TTL_MS = 10 * 60 * 1000;
