import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const LOG_PATH = path.join(os.homedir(), ".agent-sweeps-log.json");

export interface LogEntry {
  timestamp: string;
  action: string;
  success: boolean;
  message: string;
}

export function logAction(action: string, success: boolean, message: string): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    action,
    success,
    message,
  };
  let entries: LogEntry[] = [];
  if (fs.existsSync(LOG_PATH)) {
    try {
      entries = JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
    } catch {
      /* ignore */
    }
  }
  entries.unshift(entry);
  // Keep last 500 entries
  if (entries.length > 500) entries = entries.slice(0, 500);
  fs.writeFileSync(LOG_PATH, JSON.stringify(entries, null, 2), "utf-8");
}

export function getCleanupLog(): LogEntry[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, "utf-8"));
  } catch {
    return [];
  }
}

export function clearCleanupLog(): void {
  fs.writeFileSync(LOG_PATH, "[]", "utf-8");
}
