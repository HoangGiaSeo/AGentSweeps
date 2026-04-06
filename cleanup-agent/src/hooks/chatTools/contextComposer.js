/**
 * Context Composer — V1
 *
 * Builds the AI-injectable context strings from tool results.
 * Source of truth for context composition logic.
 *
 * Rules:
 *   - All composed strings are human-readable text blocks
 *   - Disk context always includes freshness metadata header
 *   - Log context receives already-redacted text (from redactionPipeline)
 *   - Never inject raw paths or sensitive content
 *   - buildEnrichedMessage wraps all tool context in a clearly-delineated block
 *
 * All functions are pure and side-effect-free — fully unit-testable.
 */

/**
 * Formats a disk overview array into a human-readable text block.
 *
 * @param {Array} disks — array of disk objects from getDiskOverview()
 * @returns {string}
 */
function formatDiskBlock(disks) {
  if (!Array.isArray(disks) || disks.length === 0) return "Không có dữ liệu ổ đĩa.";
  return disks
    .map((d) => {
      const total = d.total_gb ?? (d.total_bytes ? (d.total_bytes / 1073741824).toFixed(1) : "?");
      const used = d.used_gb ?? (d.used_bytes ? (d.used_bytes / 1073741824).toFixed(1) : "?");
      const free = d.free_gb ?? (d.free_bytes ? (d.free_bytes / 1073741824).toFixed(1) : "?");
      const pct = d.used_pct ?? d.percent ?? "?";
      const name = d.name ?? d.drive ?? d.mount ?? "Ổ không xác định";
      return `• ${name}: Tổng ${total} GB, Đã dùng ${used} GB (${pct}%), Còn trống ${free} GB`;
    })
    .join("\n");
}

/**
 * Composes disk overview context for AI injection.
 * Includes mandatory freshness metadata header.
 *
 * @param {Array} diskData — disk array from getDiskOverview()
 * @param {string} freshness — "fresh" | "cached" | "stale-fallback"
 * @param {number} capturedAt — Unix ms timestamp of data capture
 * @returns {string}
 */
export function composeDiskContext(diskData, freshness, capturedAt) {
  const ts = capturedAt ? new Date(capturedAt).toISOString() : "unknown";
  const header = `[DISK DATA — freshness: ${freshness}, captured_at: ${ts}]`;
  const body = formatDiskBlock(diskData);
  return `${header}\n${body}`;
}

/**
 * Composes cleanup log context for AI injection.
 * The redactedText must have already been produced by formatRedactedLog().
 *
 * @param {string} redactedText — output of formatRedactedLog()
 * @returns {string}
 */
export function composeLogContext(redactedText) {
  return `[CLEANUP LOG — redacted summary]\n${redactedText}`;
}

/**
 * Builds the full enriched user message to inject into AI context.
 * All tool context is appended as a clearly-delineated block.
 * When no tool contexts are provided, returns the original message unchanged.
 *
 * @param {string} userMessage — original user text
 * @param {Array<{ id: string, contextText: string }>} toolContexts
 * @returns {string}
 */
export function buildEnrichedMessage(userMessage, toolContexts) {
  if (!toolContexts || toolContexts.length === 0) return userMessage;
  const ctxBlock = toolContexts.map((tc) => tc.contextText).join("\n\n");
  return `${userMessage}\n\n--- THÔNG TIN HỆ THỐNG (từ tools nội bộ) ---\n${ctxBlock}\n--- HẾT THÔNG TIN HỆ THỐNG ---`;
}
