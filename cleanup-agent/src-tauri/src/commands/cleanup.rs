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

// ============================================================
// UNIT TESTS — cleanup whitelist boundary
// ============================================================

#[cfg(test)]
mod tests {
    use super::{run_cleanup, CleanupAction, ALLOWED_ACTIONS};

    fn make_action(action_type: &str, enabled: bool) -> CleanupAction {
        CleanupAction {
            action_type: action_type.to_string(),
            enabled,
        }
    }

    // ─────────────────────────────────────────────────────────
    // Group 1: Invalid / unlisted action must be rejected
    // ─────────────────────────────────────────────────────────

    #[test]
    fn test_arbitrary_command_rejected() {
        let results = run_cleanup(vec![make_action("rm -rf /", true)]);
        assert_eq!(results.len(), 1);
        assert!(!results[0].success, "arbitrary command must be rejected");
        assert!(
            results[0].message.contains("not in the allowed whitelist"),
            "rejection message must mention whitelist, got: {}",
            results[0].message
        );
    }

    #[test]
    fn test_shell_injection_attempt_rejected() {
        let results = run_cleanup(vec![make_action("npm_cache; del /f C:\\Windows\\*", true)]);
        assert_eq!(results.len(), 1);
        assert!(!results[0].success, "injection attempt must be rejected");
        assert!(results[0].message.contains("not in the allowed whitelist"));
    }

    #[test]
    fn test_empty_string_action_rejected() {
        let results = run_cleanup(vec![make_action("", true)]);
        assert_eq!(results.len(), 1);
        assert!(!results[0].success, "empty action_type must be rejected");
    }

    #[test]
    fn test_unknown_action_rejected() {
        let results = run_cleanup(vec![make_action("delete_everything", true)]);
        assert!(!results[0].success);
        assert!(results[0].message.contains("not in the allowed whitelist"));
    }

    #[test]
    fn test_zip_backup_is_not_a_cleanup_action() {
        // zip_backup moved to backup.rs — it must NOT appear in ALLOWED_ACTIONS
        // (it is a separate IPC command, not dispatched through run_cleanup)
        assert!(
            !ALLOWED_ACTIONS.contains(&"zip_backup"),
            "zip_backup must not be in ALLOWED_ACTIONS — it is a separate command"
        );
    }

    // ─────────────────────────────────────────────────────────
    // Group 2: Disabled action must be skipped (not even reach whitelist check)
    // ─────────────────────────────────────────────────────────

    #[test]
    fn test_disabled_action_is_skipped() {
        let results = run_cleanup(vec![make_action("npm_cache", false)]);
        // disabled actions are silently skipped — result vec should be empty
        assert_eq!(results.len(), 0, "disabled action must produce no result");
    }

    #[test]
    fn test_disabled_invalid_action_is_skipped() {
        // Even an invalid action, if disabled, must be skipped silently
        let results = run_cleanup(vec![make_action("rm -rf /", false)]);
        assert_eq!(results.len(), 0, "disabled action must be skipped regardless of validity");
    }

    // ─────────────────────────────────────────────────────────
    // Group 3: All ALLOWED_ACTIONS entries are accepted through whitelist
    // (dispatch may fail on test OS, but whitelist gate must pass)
    // ─────────────────────────────────────────────────────────

    #[test]
    fn test_all_allowed_actions_pass_whitelist() {
        for action_type in ALLOWED_ACTIONS {
            let results = run_cleanup(vec![make_action(action_type, true)]);
            assert_eq!(results.len(), 1, "should get 1 result for {}", action_type);
            // The result may succeed or fail depending on environment,
            // but it must NOT contain "not in the allowed whitelist"
            assert!(
                !results[0].message.contains("not in the allowed whitelist"),
                "ALLOWED action '{}' must not be rejected by whitelist gate, got: {}",
                action_type,
                results[0].message
            );
        }
    }

    // ─────────────────────────────────────────────────────────
    // Group 4: Whitelist count and content invariants
    // (guards against accidental reduction or expansion of whitelist)
    // ─────────────────────────────────────────────────────────

    #[test]
    fn test_allowed_actions_count_is_12() {
        assert_eq!(
            ALLOWED_ACTIONS.len(),
            12,
            "ALLOWED_ACTIONS must have exactly 12 entries; change this test if whitelist is intentionally modified"
        );
    }

    #[test]
    fn test_allowed_actions_contains_expected_entries() {
        let expected = [
            "npm_cache", "pip_cache", "docker_prune", "temp_files", "windows_temp",
            "prefetch", "cargo_cache", "gradle_cache", "vscode_cache",
            "windows_update", "crash_dumps", "thumbnail_cache",
        ];
        for entry in &expected {
            assert!(
                ALLOWED_ACTIONS.contains(entry),
                "ALLOWED_ACTIONS must contain '{}'",
                entry
            );
        }
    }

    #[test]
    fn test_backup_extraction_did_not_add_to_whitelist() {
        // After backup.rs extraction (EXEC-01), whitelist must remain at 12.
        // zip_backup is NOT a cleanup action — it is a separate backup command.
        assert!(!ALLOWED_ACTIONS.contains(&"zip_backup"));
        assert!(!ALLOWED_ACTIONS.contains(&"backup"));
        assert!(!ALLOWED_ACTIONS.contains(&"create_backup"));
    }

    // ─────────────────────────────────────────────────────────
    // Group 5: Mixed batch — partial accept/reject
    // ─────────────────────────────────────────────────────────

    #[test]
    fn test_batch_rejects_invalid_accepts_valid() {
        let results = run_cleanup(vec![
            make_action("npm_cache", true),            // valid — passes gate
            make_action("rm -rf /", true),             // invalid — rejected
            make_action("pip_cache", true),            // valid — passes gate
        ]);
        assert_eq!(results.len(), 3);
        // npm_cache: passes whitelist (may succeed or fail at dispatch)
        assert!(!results[0].message.contains("not in the allowed whitelist"),
            "npm_cache must pass whitelist gate");
        // rm -rf /: rejected
        assert!(!results[1].success);
        assert!(results[1].message.contains("not in the allowed whitelist"));
        // pip_cache: passes whitelist
        assert!(!results[2].message.contains("not in the allowed whitelist"),
            "pip_cache must pass whitelist gate");
    }
}

