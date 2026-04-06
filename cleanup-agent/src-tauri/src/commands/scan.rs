use serde::Serialize;
use crate::utils::disk::get_folder_size;

#[derive(Serialize)]
pub struct ScanResult {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub size_display: String,
    pub category: String,
}

#[derive(Serialize)]
pub struct DiskOverview {
    pub drive: String,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub used_bytes: u64,
    pub used_percent: f64,
    pub total_display: String,
    pub free_display: String,
    pub used_display: String,
}

pub fn format_size(bytes: u64) -> String {
    if bytes >= 1_073_741_824 {
        format!("{:.2} GB", bytes as f64 / 1_073_741_824.0)
    } else if bytes >= 1_048_576 {
        format!("{:.2} MB", bytes as f64 / 1_048_576.0)
    } else if bytes >= 1024 {
        format!("{:.2} KB", bytes as f64 / 1024.0)
    } else {
        format!("{} B", bytes)
    }
}

#[tauri::command]
pub fn get_disk_overview() -> Vec<DiskOverview> {
    let mut result = Vec::new();
    // Check common drives on Windows
    for letter in &["C", "D", "E"] {
        let path = format!("{}:\\", letter);
        if let Ok(space) = get_disk_space(&path) {
            result.push(space);
        }
    }
    result
}

fn get_disk_space(root: &str) -> Result<DiskOverview, String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    let wide: Vec<u16> = OsStr::new(root).encode_wide().chain(Some(0)).collect();
    let mut free_bytes: u64 = 0;
    let mut total_bytes: u64 = 0;
    let mut total_free_bytes: u64 = 0;

    let ok = unsafe {
        winapi_get_disk_free_space(
            wide.as_ptr(),
            &mut free_bytes,
            &mut total_bytes,
            &mut total_free_bytes,
        )
    };

    if ok {
        let used_bytes = total_bytes.saturating_sub(free_bytes);
        let used_percent = if total_bytes > 0 {
            (used_bytes as f64 / total_bytes as f64) * 100.0
        } else {
            0.0
        };
        Ok(DiskOverview {
            drive: root.to_string(),
            total_bytes,
            free_bytes,
            used_bytes,
            used_percent: (used_percent * 10.0).round() / 10.0,
            total_display: format_size(total_bytes),
            free_display: format_size(free_bytes),
            used_display: format_size(used_bytes),
        })
    } else {
        Err(format!("Cannot read disk {}", root))
    }
}

#[allow(non_snake_case)]
unsafe fn winapi_get_disk_free_space(
    path: *const u16,
    free_bytes_available: &mut u64,
    total_bytes: &mut u64,
    total_free_bytes: &mut u64,
) -> bool {
    #[link(name = "kernel32")]
    extern "system" {
        fn GetDiskFreeSpaceExW(
            lpDirectoryName: *const u16,
            lpFreeBytesAvailableToCaller: *mut u64,
            lpTotalNumberOfBytes: *mut u64,
            lpTotalNumberOfFreeBytes: *mut u64,
        ) -> i32;
    }

    GetDiskFreeSpaceExW(path, free_bytes_available, total_bytes, total_free_bytes) != 0
}

#[tauri::command]
pub fn scan_disk(mode: String) -> Vec<ScanResult> {
    let mut targets: Vec<(&str, String, &str)> = vec![
        ("npm cache", get_npm_cache_path(), "dev"),
        ("pip cache", get_pip_cache_path(), "dev"),
        ("Temp files", std::env::var("TEMP").unwrap_or_else(|_| "C:\\Windows\\Temp".into()), "system"),
        ("Windows Prefetch", "C:\\Windows\\Prefetch".into(), "system"),
        ("Windows Temp", "C:\\Windows\\Temp".into(), "system"),
    ];

    // Deep mode adds more targets
    if mode == "deep" || mode == "analyze" {
        targets.extend(vec![
            ("Docker data", "C:\\ProgramData\\Docker".into(), "docker"),
            ("Cargo cache", get_cargo_cache_path(), "dev"),
            ("Gradle cache", get_gradle_cache_path(), "dev"),
            ("VS Code Cache", get_vscode_cache_path(), "dev"),
            ("Windows Update Cache", "C:\\Windows\\SoftwareDistribution\\Download".into(), "system"),
            ("Crash Dumps", get_crash_dumps_path(), "system"),
            ("Recycle Bin", "C:\\$Recycle.Bin".into(), "system"),
            ("Thumbnail Cache", get_thumbnail_cache_path(), "system"),
        ]);
    }

    targets
        .into_iter()
        .map(|(name, path, category)| {
            let size_bytes = get_folder_size(&path);
            ScanResult {
                name: name.to_string(),
                path: path.clone(),
                size_bytes,
                size_display: format_size(size_bytes),
                category: category.to_string(),
            }
        })
        .collect()
}

fn get_npm_cache_path() -> String {
    let home = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Default".into());
    format!("{}\\AppData\\Local\\npm-cache", home)
}

fn get_pip_cache_path() -> String {
    let home = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".into());
    format!("{}\\pip\\cache", home)
}

fn get_cargo_cache_path() -> String {
    let home = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Default".into());
    format!("{}\\.cargo\\registry", home)
}

fn get_gradle_cache_path() -> String {
    let home = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Default".into());
    format!("{}\\.gradle\\caches", home)
}

fn get_vscode_cache_path() -> String {
    let home = std::env::var("APPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Roaming".into());
    format!("{}\\Code\\Cache", home)
}

fn get_crash_dumps_path() -> String {
    let home = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".into());
    format!("{}\\CrashDumps", home)
}

fn get_thumbnail_cache_path() -> String {
    let home = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Users\\Default\\AppData\\Local".into());
    format!("{}\\Microsoft\\Windows\\Explorer", home)
}
