use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

/// Get log file path in user's home directory
fn log_file_path() -> PathBuf {
    let mut path = dirs_next().unwrap_or_else(|| PathBuf::from("."));
    path.push("dev-cleanup-agent.log");
    path
}

fn dirs_next() -> Option<PathBuf> {
    std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok()
        .map(PathBuf::from)
}

/// Log a cleanup action with timestamp
pub fn log_action(action: &str, details: &str) {
    let timestamp = chrono_simple_now();
    let line = format!("[{}] {} — {}\n", timestamp, action, details);

    let path = log_file_path();
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = file.write_all(line.as_bytes());
    }
}

fn chrono_simple_now() -> String {
    use std::time::SystemTime;
    let duration = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs();
    // Convert to readable date/time (UTC+7 for Vietnam)
    let adjusted = secs + 7 * 3600;
    let days = adjusted / 86400;
    let time_of_day = adjusted % 86400;
    let hours = time_of_day / 3600;
    let minutes = (time_of_day % 3600) / 60;
    let seconds = time_of_day % 60;

    // Simple date from epoch days (good enough for logging)
    let (year, month, day) = epoch_days_to_date(days);
    format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02}", year, month, day, hours, minutes, seconds)
}

fn epoch_days_to_date(days: u64) -> (u64, u64, u64) {
    // Algorithm from http://howardhinnant.github.io/date_algorithms.html
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

/// Read the entire cleanup log
pub fn read_log() -> String {
    let path = log_file_path();
    fs::read_to_string(&path).unwrap_or_else(|_| "No log found".into())
}

/// Clear the cleanup log
pub fn clear_log() -> bool {
    let path = log_file_path();
    fs::write(&path, "").is_ok()
}
