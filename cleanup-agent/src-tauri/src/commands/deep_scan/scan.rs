use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;
use crate::commands::scan::format_size;
use super::types::DeepScanItem;

// ============================================================
// SIZE / METADATA HELPERS
// ============================================================

pub fn get_folder_size_with_count(path: &Path) -> (u64, u64) {
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

pub fn get_folder_size_bounded(
    path: &Path,
    budget: &AtomicU64,
    deadline: Instant,
) -> (u64, u64) {
    let mut size = 0u64;
    let mut count = 0u64;
    if !path.exists() {
        return (0, 0);
    }
    let Ok(entries) = fs::read_dir(path) else { return (0, 0) };
    for entry in entries.flatten() {
        if budget.load(Ordering::Relaxed) == 0 || Instant::now() >= deadline {
            break;
        }
        budget.fetch_sub(1, Ordering::Relaxed);
        if let Ok(meta) = entry.metadata() {
            if meta.is_dir() {
                let (s, c) = get_folder_size_bounded(&entry.path(), budget, deadline);
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

pub fn days_since_modified(path: &Path) -> i64 {
    fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| std::time::SystemTime::now().duration_since(t).ok())
        .map(|d| d.as_secs() as i64 / 86400)
        .unwrap_or(-1)
}

pub fn fnv_id(s: &str) -> String {
    let mut h: u64 = 0xcbf29ce484222325;
    for b in s.bytes() {
        h ^= b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    format!("{:016x}", h)
}

pub fn icon_for_category(cat: &str) -> &'static str {
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
// SCAN ALGORITHMS
// ============================================================

pub fn scan_large_files(
    dir: &Path,
    items: &mut Vec<DeepScanItem>,
    min_size: u64,
    max_depth: usize,
    depth: usize,
    budget: &AtomicU64,
    deadline: Instant,
) {
    if depth > max_depth
        || !dir.exists()
        || budget.load(Ordering::Relaxed) == 0
        || Instant::now() >= deadline
    {
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
        if budget.load(Ordering::Relaxed) == 0 || Instant::now() >= deadline {
            break;
        }
        budget.fetch_sub(1, Ordering::Relaxed);
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
            scan_large_files(&path, items, min_size, max_depth, depth + 1, budget, deadline);
        }
    }
}

pub fn scan_old_downloads(dir: &Path, items: &mut Vec<DeepScanItem>, days_threshold: i64) {
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

pub fn scan_build_artifacts(
    dir: &Path,
    items: &mut Vec<DeepScanItem>,
    max_depth: usize,
    depth: usize,
    budget: &AtomicU64,
    deadline: Instant,
) {
    if depth > max_depth
        || !dir.exists()
        || budget.load(Ordering::Relaxed) == 0
        || Instant::now() >= deadline
    {
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
        if budget.load(Ordering::Relaxed) == 0 || Instant::now() >= deadline {
            break;
        }
        budget.fetch_sub(1, Ordering::Relaxed);
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
            if !parent.contains("\\.cargo")
                && Path::new(&format!(
                    "{}\\Cargo.toml",
                    dir.to_string_lossy()
                ))
                .exists()
            {
                Some(("🏗️ target/ (Rust)", "caution", "Build output Rust — 'cargo build' tạo lại"))
            } else {
                None
            }
        } else {
            artifact_info
        };

        if let Some((display_suffix, safety, reason)) = artifact_info {
            let (size_bytes, item_count) = get_folder_size_bounded(&path, budget, deadline);
            if size_bytes < 1_048_576 {
                // < 1 MB — skip but recurse
                if depth < max_depth {
                    scan_build_artifacts(&path, items, max_depth, depth + 1, budget, deadline);
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
                category: if name_lower == "node_modules" {
                    "node_modules"
                } else {
                    "build_artifact"
                }
                .to_string(),
                safety_level: safety.to_string(),
                safety_reason: reason.to_string(),
                item_count,
                last_modified_days: days_since_modified(&path),
                can_delete: true,
                icon: icon_for_category(if name_lower == "node_modules" {
                    "node_modules"
                } else {
                    "build_artifact"
                })
                .to_string(),
            });
        } else if depth < max_depth {
            scan_build_artifacts(&path, items, max_depth, depth + 1, budget, deadline);
        }
    }
}

pub fn scan_browser_profiles(
    profiles_dir: &Path,
    items: &mut Vec<DeepScanItem>,
    seen: &mut std::collections::HashSet<String>,
    browser: &str,
    budget: &AtomicU64,
    deadline: Instant,
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
            let (size_bytes, item_count) = get_folder_size_bounded(&cache_path, budget, deadline);
            if size_bytes < 1_048_576 {
                continue;
            }
            seen.insert(cache_str.to_lowercase());
            items.push(DeepScanItem {
                id: fnv_id(&cache_str),
                name: format!(
                    "{} {} ({})",
                    browser,
                    sub,
                    path.file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("Profile")
                ),
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
