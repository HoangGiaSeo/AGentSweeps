use serde::Serialize;
use std::fs;
use std::path::Path;
use crate::commands::scan::format_size;

// ============================================================
// DATA STRUCTURES
// ============================================================

#[derive(Serialize, Clone)]
pub struct FolderSizeItem {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub size_display: String,
    pub item_count: u64,
    pub item_type: String,       // "folder" | "file"
    pub percent_of_used: f64,    // % of drive's used space
}

#[derive(Serialize, Clone)]
pub struct AppActivity {
    pub name: String,
    pub exe_name: String,
    pub last_used_days: i64,
    pub last_used_display: String,
    pub category: String,
    pub icon: String,
}

#[derive(Serialize)]
pub struct DriveDetailReport {
    pub drive: String,
    pub top_folders: Vec<FolderSizeItem>,
    pub recent_apps: Vec<AppActivity>,
    pub top_count: usize,
    pub apps_count: usize,
}

// ============================================================
// HELPERS
// ============================================================

fn days_since_modified(path: &Path) -> i64 {
    fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| std::time::SystemTime::now().duration_since(t).ok())
        .map(|d| d.as_secs() as i64 / 86400)
        .unwrap_or(-1)
}

fn get_dir_size_and_count(path: &Path, max_depth: usize) -> (u64, u64) {
    if !path.exists() {
        return (0, 0);
    }
    let Ok(entries) = fs::read_dir(path) else {
        return (0, 0);
    };
    let mut size = 0u64;
    let mut count = 0u64;
    for entry in entries.flatten() {
        if let Ok(meta) = entry.metadata() {
            if meta.is_dir() {
                if max_depth > 0 {
                    let (s, c) = get_dir_size_and_count(&entry.path(), max_depth - 1);
                    size += s;
                    count += c;
                }
            } else {
                size += meta.len();
                count += 1;
            }
        }
    }
    (size, count)
}

fn format_relative_time(days: i64) -> String {
    if days < 0 {
        return "Không rõ".to_string();
    }
    if days == 0 {
        return "Hôm nay".to_string();
    }
    if days == 1 {
        return "Hôm qua".to_string();
    }
    if days < 7 {
        return format!("{} ngày trước", days);
    }
    if days < 30 {
        return format!("{} tuần trước", days / 7);
    }
    if days < 365 {
        return format!("{} tháng trước", days / 30);
    }
    format!("{} năm trước", days / 365)
}

fn categorize_app(exe_lower: &str) -> (&'static str, &'static str) {
    // Returns (category_label_vi, icon)
    if ["chrome", "firefox", "msedge", "brave", "opera", "iexplore", "vivaldi", "browser"]
        .iter()
        .any(|k| exe_lower.contains(k))
    {
        return ("Trình duyệt", "🌐");
    }
    if ["code", "devenv", "pycharm", "webstorm", "phpstorm", "clion", "idea",
        "rider", "goland", "datagrip", "sublime_text", "notepad++", "vim",
        "atom", "cursor", "zed"]
        .iter()
        .any(|k| exe_lower.contains(k))
    {
        return ("IDE / Editor", "💻");
    }
    if ["node", "python", "python3", "cargo", "rustc", "javac", "java",
        "go", "ruby", "npm", "yarn", "pnpm", "git", "gcc", "clang",
        "cmake", "msbuild", "dotnet", "mvn", "gradle", "deno", "bun"]
        .iter()
        .any(|k| exe_lower.contains(k))
    {
        return ("Dev tools", "🔧");
    }
    if ["winword", "excel", "powerpnt", "outlook", "onenote", "msaccess",
        "mspub", "teams", "lync", "soffice", "libreoffice"]
        .iter()
        .any(|k| exe_lower.contains(k))
    {
        return ("Office / Họp", "📄");
    }
    if ["steam", "epicgameslauncher", "gog", "origin", "battlenet",
        "ubisoft", "riotclient", "playnite", "leagueclient"]
        .iter()
        .any(|k| exe_lower.contains(k))
    {
        return ("Game Launcher", "🎮");
    }
    if ["vlc", "mpc-hc", "potplayer", "winamp", "aimp", "spotify",
        "itunes", "foobar", "zoom", "discord", "slack", "telegram",
        "whatsapp", "signal", "skype", "viber"]
        .iter()
        .any(|k| exe_lower.contains(k))
    {
        return ("Media / Mạng xã hội", "🎵");
    }
    if ["svchost", "explorer", "rundll", "taskhost", "lsass", "csrss",
        "wininit", "winlogon", "services", "dwm", "sihost", "ctfmon",
        "searchindexer", "antimalware", "mrt", "msiexec", "conhost",
        "taskmgr", "cmd", "powershell"]
        .iter()
        .any(|k| exe_lower.contains(k))
    {
        return ("Hệ thống Windows", "⚙️");
    }
    ("Ứng dụng khác", "📱")
}

// ============================================================
// SCAN TOP-LEVEL FOLDERS OF A DRIVE
// ============================================================

fn scan_top_folders(drive: &str, used_bytes: u64) -> Vec<FolderSizeItem> {
    let root = Path::new(drive);
    let Ok(entries) = fs::read_dir(root) else {
        return vec![];
    };

    let skip_names: &[&str] = &[
        "$recycle.bin",
        "system volume information",
        "$winre_backup_partition.marker",
        "recovery",
        "pagefile.sys",
        "swapfile.sys",
        "hiberfil.sys",
        "bootmgr",
        "boot",
    ];

    let mut items: Vec<FolderSizeItem> = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("?")
            .to_string();
        let name_lower = name.to_lowercase();
        if skip_names.contains(&name_lower.as_str()) {
            continue;
        }
        let Ok(meta) = entry.metadata() else { continue };

        let (size_bytes, item_count) = if meta.is_dir() {
            get_dir_size_and_count(&path, 10)
        } else {
            (meta.len(), 1)
        };

        if size_bytes < 1_048_576 {
            continue; // skip < 1 MB
        }

        let percent = if used_bytes > 0 {
            ((size_bytes as f64 / used_bytes as f64) * 100.0 * 10.0).round() / 10.0
        } else {
            0.0
        };

        items.push(FolderSizeItem {
            name,
            path: path.to_string_lossy().to_string(),
            size_bytes,
            size_display: format_size(size_bytes),
            item_count,
            item_type: if meta.is_dir() { "folder" } else { "file" }.to_string(),
            percent_of_used: percent,
        });
    }

    items.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    items.truncate(25);
    items
}

// ============================================================
// SCAN PREFETCH FILES → APP LAST-USED TIME
// ============================================================

fn scan_prefetch_apps() -> Vec<AppActivity> {
    let prefetch_dir = Path::new("C:\\Windows\\Prefetch");
    if !prefetch_dir.exists() {
        return vec![];
    }
    let Ok(entries) = fs::read_dir(prefetch_dir) else {
        return vec![];
    };

    let mut apps: Vec<AppActivity> = Vec::new();
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();

    for entry in entries.flatten() {
        let path = entry.path();
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();
        if ext != "pf" {
            continue;
        }

        // Filename: APPNAME.EXE-XXXXXXXX.pf  or  APPNAME-XXXXXXXX.pf
        let stem = path
            .file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_string();

        // Strip the trailing -XXXXXXXX hash (8 hex chars)
        let app_exe = if let Some(pos) = stem.rfind('-') {
            let suffix = &stem[pos + 1..];
            if suffix.len() == 8 && suffix.chars().all(|c| c.is_ascii_hexdigit()) {
                stem[..pos].to_string()
            } else {
                stem.clone()
            }
        } else {
            stem.clone()
        };

        // Dedup by exe name (keep most recent already due to sort below)
        let key = app_exe.to_lowercase();
        if seen.contains(&key) {
            continue;
        }
        seen.insert(key.clone());

        // Display name = strip .EXE extension
        let name = app_exe
            .trim_end_matches(".EXE")
            .trim_end_matches(".exe")
            .to_string();

        let days = days_since_modified(&path);
        if days < 0 {
            continue;
        }

        let (category, icon) = categorize_app(&key);

        apps.push(AppActivity {
            name,
            exe_name: app_exe,
            last_used_days: days,
            last_used_display: format_relative_time(days),
            category: category.to_string(),
            icon: icon.to_string(),
        });
    }

    // Sort by most recently used first
    apps.sort_by(|a, b| a.last_used_days.cmp(&b.last_used_days));
    apps.truncate(60);
    apps
}

// ============================================================
// MAIN COMMAND
// ============================================================

#[tauri::command]
pub fn analyze_drive(drive: String, used_bytes: u64) -> DriveDetailReport {
    let top_folders = scan_top_folders(&drive, used_bytes);
    let recent_apps = scan_prefetch_apps();
    let top_count = top_folders.len();
    let apps_count = recent_apps.len();

    DriveDetailReport {
        drive,
        top_folders,
        recent_apps,
        top_count,
        apps_count,
    }
}
