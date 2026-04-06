/**
 * Intent Detector — V1
 *
 * Pure functions for detecting which tools should fire for a given user message.
 * Source of truth for trigger logic.
 *
 * All logic is pure and side-effect-free — fully unit-testable.
 */
import { AGENT_TOOLS, FORCE_REFRESH_PHRASES } from "./toolRegistry";

/**
 * Returns the list of tool IDs that should be executed for a given user message.
 * Matches against the locked V1 keyword allowlist only.
 *
 * @param {string} message — raw user input
 * @returns {string[]} — ordered array of tool IDs (e.g. ["disk_overview", "cleanup_log"])
 */
export function detectTools(message) {
  if (!message || typeof message !== "string") return [];
  const lower = message.toLowerCase();
  return AGENT_TOOLS
    .filter((tool) => tool.keywords.some((kw) => lower.includes(kw.toLowerCase())))
    .map((tool) => tool.id);
}

/**
 * Returns true if the message explicitly requests real-time / current data.
 * When true, disk cache must not be used regardless of age.
 *
 * @param {string} message
 * @returns {boolean}
 */
export function isForceRefresh(message) {
  if (!message || typeof message !== "string") return false;
  const lower = message.toLowerCase();
  return FORCE_REFRESH_PHRASES.some((phrase) => lower.includes(phrase));
}
