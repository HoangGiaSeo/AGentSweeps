use serde::{Deserialize, Serialize};

#[derive(Serialize, Clone)]
pub struct DeepScanItem {
    pub id: String,
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub size_display: String,
    pub category: String,
    pub safety_level: String, // "safe" | "caution" | "protected"
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
