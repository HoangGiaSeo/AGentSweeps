use std::process::Command;
use std::io::{Read, Write};
use std::fs::File;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use crate::utils::logger::log_action;
use crate::utils::disk::get_folder_size;
use crate::commands::scan::format_size;

#[derive(Deserialize)]
pub struct CleanupAction {
    pub action_type: String,
    pub enabled: bool,
}

#[derive(Serialize)]
pub struct CleanupResult {
    pub action: String,
    pub success: bool,
    pub message: String,
}

/// Whitelist of allowed cleanup actions — AI cannot execute arbitrary commands
const ALLOWED_ACTIONS: &[&str] = &[
    "npm_cache",
    "pip_cache",
    "docker_prune",
    "temp_files",
    "windows_temp",
    "prefetch",
    "cargo_cache",
    "gradle_cache",
    "vscode_cache",
    "windows_update",
    "crash_dumps",
    "thumbnail_cache",
];

#[tauri::command]
pub fn run_cleanup(actions: Vec<CleanupAction>) -> Vec<CleanupResult> {
    let mut results = Vec::new();

    for action in actions {
        if !action.enabled {
            continue;
        }

        if !ALLOWED_ACTIONS.contains(&action.action_type.as_str()) {
            results.push(CleanupResult {
                action: action.action_type.clone(),
                success: false,
                message: format!("Action '{}' is not in the allowed whitelist", action.action_type),
            });
            continue;
        }

        let result = execute_cleanup(&action.action_type);
        results.push(result);
    }

    results
}

fn execute_cleanup(action_type: &str) -> CleanupResult {
    let (cmd_args, description) = match action_type {
        "npm_cache" => (
            vec!["/C", "npm cache clean --force"],
            "Clean npm cache",
        ),
        "pip_cache" => (
            vec!["/C", "pip cache purge"],
            "Clean pip cache",
        ),
        "docker_prune" => (
            vec!["/C", "docker system prune -a --volumes -f"],
            "Docker system prune",
        ),
        "temp_files" => (
            vec!["/C", "del /q/f/s %TEMP%\\* 2>nul"],
            "Clean temp files",
        ),
        "windows_temp" => (
            vec!["/C", "del /q/f/s C:\\Windows\\Temp\\* 2>nul"],
            "Clean Windows temp",
        ),
        "prefetch" => (
            vec!["/C", "del /q/f/s C:\\Windows\\Prefetch\\* 2>nul"],
            "Clean prefetch files",
        ),
        "cargo_cache" => {
            let home = std::env::var("USERPROFILE").unwrap_or_default();
            let cmd = format!("rmdir /s /q \"{}\\.cargo\\registry\\cache\" 2>nul", home);
            return execute_dynamic_cleanup(action_type, &cmd, "Clean Cargo cache");
        },
        "gradle_cache" => {
            let home = std::env::var("USERPROFILE").unwrap_or_default();
            let cmd = format!("rmdir /s /q \"{}\\.gradle\\caches\" 2>nul", home);
            return execute_dynamic_cleanup(action_type, &cmd, "Clean Gradle cache");
        },
        "vscode_cache" => {
            let home = std::env::var("APPDATA").unwrap_or_default();
            let cmd = format!("rmdir /s /q \"{}\\Code\\Cache\" 2>nul & rmdir /s /q \"{}\\Code\\CachedData\" 2>nul", home, home);
            return execute_dynamic_cleanup(action_type, &cmd, "Clean VS Code cache");
        },
        "windows_update" => (
            vec!["/C", "del /q/f/s C:\\Windows\\SoftwareDistribution\\Download\\* 2>nul"],
            "Clean Windows Update cache",
        ),
        "crash_dumps" => {
            let home = std::env::var("LOCALAPPDATA").unwrap_or_default();
            let cmd = format!("del /q/f/s \"{}\\CrashDumps\\*\" 2>nul", home);
            return execute_dynamic_cleanup(action_type, &cmd, "Clean crash dumps");
        },
        "thumbnail_cache" => {
            let home = std::env::var("LOCALAPPDATA").unwrap_or_default();
            let cmd = format!("del /q/f \"{}\\Microsoft\\Windows\\Explorer\\thumbcache_*.db\" 2>nul", home);
            return execute_dynamic_cleanup(action_type, &cmd, "Clean thumbnail cache");
        },
        _ => {
            return CleanupResult {
                action: action_type.to_string(),
                success: false,
                message: "Unknown action".into(),
            };
        }
    };

    let output = Command::new("cmd").args(&cmd_args).output();

    match output {
        Ok(o) => {
            let msg = if o.status.success() {
                format!("{} — completed successfully", description)
            } else {
                let stderr = String::from_utf8_lossy(&o.stderr);
                format!("{} — completed with warnings: {}", description, stderr.chars().take(200).collect::<String>())
            };
            log_action(action_type, &msg);
            CleanupResult {
                action: action_type.to_string(),
                success: true,
                message: msg,
            }
        }
        Err(e) => {
            let msg = format!("{} — failed: {}", description, e);
            log_action(action_type, &msg);
            CleanupResult {
                action: action_type.to_string(),
                success: false,
                message: msg,
            }
        }
    }
}

fn execute_dynamic_cleanup(action_type: &str, cmd: &str, description: &str) -> CleanupResult {
    let output = Command::new("cmd").args(["/C", cmd]).output();
    match output {
        Ok(o) => {
            let msg = if o.status.success() {
                format!("{} — completed successfully", description)
            } else {
                let stderr = String::from_utf8_lossy(&o.stderr);
                format!("{} — completed with warnings: {}", description, stderr.chars().take(200).collect::<String>())
            };
            log_action(action_type, &msg);
            CleanupResult {
                action: action_type.to_string(),
                success: true,
                message: msg,
            }
        }
        Err(e) => {
            let msg = format!("{} — failed: {}", description, e);
            log_action(action_type, &msg);
            CleanupResult {
                action: action_type.to_string(),
                success: false,
                message: msg,
            }
        }
    }
}

// ========== PATH RESOLVER ==========

/// Get the folder paths associated with an action type
pub fn get_paths_for_action(action_type: &str) -> Vec<String> {
    let home = std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Default".into());
    let local = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| format!("{}\\AppData\\Local", home));
    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| format!("{}\\AppData\\Roaming", home));
    let temp = std::env::var("TEMP").unwrap_or_else(|_| "C:\\Windows\\Temp".into());

    match action_type {
        "npm_cache" => vec![format!("{}\\AppData\\Local\\npm-cache", home)],
        "pip_cache" => vec![format!("{}\\pip\\cache", local)],
        "temp_files" => vec![temp],
        "windows_temp" => vec!["C:\\Windows\\Temp".into()],
        "prefetch" => vec!["C:\\Windows\\Prefetch".into()],
        "cargo_cache" => vec![format!("{}\\.cargo\\registry\\cache", home)],
        "gradle_cache" => vec![format!("{}\\.gradle\\caches", home)],
        "vscode_cache" => vec![
            format!("{}\\Code\\Cache", appdata),
            format!("{}\\Code\\CachedData", appdata),
        ],
        "windows_update" => vec!["C:\\Windows\\SoftwareDistribution\\Download".into()],
        "crash_dumps" => vec![format!("{}\\CrashDumps", local)],
        "thumbnail_cache" => vec![format!("{}\\Microsoft\\Windows\\Explorer", local)],
        "docker_prune" => vec![],
        _ => vec![],
    }
}

// ========== SIZE ESTIMATION ==========

#[derive(Serialize)]
pub struct EstimateItem {
    pub action_type: String,
    pub size_bytes: u64,
    pub size_display: String,
}

#[tauri::command]
pub fn estimate_cleanup_size(action_types: Vec<String>) -> Vec<EstimateItem> {
    action_types
        .iter()
        .map(|at| {
            let paths = get_paths_for_action(at);
            let total: u64 = paths.iter().map(|p| get_folder_size(p)).sum();
            EstimateItem {
                action_type: at.clone(),
                size_bytes: total,
                size_display: format_size(total),
            }
        })
        .collect()
}

// ========== ZIP BACKUP ==========

#[derive(Serialize)]
pub struct ZipResult {
    pub zip_path: String,
    pub original_size: u64,
    pub compressed_size: u64,
    pub file_count: u64,
    pub original_display: String,
    pub compressed_display: String,
}

fn get_backup_dir() -> PathBuf {
    let home = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".into());
    PathBuf::from(home).join("Desktop").join("Dev-Cleanup-Backups")
}

fn collect_files_recursive(dir: &std::path::Path, files: &mut Vec<PathBuf>, total: &mut u64, limit: u64) {
    if *total >= limit {
        return;
    }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_files_recursive(&path, files, total, limit);
            } else if path.is_file() {
                if let Ok(meta) = path.metadata() {
                    *total += meta.len();
                    files.push(path);
                }
                if *total >= limit {
                    return;
                }
            }
        }
    }
}

#[tauri::command]
pub fn zip_backup(action_types: Vec<String>) -> Result<ZipResult, String> {
    let backup_dir = get_backup_dir();
    std::fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Không thể tạo thư mục backup: {}", e))?;

    let now = chrono::Local::now();
    let timestamp = now.format("%Y%m%d_%H%M%S").to_string();
    let zip_path = backup_dir.join(format!("cleanup-backup-{}.zip", timestamp));

    let file = File::create(&zip_path)
        .map_err(|e| format!("Không thể tạo file ZIP: {}", e))?;
    let mut zip_writer = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let mut total_original: u64 = 0;
    let mut file_count: u64 = 0;
    let size_limit: u64 = 500 * 1024 * 1024; // 500 MB cap

    for action_type in &action_types {
        let paths = get_paths_for_action(action_type);
        for base_path_str in &paths {
            let base_path = std::path::Path::new(base_path_str);
            if !base_path.exists() {
                continue;
            }

            let mut files = Vec::new();
            let mut collected_size = 0u64;
            collect_files_recursive(
                base_path,
                &mut files,
                &mut collected_size,
                size_limit.saturating_sub(total_original),
            );

            let prefix = base_path.parent().unwrap_or(base_path);
            for file_path in &files {
                let relative = file_path
                    .strip_prefix(prefix)
                    .unwrap_or(file_path)
                    .to_string_lossy()
                    .replace('\\', "/");

                let zip_name = format!("{}/{}", action_type, relative);

                if let Ok(mut f) = File::open(file_path) {
                    let mut buffer = Vec::new();
                    if f.read_to_end(&mut buffer).is_ok() {
                        total_original += buffer.len() as u64;
                        if zip_writer.start_file(&zip_name, options).is_ok() {
                            let _ = zip_writer.write_all(&buffer);
                            file_count += 1;
                        }
                    }
                }

                if total_original >= size_limit {
                    break;
                }
            }
        }
    }

    zip_writer
        .finish()
        .map_err(|e| format!("Không thể hoàn tất ZIP: {}", e))?;

    let zip_size = std::fs::metadata(&zip_path).map(|m| m.len()).unwrap_or(0);

    log_action(
        "zip_backup",
        &format!(
            "Backup {} files ({}) → {} ({})",
            file_count,
            format_size(total_original),
            zip_path.to_string_lossy(),
            format_size(zip_size)
        ),
    );

    Ok(ZipResult {
        zip_path: zip_path.to_string_lossy().to_string(),
        original_size: total_original,
        compressed_size: zip_size,
        file_count,
        original_display: format_size(total_original),
        compressed_display: format_size(zip_size),
    })
}
