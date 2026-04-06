import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import * as diskUtils from "./diskUtils";

export interface ScanResult {
  name: string;
  path: string;
  size_bytes: number;
  size_display: string;
  category: string;
}

export interface DiskOverview {
  drive: string;
  total_bytes: number;
  free_bytes: number;
  used_bytes: number;
  used_percent: number;
  total_display: string;
  free_display: string;
  used_display: string;
}

export function formatSize(bytes: number): string {
  if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(2) + " GB";
  if (bytes >= 1_048_576) return (bytes / 1_048_576).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
  return bytes + " B";
}

export async function getDiskOverview(): Promise<DiskOverview[]> {
  const results: DiskOverview[] = [];
  const drives = process.platform === "win32" ? ["C:\\", "D:\\", "E:\\"] : ["/"];

  for (const drive of drives) {
    try {
      const info = await diskUtils.getDiskSpace(drive);
      if (info) results.push(info);
    } catch {
      // drive not available
    }
  }
  return results;
}

function getNpmCachePath(): string {
  const home = process.env.USERPROFILE || os.homedir();
  return process.platform === "win32"
    ? path.join(home, "AppData", "Local", "npm-cache")
    : path.join(home, ".npm");
}

function getPipCachePath(): string {
  const local = process.env.LOCALAPPDATA || path.join(os.homedir(), ".local");
  return process.platform === "win32"
    ? path.join(local, "pip", "cache")
    : path.join(os.homedir(), ".cache", "pip");
}

function getCargoCachePath(): string {
  return path.join(os.homedir(), ".cargo", "registry");
}

function getGradleCachePath(): string {
  return path.join(os.homedir(), ".gradle", "caches");
}

function getVscodeCachePath(): string {
  const appdata = process.env.APPDATA || os.homedir();
  return process.platform === "win32"
    ? path.join(appdata, "Code", "Cache")
    : path.join(os.homedir(), ".config", "Code", "Cache");
}

function getTempPath(): string {
  return process.env.TEMP || os.tmpdir();
}

export async function scanDisk(mode: string): Promise<ScanResult[]> {
  const targets: Array<[string, string, string]> = [
    ["npm cache", getNpmCachePath(), "dev"],
    ["pip cache", getPipCachePath(), "dev"],
    ["Temp files", getTempPath(), "system"],
  ];

  if (mode === "deep" || mode === "analyze") {
    targets.push(
      ["Cargo cache", getCargoCachePath(), "dev"],
      ["Gradle cache", getGradleCachePath(), "dev"],
      ["VS Code Cache", getVscodeCachePath(), "dev"]
    );
    if (process.platform === "win32") {
      targets.push(
        ["Windows Prefetch", "C:\\Windows\\Prefetch", "system"],
        ["Windows Temp", "C:\\Windows\\Temp", "system"],
        ["Windows Update Cache", "C:\\Windows\\SoftwareDistribution\\Download", "system"]
      );
    }
  }

  const results: ScanResult[] = [];
  for (const [name, p, category] of targets) {
    const size_bytes = diskUtils.getFolderSize(p);
    results.push({
      name,
      path: p,
      size_bytes,
      size_display: formatSize(size_bytes),
      category,
    });
  }
  return results;
}

// Whitelist — AI cannot execute arbitrary paths
const ALLOWED_ACTIONS = new Set([
  "npm_cache", "pip_cache", "cargo_cache", "gradle_cache",
  "vscode_cache", "docker_prune", "temp_files", "windows_temp",
  "prefetch", "windows_update", "crash_dumps", "thumbnail_cache",
]);

export interface CleanupAction {
  action_type: string;
  enabled: boolean;
}

export interface CleanupResult {
  action: string;
  success: boolean;
  message: string;
}

export function runCleanup(actions: CleanupAction[]): CleanupResult[] {
  const results: CleanupResult[] = [];

  for (const action of actions) {
    if (!action.enabled) continue;

    if (!ALLOWED_ACTIONS.has(action.action_type)) {
      results.push({
        action: action.action_type,
        success: false,
        message: `Action '${action.action_type}' không nằm trong danh sách cho phép`,
      });
      continue;
    }

    results.push(executeCleanup(action.action_type));
  }
  return results;
}

function deleteDirectory(dirPath: string): { deleted: number; errors: number } {
  let deleted = 0;
  let errors = 0;
  if (!fs.existsSync(dirPath)) return { deleted, errors };

  try {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        deleted++;
      } catch {
        errors++;
      }
    }
  } catch {
    errors++;
  }
  return { deleted, errors };
}

function executeCleanup(actionType: string): CleanupResult {
  try {
    switch (actionType) {
      case "npm_cache": {
        const r = deleteDirectory(getNpmCachePath());
        return { action: actionType, success: true, message: `Đã xóa ${r.deleted} mục npm cache` };
      }
      case "pip_cache": {
        const r = deleteDirectory(getPipCachePath());
        return { action: actionType, success: true, message: `Đã xóa ${r.deleted} mục pip cache` };
      }
      case "cargo_cache": {
        const r = deleteDirectory(getCargoCachePath());
        return { action: actionType, success: true, message: `Đã xóa ${r.deleted} mục Cargo cache` };
      }
      case "gradle_cache": {
        const r = deleteDirectory(getGradleCachePath());
        return { action: actionType, success: true, message: `Đã xóa ${r.deleted} mục Gradle cache` };
      }
      case "vscode_cache": {
        const r = deleteDirectory(getVscodeCachePath());
        return { action: actionType, success: true, message: `Đã xóa ${r.deleted} mục VS Code cache` };
      }
      case "temp_files": {
        const r = deleteDirectory(getTempPath());
        return { action: actionType, success: true, message: `Đã xóa ${r.deleted} temp files` };
      }
      case "windows_temp": {
        if (process.platform !== "win32") return { action: actionType, success: false, message: "Chỉ hỗ trợ Windows" };
        const r = deleteDirectory("C:\\Windows\\Temp");
        return { action: actionType, success: true, message: `Đã xóa ${r.deleted} mục Windows Temp` };
      }
      case "prefetch": {
        if (process.platform !== "win32") return { action: actionType, success: false, message: "Chỉ hỗ trợ Windows" };
        const r = deleteDirectory("C:\\Windows\\Prefetch");
        return { action: actionType, success: true, message: `Đã xóa ${r.deleted} mục Prefetch` };
      }
      case "windows_update": {
        if (process.platform !== "win32") return { action: actionType, success: false, message: "Chỉ hỗ trợ Windows" };
        const r = deleteDirectory("C:\\Windows\\SoftwareDistribution\\Download");
        return { action: actionType, success: true, message: `Đã xóa ${r.deleted} mục Windows Update cache` };
      }
      case "crash_dumps": {
        const crashPath = process.env.LOCALAPPDATA
          ? path.join(process.env.LOCALAPPDATA, "CrashDumps")
          : path.join(os.homedir(), "CrashDumps");
        const r = deleteDirectory(crashPath);
        return { action: actionType, success: true, message: `Đã xóa ${r.deleted} crash dump` };
      }
      case "thumbnail_cache": {
        if (process.platform !== "win32") return { action: actionType, success: false, message: "Chỉ hỗ trợ Windows" };
        const thumbPath = path.join(
          process.env.LOCALAPPDATA || os.homedir(),
          "Microsoft", "Windows", "Explorer"
        );
        const r = deleteDirectory(thumbPath);
        return { action: actionType, success: true, message: `Đã xóa ${r.deleted} mục thumbnail cache` };
      }
      case "docker_prune": {
        child_process.execSync("docker system prune -f", { timeout: 60000 });
        return { action: actionType, success: true, message: "Đã chạy docker system prune" };
      }
      default:
        return { action: actionType, success: false, message: "Action không hợp lệ" };
    }
  } catch (e: any) {
    return { action: actionType, success: false, message: String(e?.message || e) };
  }
}

export function estimateCleanupSize(actionTypes: string[]): number {
  let total = 0;
  const pathMap: Record<string, string> = {
    npm_cache: getNpmCachePath(),
    pip_cache: getPipCachePath(),
    cargo_cache: getCargoCachePath(),
    gradle_cache: getGradleCachePath(),
    vscode_cache: getVscodeCachePath(),
    temp_files: getTempPath(),
    windows_temp: "C:\\Windows\\Temp",
    prefetch: "C:\\Windows\\Prefetch",
    windows_update: "C:\\Windows\\SoftwareDistribution\\Download",
  };
  for (const t of actionTypes) {
    if (pathMap[t]) total += diskUtils.getFolderSize(pathMap[t]);
  }
  return total;
}
