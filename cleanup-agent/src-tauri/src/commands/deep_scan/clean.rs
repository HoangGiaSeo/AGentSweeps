use std::fs;
use std::path::Path;
use crate::commands::scan::format_size;
use crate::utils::logger::log_action;
use super::types::DeepCleanResult;
use super::classify::classify_path;
use super::scan::get_folder_size_with_count;

/// Delete user-selected items with safety re-check before every deletion
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
                    log_action(
                        "deep_clean",
                        &format!("Xóa {} ({})", path_str, format_size(size_freed)),
                    );
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

// ============================================================
// UNIT TESTS — deep_clean_items safety re-check (delete guard)
// ============================================================

#[cfg(test)]
mod tests {
    use super::deep_clean_items;
    use super::super::classify::classify_path;

    // ── Helpers ────────────────────────────────────────────────
    fn call_delete(path: &str) -> (bool, String) {
        let results = deep_clean_items(vec![path.to_string()]);
        assert_eq!(results.len(), 1);
        let r = &results[0];
        (r.success, r.message.clone())
    }

    // ─────────────────────────────────────────────────────────
    // Group 1: Protected path MUST be blocked (no filesystem hit)
    // ─────────────────────────────────────────────────────────

    #[test]
    fn test_system32_path_is_blocked() {
        let (success, msg) = call_delete(r"C:\Windows\System32\ntoskrnl.exe");
        assert!(!success, "protected path must not succeed");
        assert!(msg.starts_with("BLOCKED"), "message must start with BLOCKED, got: {}", msg);
    }

    #[test]
    fn test_program_files_path_is_blocked() {
        let (success, msg) = call_delete(r"C:\Program Files\SomeApp\app.exe");
        assert!(!success, "protected path must not succeed");
        assert!(msg.starts_with("BLOCKED"), "message must start with BLOCKED, got: {}", msg);
    }

    #[test]
    fn test_pagefile_is_blocked() {
        let (success, msg) = call_delete(r"C:\pagefile.sys");
        assert!(!success, "pagefile.sys must be blocked");
        assert!(msg.starts_with("BLOCKED"), "message must start with BLOCKED, got: {}", msg);
    }

    #[test]
    fn test_hiberfil_is_blocked() {
        let (success, msg) = call_delete(r"C:\hiberfil.sys");
        assert!(!success, "hiberfil.sys must be blocked");
        assert!(msg.starts_with("BLOCKED"), "got: {}", msg);
    }

    #[test]
    fn test_windows_dll_is_blocked() {
        let (success, msg) = call_delete(r"C:\Windows\system32\important.dll");
        assert!(!success, "Windows .dll must be blocked");
        assert!(msg.starts_with("BLOCKED"), "got: {}", msg);
    }

    // ─────────────────────────────────────────────────────────
    // Group 2: Protected path blocked with forward slashes (slash normalization guard)
    // ─────────────────────────────────────────────────────────

    #[test]
    fn test_system32_forward_slash_is_blocked() {
        let (success, msg) = call_delete("C:/Windows/System32/kernel32.dll");
        assert!(!success, "forward-slash protected path must be blocked");
        assert!(msg.starts_with("BLOCKED"), "got: {}", msg);
    }

    #[test]
    fn test_program_files_forward_slash_is_blocked() {
        let (success, msg) = call_delete("C:/Program Files/SomeApp/data.bin");
        assert!(!success, "forward-slash Program Files path must be blocked");
        assert!(msg.starts_with("BLOCKED"), "got: {}", msg);
    }

    // ─────────────────────────────────────────────────────────
    // Group 3: Non-existent safe/caution path → accepted (no BLOCKED)
    // Deep_clean_items returns success:true for non-existent paths (already gone)
    // ─────────────────────────────────────────────────────────

    #[test]
    fn test_nonexistent_temp_path_not_blocked() {
        // Path is "safe" class but does not exist on disk — should return success:true
        let path = r"C:\Users\nonexistent_test_user_exec01r\AppData\Local\Temp\testfile_exec01r.tmp";
        let (success, msg) = call_delete(path);
        assert!(success, "non-existent safe path should succeed (already gone), got: {}", msg);
        assert!(!msg.starts_with("BLOCKED"), "safe path must not be BLOCKED");
    }

    #[test]
    fn test_nonexistent_npm_cache_not_blocked() {
        let path = r"C:\Users\nonexistent_test_user_exec01r\AppData\Local\npm-cache\_cacache";
        let (success, msg) = call_delete(path);
        assert!(success, "non-existent npm-cache path should succeed, got: {}", msg);
        assert!(!msg.starts_with("BLOCKED"), "npm-cache must not be BLOCKED");
    }

    #[test]
    fn test_nonexistent_node_modules_not_blocked() {
        // node_modules is "caution" — still allowed through the guard
        let path = r"C:\Users\nonexistent_test_user_exec01r\projects\myapp\node_modules";
        let (success, msg) = call_delete(path);
        assert!(success, "non-existent caution path should succeed (already gone), got: {}", msg);
        assert!(!msg.starts_with("BLOCKED"), "caution path must not be BLOCKED, got: {}", msg);
    }

    // ─────────────────────────────────────────────────────────
    // Group 4: Guard invariants — classify_path is authoritative gate
    // ─────────────────────────────────────────────────────────

    #[test]
    fn test_protected_classify_implies_blocked_message() {
        // Any path classify_path returns "protected" for MUST produce BLOCKED message
        let protected_cases = [
            r"C:\Windows\System32\ntdll.dll",
            r"C:\Windows\SysWOW64\wow64.dll",
            r"C:\Windows\WinSxS\amd64_thing",
            r"C:\Program Files\WindowsApps\something",
            r"C:\pagefile.sys",
            r"C:\hiberfil.sys",
            r"C:\bootmgr",
        ];
        for path in &protected_cases {
            let (safety, _) = classify_path(path);
            assert_eq!(safety, "protected", "pre-condition: {} should be protected", path);
            let (success, msg) = call_delete(path);
            assert!(!success, "protected path must not succeed: {}", path);
            assert!(
                msg.starts_with("BLOCKED"),
                "protected path must produce BLOCKED message: {} -> {}",
                path,
                msg
            );
        }
    }

    #[test]
    fn test_size_freed_is_zero_for_blocked() {
        let results = deep_clean_items(vec![r"C:\Windows\System32\ntoskrnl.exe".to_string()]);
        assert_eq!(results[0].size_freed, 0, "blocked deletion must report 0 bytes freed");
    }

    #[test]
    fn test_batch_mixed_paths_blocks_only_protected() {
        // In a batch, only protected paths are blocked; non-protected non-existent succeed
        let results = deep_clean_items(vec![
            r"C:\Windows\System32\kernel32.dll".to_string(),               // protected
            r"C:\Users\nonexistent_exec01r\AppData\Local\Temp\x.tmp".to_string(), // safe, non-existent
        ]);
        assert_eq!(results.len(), 2);
        // First: protected — must be blocked
        assert!(!results[0].success);
        assert!(results[0].message.starts_with("BLOCKED"));
        // Second: safe, non-existent — must succeed (already gone)
        assert!(results[1].success);
        assert!(!results[1].message.starts_with("BLOCKED"));
    }
}

