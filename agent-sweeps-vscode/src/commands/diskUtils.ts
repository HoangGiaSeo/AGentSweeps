import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { DiskOverview, formatSize } from "./diskCommands";

export function getFolderSize(dirPath: string): number {
  let total = 0;
  if (!fs.existsSync(dirPath)) return 0;
  try {
    const stack = [dirPath];
    while (stack.length > 0) {
      const current = stack.pop()!;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(current, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (entry.isFile()) {
          try {
            total += fs.statSync(full).size;
          } catch {
            // skip locked files
          }
        }
      }
    }
  } catch {
    // skip
  }
  return total;
}

export async function getDiskSpace(drivePath: string): Promise<DiskOverview | null> {
  try {
    if (process.platform === "win32") {
      const drive = drivePath.replace("\\", "").replace("/", "").replace(":", "");
      const out = child_process.execSync(
        `wmic logicaldisk where "DeviceID='${drive}:'" get Size,FreeSpace /value`,
        { timeout: 5000 }
      ).toString();

      const freeMatch = out.match(/FreeSpace=(\d+)/);
      const sizeMatch = out.match(/Size=(\d+)/);
      if (!freeMatch || !sizeMatch) return null;

      const free_bytes = parseInt(freeMatch[1]);
      const total_bytes = parseInt(sizeMatch[1]);
      const used_bytes = total_bytes - free_bytes;

      return {
        drive: drivePath,
        total_bytes,
        free_bytes,
        used_bytes,
        used_percent: Math.round((used_bytes / total_bytes) * 1000) / 10,
        total_display: formatSize(total_bytes),
        free_display: formatSize(free_bytes),
        used_display: formatSize(used_bytes),
      };
    } else {
      // macOS / Linux: df -k
      const out = child_process.execSync(`df -k "${drivePath}"`, { timeout: 5000 }).toString();
      const lines = out.trim().split("\n");
      if (lines.length < 2) return null;
      const parts = lines[1].split(/\s+/);
      const total_bytes = parseInt(parts[1]) * 1024;
      const used_bytes = parseInt(parts[2]) * 1024;
      const free_bytes = parseInt(parts[3]) * 1024;

      return {
        drive: drivePath,
        total_bytes,
        free_bytes,
        used_bytes,
        used_percent: Math.round((used_bytes / total_bytes) * 1000) / 10,
        total_display: formatSize(total_bytes),
        free_display: formatSize(free_bytes),
        used_display: formatSize(used_bytes),
      };
    }
  } catch {
    return null;
  }
}
