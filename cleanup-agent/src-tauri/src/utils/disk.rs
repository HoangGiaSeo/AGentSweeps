use std::fs;
use std::path::Path;

/// Get the size of a directory in bytes (recursive)
pub fn get_folder_size(path: &str) -> u64 {
    let path = Path::new(path);
    if !path.exists() {
        return 0;
    }
    calc_dir_size(path)
}

fn calc_dir_size(path: &Path) -> u64 {
    let mut size = 0u64;
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_dir() {
                    size += calc_dir_size(&entry.path());
                } else {
                    size += meta.len();
                }
            }
        }
    }
    size
}
