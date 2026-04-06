use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use crate::commands::scan::format_size;
use crate::utils::logger::log_action;

// ============================================================
// DATA STRUCTURES
// ============================================================

#[derive(Serialize, Clone)]
pub struct DeepScanItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub size_display: String,
    pub category: String,
    pub safety_level: String,   // "safe" | "caution" | "protected"
    pub safety_reason: String,
    pub item_count: u64,
    pub last_modified_days: i64,
    pub can_delete: bool,
    pub icon: String,
}

#[derive(Deserialize)]
pub struct DeepScanOptions {
    pub include_browser_cache: bool,
    pub include_large_files: bool,
    pub include_old_downloads: bool,
    pub include_dev_artifacts: bool,
    pub min_size_mb: u64,
}

#[derive(Serialize)]
pub struct DriveAnalysis {
    pub items: Vec<DeepScanItem>,
    pub safe_bytes: u64,
    pub caution_bytes: u64,
    pub protected_info_bytes: u64,
    pub safe_display: String,
    pub caution_display: String,
    pub protected_info_display: String,
    pub total_reclaimable_bytes: u64,
    pub total_reclaimable_display: String,
}

#[derive(Serialize)]
pub struct DeepCleanResult {
    pub path: String,
    pub success: bool,
    pub size_freed: u64,
    pub message: String,
}

// ============================================================
// SAFETY CLASSIFICATION — hard-coded whitelist/blacklist
// ============================================================

/// Absolute protected path segments — never deletable
const PROTECTED_SEGMENTS: &[&str] = &[
    "\\windows\\system32",
    "\\windows\\syswow64",
    "\\windows\\winsxs",
    "\\windows\\boot",
    "\\windows\\fonts",
    "\\windows\\inf",
    "\\windows\\csc",
    "\\windows\\servicing",
    "\\windows\\resources",
    "\\program files\\",
    "\\program files (x86)\\",
    "\\programdata\\microsoft\\windows\\start menu",
    "\\programdata\\microsoft\\windows\\templates",
];

/// Protected file names (at any path) — never individual-file deletable
const PROTECTED_FILES: &[&str] = &[
    "pagefile.sys",
    "swapfile.sys",
    "hiberfil.sys",
    "bootmgr",
    "ntldr",
    "ntdetect.com",
];

pub fn classify_path(path: &str) -> (&'static str, &'static str) {
    let lower = path.to_lowercase().replace('/', "\\");

    // Individual protected files (exact filename check)
    let file_lower = Path::new(&lower)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    if PROTECTED_FILES.contains(&file_lower) {
        return ("protected", "File hệ thống quan trọng — KHÔNG XÓA");
    }

    // Protected path segments
    for seg in PROTECTED_SEGMENTS {
        if lower.contains(seg) {
            return ("protected", "Thư mục hệ thống Windows cốt lõi — KHÔNG XÓA");
        }
    }

    // System extensions in Windows dir  
    let in_windows = lower.contains("\\windows\\");
    if in_windows {
        let ext = Path::new(&lower)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        if ["sys", "dll", "drv", "ocx", "scr"].contains(&ext) {
            return ("protected", "Driver/DLL hệ thống Windows — KHÔNG XÓA");
        }
    }

    // Safe zones — explicit safe paths
    if lower.contains("\\temp\\") || lower.ends_with("\\temp")
        || lower.contains("\\tmp\\") || lower.ends_with("\\tmp")
        || lower.contains("\\temporary internet files")
    {
        return ("safe", "Thư mục Temp — luôn an toàn để xóa");
    }
    if lower.contains("\\windows\\prefetch") {
        return ("safe", "Cache khởi động Windows — Windows tự tạo lại");
    }
    if lower.contains("\\softwavedistribution\\download")
        || lower.contains("\\softwaredistribution\\download")
    {
        return ("safe", "Cache Windows Update đã tải — an toàn xóa");
    }
    if lower.contains("\\npm-cache") || lower.contains("\\npm\\cache") {
        return ("safe", "Cache npm — npm tự tải lại khi cần");
    }
    if lower.contains("\\pip\\cache") {
        return ("safe", "Cache pip Python — tự tải lại");
    }
    if lower.contains("\\.cargo\\registry\\cache")
        || lower.contains("\\.cargo\\registry\\src")
    {
        return ("safe", "Cache Rust crates — Cargo tự tải lại");
    }
    if lower.contains("\\.gradle\\caches") || lower.contains("\\.gradle\\wrapper") {
        return ("safe", "Cache Gradle — Gradle tự tải lại");
    }
    if lower.contains("\\.m2\\repository") {
        return ("safe", "Cache Maven — Maven tự tải lại");
    }
    if lower.contains("\\.nuget\\packages") {
        return ("safe", "Cache NuGet — dotnet tự tải lại");
    }
    if lower.contains("\\.pub-cache") {
        return ("safe", "Cache Flutter/Dart — pub tự tải lại");
    }
    if lower.contains("\\code\\cache")
        || lower.contains("\\code\\cacheddata")
        || lower.contains("\\code\\cachedextensions")
    {
        return ("safe", "Cache VS Code — tự tạo lại");
    }
    if lower.contains("\\google\\chrome\\user data")
        || lower.contains("\\microsoft\\edge\\user data")
        || lower.contains("\\mozilla\\firefox\\profiles")
        || lower.contains("\\brave-browser\\user data")
        || lower.contains("\\opera software")
    {
        if lower.contains("\\cache") || lower.contains("\\gpucache") || lower.contains("\\code cache") {
            return ("safe", "Cache trình duyệt — tự tạo lại");
        }
    }
    if lower.contains("\\crashdumps") || lower.contains("\\wer\\") || lower.contains("\\wer") {
        return ("safe", "File báo lỗi/crash dump — an toàn xóa");
    }
    if lower.contains("\\microsoft\\windows\\explorer") && lower.contains("thumbcache") {
        return ("safe", "Cache hình thu nhỏ — Windows tự tạo lại");
    }
    if lower.contains("\\$recycle.bin") {
        return ("safe", "Thùng rác — an toàn xóa");
    }

    // Caution zones
    if lower.contains("node_modules") {
        return ("caution", "Dependencies Node.js — xóa được, chạy 'npm install' để khôi phục");
    }
    if lower.ends_with("\\dist") || lower.contains("\\dist\\") {
        return ("safe", "Build output — tạo lại bằng 'npm run build'");
    }
    if lower.ends_with("\\build") || lower.contains("\\build\\") {
        return ("caution", "Build output — verify trước khi xóa, rebuilt bằng lệnh build");
    }
    if lower.ends_with("\\.next") || lower.contains("\\.next\\") {
        return ("safe", "Build cache Next.js — 'npm run build' tạo lại");
    }
    if lower.ends_with("\\__pycache__") || lower.contains("\\__pycache__\\") {
        return ("safe", "Cache Python bytecode — Python tự tạo lại");
    }
    if lower.ends_with("\\.pytest_cache") || lower.ends_with("\\.mypy_cache") {
        return ("safe", "Cache công cụ Python — an toàn xóa");
    }
    if lower.ends_with("\\target") && (lower.contains("\\src\\") || lower.contains("\\projects\\")) {
        return ("caution", "Build output Rust — 'cargo build' tạo lại");
    }

    ("caution", "Cần xem xét trước khi xóa")
}

// ============================================================
// HELPERS
// ============================================================

fn get_folder_size_with_count(path: &Path) -> (u64, u64) {
    let mut size = 0u64;
    let mut count = 0u64;
    if !path.exists() {
        return (0, 0);
    }
    let Ok(entries) = fs::read_dir(path) else { return (0, 0) };
    for entry in entries.flatten() {
        if let Ok(meta) = entry.metadata() {
            if meta.is_dir() {
                let (s, c) = get_folder_size_with_count(&entry.path());
                size += s;
                count += c;
            } else {
                size += meta.len();
                count += 1;
            }
        }
    }
    (size, count)
}

fn days_since_modified(path: &Path) -> i64 {
    fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| std::time::SystemTime::now().duration_since(t).ok())
        .map(|d| d.as_secs() as i64 / 86400)
        .unwrap_or(-1)
}

fn fnv_id(s: &str) -> String {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in s.bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    format!("{:016x}", h)
}

fn icon_for_category(cat: &str) -> &'static str {
    match cat {
        "system_junk" => "🗑️",
        "dev_cache" => "🔧",
        "app_cache" => "💻",
        "browser_cache" => "🌐",
        "crash_logs" => "💥",
        "log_files" => "📋",
        "docker" => "🐳",
        "build_artifact" => "🏗️",
        "old_download" => "📥",
        "large_file" => "📦",
        "node_modules" => "📦",
        _ => "📂",
    }
}

// ============================================================
// KNOWN SAFE ZONES CATALOG
// ============================================================

fn get_scan_zones(
    home: &str, local: &str, appdata: &str, temp: &str,
) -> Vec<(String, String, String, String, String)> {
    // (path, name, category, safety_level, reason)
    let mut zones: Vec<(String, String, String, String, String)> = Vec::new();

    let add = |zones: &mut Vec<_>, path: &str, name: &str, cat: &str, safety: &str, reason: &str| {
        zones.push((path.to_string(), name.to_string(), cat.to_string(), safety.to_string(), reason.to_string()));
    };

    // ── System junk ─────────────────────────────────────────
    add(&mut zones, temp, "Temp files (%TEMP%)", "system_junk", "safe", "File tạm hệ thống — luôn an toàn xóa");
    add(&mut zones, "C:\\Windows\\Temp", "Windows Temp", "system_junk", "safe", "Temp của Windows — an toàn");
    add(&mut zones, "C:\\Windows\\Prefetch", "Windows Prefetch", "system_junk", "safe", "Cache khởi động — Windows tự tạo lại");
    add(&mut zones, "C:\\Windows\\SoftwareDistribution\\Download", "Windows Update Cache", "system_junk", "safe", "Cache cập nhật đã tải xong — an toàn xóa");
    add(&mut zones, &format!("{}\\Temp", local), "LocalAppData Temp", "system_junk", "safe", "Temp của ứng dụng trong LocalAppData");
    add(&mut zones, "C:\\$Recycle.Bin", "Thùng rác", "system_junk", "safe", "Thùng rác — an toàn xóa hoàn toàn");

    // ── Crash & error logs ──────────────────────────────────
    add(&mut zones, &format!("{}\\CrashDumps", local), "Crash Dumps", "crash_logs", "safe", "File crash dump — an toàn xóa");
    add(&mut zones, &format!("{}\\Microsoft\\Windows\\WER", local), "Windows Error Reports (User)", "crash_logs", "safe", "Báo cáo lỗi Windows của người dùng");
    add(&mut zones, "C:\\ProgramData\\Microsoft\\Windows\\WER", "Windows Error Reports (System)", "crash_logs", "safe", "Báo cáo lỗi hệ thống");
    add(&mut zones, &format!("{}\\Microsoft\\Windows\\Explorer", local), "Thumbnail Cache", "system_junk", "safe", "Cache hình thu nhỏ — Windows tự tạo lại");

    // ── Dev package caches ──────────────────────────────────
    add(&mut zones, &format!("{}\\AppData\\Local\\npm-cache", home), "npm cache", "dev_cache", "safe", "Cache npm packages — npm tự tải lại khi cần");
    add(&mut zones, &format!("{}\\pip\\cache", local), "pip cache", "dev_cache", "safe", "Cache pip Python — tự tải lại");
    add(&mut zones, &format!("{}\\.cargo\\registry\\cache", home), "Cargo registry cache", "dev_cache", "safe", "Cache Rust crates (binary) — Cargo tự tải lại");
    add(&mut zones, &format!("{}\\.cargo\\registry\\src", home), "Cargo registry src", "dev_cache", "safe", "Source code Rust crates — tự tải lại");
    add(&mut zones, &format!("{}\\.gradle\\caches", home), "Gradle caches", "dev_cache", "safe", "Cache Gradle/Java — Gradle tự tải lại");
    add(&mut zones, &format!("{}\\.gradle\\wrapper", home), "Gradle wrapper binaries", "dev_cache", "safe", "Gradle wrapper — tự tải lại");
    add(&mut zones, &format!("{}\\.m2\\repository", home), "Maven repository", "dev_cache", "safe", "Cache Maven (.jar) — Maven tự tải lại");
    add(&mut zones, &format!("{}\\.nuget\\packages", home), "NuGet packages", "dev_cache", "safe", "Cache NuGet (.NET) — dotnet tự tải lại");
    add(&mut zones, &format!("{}\\.pub-cache", home), "Pub cache (Flutter/Dart)", "dev_cache", "safe", "Cache Flutter/Dart — pub tự tải lại");

    // ── App caches ──────────────────────────────────────────
    add(&mut zones, &format!("{}\\Code\\Cache", appdata), "VS Code Cache", "app_cache", "safe", "Cache VS Code — tự tạo lại khi mở");
    add(&mut zones, &format!("{}\\Code\\CachedData", appdata), "VS Code CachedData", "app_cache", "safe", "Data cache VS Code — tự tạo lại");
    add(&mut zones, &format!("{}\\Code\\CachedExtensions", appdata), "VS Code CachedExtensions", "app_cache", "safe", "Cache extension VS Code");
    add(&mut zones, &format!("{}\\Code\\logs", appdata), "VS Code Logs", "log_files", "safe", "Log file VS Code");
    add(&mut zones, &format!("{}\\JetBrains", local), "JetBrains IDE Cache", "app_cache", "safe", "Cache IDE JetBrains — tự tạo lại");

    // ── Browser caches ──────────────────────────────────────
    add(&mut zones, &format!("{}\\Google\\Chrome\\User Data\\Default\\Cache", local), "Chrome Cache", "browser_cache", "safe", "Cache Chrome — tự tạo lại khi duyệt web");
    add(&mut zones, &format!("{}\\Google\\Chrome\\User Data\\Default\\Code Cache", local), "Chrome Code Cache", "browser_cache", "safe", "Code cache Chrome");
    add(&mut zones, &format!("{}\\Google\\Chrome\\User Data\\Default\\GPUCache", local), "Chrome GPU Cache", "browser_cache", "safe", "GPU cache Chrome");
    add(&mut zones, &format!("{}\\Google\\Chrome\\User Data\\Default\\Service Worker\\CacheStorage", local), "Chrome Service Worker Cache", "browser_cache", "safe", "Service worker cache Chrome");
    add(&mut zones, &format!("{}\\Microsoft\\Edge\\User Data\\Default\\Cache", local), "Edge Cache", "browser_cache", "safe", "Cache Edge — tự tạo lại");
    add(&mut zones, &format!("{}\\Microsoft\\Edge\\User Data\\Default\\Code Cache", local), "Edge Code Cache", "browser_cache", "safe", "Code cache Edge");
    add(&mut zones, &format!("{}\\Mozilla\\Firefox\\Profiles", local), "Firefox Cache", "browser_cache", "safe", "Cache Firefox — tự tạo lại");
    add(&mut zones, &format!("{}\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache", local), "Brave Cache", "browser_cache", "safe", "Cache Brave");
    add(&mut zones, &format!("{}\\Opera Software\\Opera Stable\\Cache", appdata), "Opera Cache", "browser_cache", "safe", "Cache Opera");

    // ── Docker ──────────────────────────────────────────────
    add(&mut zones, "C:\\ProgramData\\Docker", "Docker Data", "docker", "caution", "Data Docker — cẩn thận nếu có container/volumes đang dùng");

    zones
}

// ============================================================
// SCANNING FUNCTIONS
// ============================================================

fn scan_large_files(
    dir: &Path,
    items: &mut Vec<DeepScanItem>,
    min_size: u64,
    max_depth: usize,
    depth: usize,
) {
    if depth > max_depth || !dir.exists() {
        return;
    }
    let dir_str = dir.to_string_lossy().to_lowercase();

    // Skip protected + heavy dirs
    if dir_str.contains("\\windows\\")
        || dir_str.contains("\\program files")
        || dir_str.contains("node_modules")
        || dir_str.contains("\\.git\\objects")
        || dir_str.contains("\\winsxs")
        || dir_str.contains("\\system32")
    {
        return;
    }

    let Ok(entries) = fs::read_dir(dir) else { return };

    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(meta) = entry.metadata() else { continue };

        if meta.is_file() && meta.len() >= min_size {
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("")
                .to_lowercase();
            if ["sys", "dll", "drv", "exe"].contains(&ext.as_str()) {
                continue;
            }
            let days = days_since_modified(&path);
            let path_str = path.to_string_lossy().to_string();
            let file_name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Unknown")
                .to_string();
            let size_str = format_size(meta.len());
            items.push(DeepScanItem {
                id: fnv_id(&path_str),
                name: file_name,
                path: path_str,
                size_bytes: meta.len(),
                size_display: size_str.clone(),
                category: "large_file".into(),
                safety_level: "caution".into(),
                safety_reason: format!(
                    "File lớn {}, lần cuối dùng {} ngày trước — xem xét trước khi xóa",
                    size_str,
                    if days >= 0 { days.to_string() } else { "?".to_string() }
                ),
                item_count: 1,
                last_modified_days: days,
                can_delete: true,
                icon: "📦".to_string(),
            });
        } else if meta.is_dir() && depth < max_depth {
            scan_large_files(&path, items, min_size, max_depth, depth + 1);
        }
    }
}

fn scan_old_downloads(dir: &Path, items: &mut Vec<DeepScanItem>, days_threshold: i64) {
    if !dir.exists() {
        return;
    }
    let Ok(entries) = fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        let Ok(meta) = entry.metadata() else { continue };
        if !meta.is_file() {
            continue;
        }
        let days = days_since_modified(&path);
        if days < days_threshold {
            continue;
        }
        let path_str = path.to_string_lossy().to_string();
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        let reason = if ["exe", "msi"].contains(&ext.as_str()) {
            format!("File cài đặt {} ngày tuổi trong Downloads — an toàn xóa sau khi đã cài", days)
        } else if ["zip", "rar", "7z", "tar", "gz"].contains(&ext.as_str()) {
            format!("File nén {} ngày không dùng trong Downloads", days)
        } else {
            format!("File {} ngày không dùng trong Downloads", days)
        };
        items.push(DeepScanItem {
            id: fnv_id(&path_str),
            name: file_name,
            path: path_str,
            size_bytes: meta.len(),
            size_display: format_size(meta.len()),
            category: "old_download".into(),
            safety_level: "caution".into(),
            safety_reason: reason,
            item_count: 1,
            last_modified_days: days,
            can_delete: true,
            icon: "📥".to_string(),
        });
    }
}

fn scan_build_artifacts(
    dir: &Path,
    items: &mut Vec<DeepScanItem>,
    max_depth: usize,
    depth: usize,
) {
    if depth > max_depth || !dir.exists() {
        return;
    }
    let dir_str = dir.to_string_lossy().to_lowercase();
    if dir_str.contains("\\windows\\")
        || dir_str.contains("\\program files")
        || dir_str.contains("\\.cargo\\registry")
    {
        return;
    }

    let Ok(entries) = fs::read_dir(dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let name_lower = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_lowercase();

        let artifact_info: Option<(&str, &str, &str)> = match name_lower.as_str() {
            "node_modules" => Some(("node_modules", "caution", "Dependencies Node.js — xóa được, chạy 'npm install' để phục hồi")),
            "dist" => Some(("🏗️ dist/", "safe", "Build output — 'npm run build' tạo lại")),
            ".next" => Some(("🏗️ .next/", "safe", "Next.js build cache — tự tạo lại")),
            "out" => Some(("🏗️ out/", "safe", "Output directory — lệnh build tạo lại")),
            "__pycache__" => Some(("🐍 __pycache__", "safe", "Python bytecode cache — Python tự tạo lại")),
            ".pytest_cache" => Some(("🐍 .pytest_cache", "safe", "Cache pytest — an toàn xóa")),
            ".mypy_cache" => Some(("🐍 .mypy_cache", "safe", "Cache mypy — an toàn xóa")),
            _ => None,
        };

        // Special case: target/ (Rust build output outside .cargo)
        let artifact_info = if artifact_info.is_none() && name_lower == "target" {
            let parent = dir.to_string_lossy().to_lowercase();
            if !parent.contains("\\.cargo") && Path::new(&format!("{}\\Cargo.toml", dir.to_string_lossy())).exists() {
                Some(("🏗️ target/ (Rust)", "caution", "Build output Rust — 'cargo build' tạo lại"))
            } else {
                None
            }
        } else {
            artifact_info
        };

        if let Some((display_suffix, safety, reason)) = artifact_info {
            let (size_bytes, item_count) = get_folder_size_with_count(&path);
            if size_bytes < 1_048_576 {
                // < 1 MB — skip but recurse
                if depth < max_depth {
                    scan_build_artifacts(&path, items, max_depth, depth + 1);
                }
                continue;
            }
            let path_str = path.to_string_lossy().to_string();
            let parent_name = dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("Unknown");
            items.push(DeepScanItem {
                id: fnv_id(&path_str),
                name: format!("{} in {}/", display_suffix, parent_name),
                path: path_str,
                size_bytes,
                size_display: format_size(size_bytes),
                category: if name_lower == "node_modules" { "node_modules" } else { "build_artifact" }.to_string(),
                safety_level: safety.to_string(),
                safety_reason: reason.to_string(),
                item_count,
                last_modified_days: days_since_modified(&path),
                can_delete: true,
                icon: icon_for_category(if name_lower == "node_modules" { "node_modules" } else { "build_artifact" }).to_string(),
            });
        } else if depth < max_depth {
            scan_build_artifacts(&path, items, max_depth, depth + 1);
        }
    }
}

// ============================================================
// MAIN COMMANDS
// ============================================================

#[tauri::command]
pub fn deep_scan_drive(options: DeepScanOptions) -> DriveAnalysis {
    let home = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Default".into());
    let local = std::env::var("LOCALAPPDATA")
        .unwrap_or_else(|_| format!("{}\\AppData\\Local", home));
    let appdata =
        std::env::var("APPDATA").unwrap_or_else(|_| format!("{}\\AppData\\Roaming", home));
    let temp = std::env::var("TEMP").unwrap_or_else(|_| "C:\\Windows\\Temp".into());

    let min_bytes = options.min_size_mb.saturating_mul(1_048_576);
    let mut items: Vec<DeepScanItem> = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();

    // ── Scan all known zones ─────────────────────────────────
    for (path_str, name, category, safety_level, reason) in
        get_scan_zones(&home, &local, &appdata, &temp)
    {
        let path = Path::new(&path_str);
        if !path.exists() {
            continue;
        }
        let (size_bytes, item_count) = get_folder_size_with_count(path);
        if size_bytes < min_bytes {
            continue;
        }
        if !seen_paths.insert(path_str.to_lowercase()) {
            continue;
        }
        let last_modified_days = days_since_modified(path);
        let can_delete = safety_level != "protected";
        items.push(DeepScanItem {
            id: fnv_id(&path_str),
            name,
            path: path_str,
            size_bytes,
            size_display: format_size(size_bytes),
            category,
            safety_level,
            safety_reason: reason,
            item_count,
            last_modified_days,
            can_delete,
            icon: icon_for_category("system_junk").to_string(),
        });
    }

    // Fix icons after initial scan
    for item in &mut items {
        item.icon = icon_for_category(&item.category).to_string();
    }

    // ── Browser cache additional discovery ───────────────────
    if options.include_browser_cache {
        let chrome_profiles = format!("{}\\Google\\Chrome\\User Data", local);
        scan_browser_profiles(
            Path::new(&chrome_profiles),
            &mut items,
            &mut seen_paths,
            "Chrome",
        );
    }

    // ── Large files in user home ─────────────────────────────
    if options.include_large_files {
        let user_dirs = [
            home.clone(),
            format!("{}\\Documents", home),
            format!("{}\\Videos", home),
        ];
        for dir in &user_dirs {
            scan_large_files(Path::new(dir), &mut items, 200 * 1_048_576, 4, 0);
        }
    }

    // ── Old downloads ────────────────────────────────────────
    if options.include_old_downloads {
        let downloads = format!("{}\\Downloads", home);
        scan_old_downloads(Path::new(&downloads), &mut items, 30);
    }

    // ── Build artifacts ──────────────────────────────────────
    if options.include_dev_artifacts {
        let dev_dirs = [
            home.clone(),
            format!("{}\\Documents", home),
            format!("{}\\Desktop", home),
            format!("{}\\source", home),
            format!("{}\\projects", home),
            format!("{}\\repos", home),
            format!("{}\\code", home),
        ];
        for dir in &dev_dirs {
            if Path::new(dir).exists() {
                scan_build_artifacts(Path::new(dir), &mut items, 4, 0);
            }
        }
    }

    // ── Deduplicate + sort ───────────────────────────────────
    items.dedup_by(|a, b| a.path.to_lowercase() == b.path.to_lowercase());
    items.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));

    let safe_bytes: u64 = items
        .iter()
        .filter(|i| i.safety_level == "safe")
        .map(|i| i.size_bytes)
        .sum();
    let caution_bytes: u64 = items
        .iter()
        .filter(|i| i.safety_level == "caution")
        .map(|i| i.size_bytes)
        .sum();
    let protected_info_bytes: u64 = items
        .iter()
        .filter(|i| i.safety_level == "protected")
        .map(|i| i.size_bytes)
        .sum();
    let total_reclaimable_bytes = safe_bytes + caution_bytes;

    DriveAnalysis {
        safe_display: format_size(safe_bytes),
        caution_display: format_size(caution_bytes),
        protected_info_display: format_size(protected_info_bytes),
        total_reclaimable_display: format_size(total_reclaimable_bytes),
        safe_bytes,
        caution_bytes,
        protected_info_bytes,
        total_reclaimable_bytes,
        items,
    }
}

fn scan_browser_profiles(
    profiles_dir: &Path,
    items: &mut Vec<DeepScanItem>,
    seen: &mut std::collections::HashSet<String>,
    browser: &str,
) {
    if !profiles_dir.exists() {
        return;
    }
    let Ok(entries) = fs::read_dir(profiles_dir) else { return };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        for sub in &["Cache", "Code Cache", "GPUCache", "Service Worker"] {
            let cache_path = path.join(sub);
            let cache_str = cache_path.to_string_lossy().to_string();
            if seen.contains(&cache_str.to_lowercase()) || !cache_path.exists() {
                continue;
            }
            let (size_bytes, item_count) = get_folder_size_with_count(&cache_path);
            if size_bytes < 1_048_576 {
                continue;
            }
            seen.insert(cache_str.to_lowercase());
            items.push(DeepScanItem {
                id: fnv_id(&cache_str),
                name: format!("{} {} ({})", browser, sub, path.file_name().and_then(|n| n.to_str()).unwrap_or("Profile")),
                path: cache_str,
                size_bytes,
                size_display: format_size(size_bytes),
                category: "browser_cache".into(),
                safety_level: "safe".into(),
                safety_reason: format!("Cache {} — trình duyệt tự tạo lại", browser),
                item_count,
                last_modified_days: days_since_modified(&cache_path),
                can_delete: true,
                icon: "🌐".into(),
            });
        }
    }
}

/// Delete items that have been user-selected (with safety re-check)
#[tauri::command]
pub fn deep_clean_items(paths: Vec<String>) -> Vec<DeepCleanResult> {
    paths
        .into_iter()
        .map(|path_str| {
            // Re-check safety before every deletion
            let (safety, reason) = classify_path(&path_str);
            if safety == "protected" {
                return DeepCleanResult {
                    path: path_str,
                    success: false,
                    size_freed: 0,
                    message: format!("BLOCKED — {}", reason),
                };
            }

            let path = Path::new(&path_str);
            if !path.exists() {
                return DeepCleanResult {
                    path: path_str,
                    success: true,
                    size_freed: 0,
                    message: "Đã xóa (không còn tồn tại)".into(),
                };
            }

            // Measure size before deletion
            let size_freed = if path.is_dir() {
                get_folder_size_with_count(path).0
            } else {
                path.metadata().map(|m| m.len()).unwrap_or(0)
            };

            let result = if path.is_dir() {
                fs::remove_dir_all(path).map_err(|e| e.to_string())
            } else {
                fs::remove_file(path).map_err(|e| e.to_string())
            };

            match result {
                Ok(_) => {
                    log_action("deep_clean", &format!("Xóa {} ({})", path_str, format_size(size_freed)));
                    DeepCleanResult {
                        path: path_str,
                        success: true,
                        size_freed,
                        message: format!("Đã xóa — giải phóng {}", format_size(size_freed)),
                    }
                }
                Err(e) => DeepCleanResult {
                    path: path_str,
                    success: false,
                    size_freed: 0,
                    message: format!("Lỗi: {}", e),
                },
            }
        })
        .collect()
}
