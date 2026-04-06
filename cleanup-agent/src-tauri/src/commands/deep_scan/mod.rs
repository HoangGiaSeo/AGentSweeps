pub mod classify;
pub mod types;
mod zones;
mod scan;
mod clean;

use std::path::Path;
use std::sync::atomic::AtomicU64;
use std::sync::Arc;
use std::time::{Duration, Instant};
use crate::commands::scan::format_size;

use types::{DeepScanItem, DeepScanOptions, DriveAnalysis};
use zones::get_scan_zones;
use scan::{
    days_since_modified, fnv_id, get_folder_size_bounded, icon_for_category,
    scan_browser_profiles, scan_build_artifacts, scan_large_files, scan_old_downloads,
};

// Re-export commands so lib.rs path commands::deep_scan::* stays unchanged
pub use clean::deep_clean_items;
pub use clean::__cmd__deep_clean_items;

// ============================================================
// BLOCKING ORCHESTRATOR (private)
// ============================================================

fn deep_scan_drive_blocking(options: DeepScanOptions) -> DriveAnalysis {
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
        let zone_budget = Arc::new(AtomicU64::new(200_000));
        let zone_deadline = Instant::now() + Duration::from_secs(3);
        let (size_bytes, item_count) = get_folder_size_bounded(path, &zone_budget, zone_deadline);
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
        let br_budget = Arc::new(AtomicU64::new(200_000));
        let br_deadline = Instant::now() + Duration::from_secs(5);
        scan_browser_profiles(
            Path::new(&chrome_profiles),
            &mut items,
            &mut seen_paths,
            "Chrome",
            &br_budget,
            br_deadline,
        );
    }

    // ── Large files in user home ─────────────────────────────
    if options.include_large_files {
        let user_dirs = [
            home.clone(),
            format!("{}\\Documents", home),
            format!("{}\\Videos", home),
        ];
        let lf_budget = Arc::new(AtomicU64::new(500_000));
        let lf_deadline = Instant::now() + Duration::from_secs(10);
        for dir in &user_dirs {
            scan_large_files(
                Path::new(dir),
                &mut items,
                200 * 1_048_576,
                4,
                0,
                &lf_budget,
                lf_deadline,
            );
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
        let art_budget = Arc::new(AtomicU64::new(500_000));
        let art_deadline = Instant::now() + Duration::from_secs(15);
        for dir in &dev_dirs {
            if Path::new(dir).exists() {
                scan_build_artifacts(Path::new(dir), &mut items, 4, 0, &art_budget, art_deadline);
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

// ============================================================
// PUBLIC TAURI COMMANDS
// ============================================================

#[tauri::command]
pub async fn deep_scan_drive(options: DeepScanOptions) -> DriveAnalysis {
    tokio::task::spawn_blocking(move || deep_scan_drive_blocking(options))
        .await
        .unwrap_or_else(|_| DriveAnalysis {
            items: vec![],
            safe_bytes: 0,
            caution_bytes: 0,
            protected_info_bytes: 0,
            safe_display: "0 B".into(),
            caution_display: "0 B".into(),
            protected_info_display: "0 B".into(),
            total_reclaimable_bytes: 0,
            total_reclaimable_display: "0 B".into(),
        })
}
