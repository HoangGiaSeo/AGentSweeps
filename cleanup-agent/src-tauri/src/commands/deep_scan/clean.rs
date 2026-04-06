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
