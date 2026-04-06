use std::process::Command;
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
