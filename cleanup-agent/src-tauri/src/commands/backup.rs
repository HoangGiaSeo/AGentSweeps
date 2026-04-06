use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use serde::Serialize;
use crate::utils::logger::log_action;
use crate::commands::scan::format_size;
use super::cleanup::get_paths_for_action;

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

fn collect_files_recursive(
    dir: &Path,
    files: &mut Vec<PathBuf>,
    total: &mut u64,
    limit: u64,
) {
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
            let base_path = Path::new(base_path_str);
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
