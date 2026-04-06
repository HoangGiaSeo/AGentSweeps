/**
 * Redaction Pipeline — V1
 *
 * Cleanup log is treated as SENSITIVE BY DEFAULT.
 * All content sent to any AI provider MUST go through this pipeline.
 * V1 uses a single unified pipeline for both local and external providers
 * to avoid dual-policy complexity.
 *
 * Source of truth for redaction policy.
 * All functions are pure and side-effect-free — fully unit-testable.
 *
 * Pipeline:
 *   1. Extract only safe fields from log entry (timestamp, action_type,
 *      size_reclaimed, success, category)
 *   2. Apply path-pattern regex to any remaining string content
 *   3. Replace path segments with safe labels:
 *      [USER_PATH], [APPDATA_PATH], [TEMP_PATH], [WINDOWS_PATH], [DRIVE_C_PATH]
 *
 * Reference: reports/cto/blueprints/agentic-chat-blueprint.md § 5
 */

/**
 * Ordered list of path patterns to detect and redact.
 * More-specific patterns come first to avoid partial replacements.
 */
const PATH_PATTERNS = [
  // %ENV_VAR% style expansions
  { pattern: /(%[A-Z_]+%\\[^\s,;|"'<>]+)/gi, label: "[APPDATA_PATH]" },
  // AppData paths
  { pattern: /([A-Z]:\\Users\\[^\\]+\\AppData\\[^\s,;|"'<>]*)/gi, label: "[APPDATA_PATH]" },
  // Windows Temp paths
  { pattern: /([A-Z]:\\(?:Windows\\)?[Tt]emp\\[^\s,;|"'<>]*)/gi, label: "[TEMP_PATH]" },
  // Windows system paths
  { pattern: /([A-Z]:\\Windows\\[^\s,;|"'<>]*)/gi, label: "[WINDOWS_PATH]" },
  // User profile paths
  { pattern: /([A-Z]:\\Users\\[^\\]+\\[^\s,;|"'<>]*)/gi, label: "[USER_PATH]" },
  // Any other drive-rooted path
  { pattern: /([A-Z]:\\[^\s,;|"'<>]+)/gi, label: "[DRIVE_C_PATH]" },
  // Unix-style paths that look like filesystem paths (length > 4 to avoid false positives)
  { pattern: /(\/[A-Za-z][^\s,;|"'<>]{4,})/g, label: "[USER_PATH]" },
];

/**
 * Applies all path-pattern detections to a string, replacing with safe labels.
 *
 * @param {string} text
 * @returns {string}
 */
export function redactString(text) {
  if (!text || typeof text !== "string") return text;
  let result = text;
  for (const { pattern, label } of PATH_PATTERNS) {
    result = result.replace(pattern, label);
  }
  return result;
}

/**
 * Extracts only safe, non-sensitive fields from a raw log entry.
 * Path data is never exposed — only structured metadata is returned.
 *
 * @param {object} entry — raw log entry from getCleanupLog()
 * @returns {{ timestamp: string, action_type: string, size_reclaimed: string, success: boolean|null, category: string }}
 */
export function redactLogEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return { timestamp: "", action_type: "unknown", size_reclaimed: "", success: null, category: "unknown" };
  }

  return {
    timestamp: String(entry.timestamp ?? entry.time ?? ""),
    action_type: String(entry.action_type ?? entry.action ?? entry.type ?? "unknown"),
    size_reclaimed: String(entry.size_reclaimed ?? entry.size ?? entry.bytes_freed ?? ""),
    success: entry.success ?? entry.ok ?? null,
    category: String(entry.category ?? entry.target ?? "general"),
  };
}

/**
 * Formats an array of raw log entries into a safe, redacted text block.
 * Uses the 8 most recent entries.
 * Safe fields only — no paths are exposed.
 *
 * @param {Array} entries — raw output from getCleanupLog()
 * @returns {string}
 */
export function formatRedactedLog(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "Chưa có lịch sử dọn dẹp nào.";
  }

  return entries
    .slice(-8)
    .map((entry) => {
      const safe = redactLogEntry(entry);
      const ts = safe.timestamp ? `[${safe.timestamp}]` : "";
      const size = safe.size_reclaimed ? ` — ${safe.size_reclaimed}` : "";
      const status = safe.success === true ? "✓" : safe.success === false ? "✗" : "?";
      return `${status} ${ts} ${safe.action_type} (${safe.category})${size}`.trim();
    })
    .join("\n");
}

/**
 * Safety validator: returns true if text contains any detectable path-like pattern.
 * Use this as a last-check guard before external-provider injection.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function containsPathLikeContent(text) {
  if (!text || typeof text !== "string") return false;
  return /[A-Z]:\\/i.test(text) || /%[A-Z_]+%/i.test(text);
}
