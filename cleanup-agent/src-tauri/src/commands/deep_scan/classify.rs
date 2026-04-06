use std::path::Path;

/// Absolute protected path segments — never deletable
const PROTECTED_SEGMENTS: &[&str] = &[
    "\\windows\\system32",
    "\\windows\\syswow64",
    "\\windows\\winsxs",
    "\\windows\\boot",
    "\\windows\\fonts",
    "\\windows\\inf",
    "\\windows\\csc",
    "\\windows\\servicing",
    "\\windows\\resources",
    "\\program files\\",
    "\\program files (x86)\\",
    "\\programdata\\microsoft\\windows\\start menu",
    "\\programdata\\microsoft\\windows\\templates",
];

/// Protected file names (at any path) — never individual-file deletable
const PROTECTED_FILES: &[&str] = &[
    "pagefile.sys",
    "swapfile.sys",
    "hiberfil.sys",
    "bootmgr",
    "ntldr",
    "ntdetect.com",
];

pub fn classify_path(path: &str) -> (&'static str, &'static str) {
    let lower = path.to_lowercase().replace('/', "\\");

    // Individual protected files (exact filename check)
    let file_lower = Path::new(&lower)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    if PROTECTED_FILES.contains(&file_lower) {
        return ("protected", "File hệ thống quan trọng — KHÔNG XÓA");
    }

    // Protected path segments
    for seg in PROTECTED_SEGMENTS {
        if lower.contains(seg) {
            return ("protected", "Thư mục hệ thống Windows cốt lõi — KHÔNG XÓA");
        }
    }

    // System extensions in Windows dir
    let in_windows = lower.contains("\\windows\\");
    if in_windows {
        let ext = Path::new(&lower)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        if ["sys", "dll", "drv", "ocx", "scr"].contains(&ext) {
            return ("protected", "Driver/DLL hệ thống Windows — KHÔNG XÓA");
        }
    }

    // Safe zones — explicit safe paths
    if lower.contains("\\temp\\") || lower.ends_with("\\temp")
        || lower.contains("\\tmp\\") || lower.ends_with("\\tmp")
        || lower.contains("\\temporary internet files")
    {
        return ("safe", "Thư mục Temp — luôn an toàn để xóa");
    }
    if lower.contains("\\windows\\prefetch") {
        return ("safe", "Cache khởi động Windows — Windows tự tạo lại");
    }
    if lower.contains("\\softwavedistribution\\download")
        || lower.contains("\\softwaredistribution\\download")
    {
        return ("safe", "Cache Windows Update đã tải — an toàn xóa");
    }
    if lower.contains("\\npm-cache") || lower.contains("\\npm\\cache") {
        return ("safe", "Cache npm — npm tự tải lại khi cần");
    }
    if lower.contains("\\pip\\cache") {
        return ("safe", "Cache pip Python — tự tải lại");
    }
    if lower.contains("\\.cargo\\registry\\cache")
        || lower.contains("\\.cargo\\registry\\src")
    {
        return ("safe", "Cache Rust crates — Cargo tự tải lại");
    }
    if lower.contains("\\.gradle\\caches") || lower.contains("\\.gradle\\wrapper") {
        return ("safe", "Cache Gradle — Gradle tự tải lại");
    }
    if lower.contains("\\.m2\\repository") {
        return ("safe", "Cache Maven — Maven tự tải lại");
    }
    if lower.contains("\\.nuget\\packages") {
        return ("safe", "Cache NuGet — dotnet tự tải lại");
    }
    if lower.contains("\\.pub-cache") {
        return ("safe", "Cache Flutter/Dart — pub tự tải lại");
    }
    if lower.contains("\\code\\cache")
        || lower.contains("\\code\\cacheddata")
        || lower.contains("\\code\\cachedextensions")
    {
        return ("safe", "Cache VS Code — tự tạo lại");
    }
    if lower.contains("\\google\\chrome\\user data")
        || lower.contains("\\microsoft\\edge\\user data")
        || lower.contains("\\mozilla\\firefox\\profiles")
        || lower.contains("\\brave-browser\\user data")
        || lower.contains("\\opera software")
    {
        if lower.contains("\\cache") || lower.contains("\\gpucache") || lower.contains("\\code cache") {
            return ("safe", "Cache trình duyệt — tự tạo lại");
        }
    }
    if lower.contains("\\crashdumps") || lower.contains("\\wer\\") || lower.contains("\\wer") {
        return ("safe", "File báo lỗi/crash dump — an toàn xóa");
    }
    if lower.contains("\\microsoft\\windows\\explorer") && lower.contains("thumbcache") {
        return ("safe", "Cache hình thu nhỏ — Windows tự tạo lại");
    }
    if lower.contains("\\$recycle.bin") {
        return ("safe", "Thùng rác — an toàn xóa");
    }

    // Caution zones
    if lower.contains("node_modules") {
        return ("caution", "Dependencies Node.js — xóa được, chạy 'npm install' để khôi phục");
    }
    if lower.ends_with("\\dist") || lower.contains("\\dist\\") {
        return ("safe", "Build output — tạo lại bằng 'npm run build'");
    }
    if lower.ends_with("\\build") || lower.contains("\\build\\") {
        return ("caution", "Build output — verify trước khi xóa, rebuilt bằng lệnh build");
    }
    if lower.ends_with("\\.next") || lower.contains("\\.next\\") {
        return ("safe", "Build cache Next.js — 'npm run build' tạo lại");
    }
    if lower.ends_with("\\__pycache__") || lower.contains("\\__pycache__\\") {
        return ("safe", "Cache Python bytecode — Python tự tạo lại");
    }
    if lower.ends_with("\\.pytest_cache") || lower.ends_with("\\.mypy_cache") {
        return ("safe", "Cache công cụ Python — an toàn xóa");
    }
    if lower.ends_with("\\target") && (lower.contains("\\src\\") || lower.contains("\\projects\\")) {
        return ("caution", "Build output Rust — 'cargo build' tạo lại");
    }

    ("caution", "Cần xem xét trước khi xóa")
}

// ============================================================
// UNIT TESTS — classify_path safety guard
// ============================================================

#[cfg(test)]
mod tests {
    use super::classify_path;

    // ── Group A: Protected Windows paths ───────────────────────
    #[test]
    fn test_system32_is_protected() {
        let (level, _) = classify_path(r"C:\Windows\System32\ntoskrnl.exe");
        assert_eq!(level, "protected");
    }

    #[test]
    fn test_syswow64_is_protected() {
        let (level, _) = classify_path(r"C:\Windows\SysWOW64\kernel32.dll");
        assert_eq!(level, "protected");
    }

    #[test]
    fn test_winsxs_is_protected() {
        let (level, _) = classify_path(r"C:\Windows\WinSxS\x86_something");
        assert_eq!(level, "protected");
    }

    #[test]
    fn test_program_files_is_protected() {
        let (level, _) = classify_path(r"C:\Program Files\SomeApp\app.exe");
        assert_eq!(level, "protected");
    }

    // ── Group B: Protected system files ────────────────────────
    #[test]
    fn test_pagefile_is_protected() {
        let (level, _) = classify_path(r"C:\pagefile.sys");
        assert_eq!(level, "protected");
    }

    #[test]
    fn test_hiberfil_is_protected() {
        let (level, _) = classify_path(r"C:\hiberfil.sys");
        assert_eq!(level, "protected");
    }

    #[test]
    fn test_bootmgr_is_protected() {
        let (level, _) = classify_path(r"C:\bootmgr");
        assert_eq!(level, "protected");
    }

    // ── Group C: Windows dir .sys/.dll extensions ──────────────
    #[test]
    fn test_windows_sys_file_is_protected() {
        let (level, _) = classify_path(r"C:\Windows\drivers\storage.sys");
        assert_eq!(level, "protected");
    }

    #[test]
    fn test_windows_dll_is_protected() {
        let (level, _) = classify_path(r"C:\Windows\something.dll");
        assert_eq!(level, "protected");
    }

    // ── Group D: Safe deletable zones ──────────────────────────
    #[test]
    fn test_temp_dir_is_safe() {
        let (level, _) = classify_path(r"C:\Users\user\AppData\Local\Temp\tmpfile.tmp");
        assert_eq!(level, "safe");
    }

    #[test]
    fn test_npm_cache_is_safe() {
        let (level, _) = classify_path(r"C:\Users\user\AppData\Local\npm-cache\pkg");
        assert_eq!(level, "safe");
    }

    #[test]
    fn test_pip_cache_is_safe() {
        let (level, _) = classify_path(r"C:\Users\user\pip\cache\wheels");
        assert_eq!(level, "safe");
    }

    #[test]
    fn test_cargo_registry_is_safe() {
        let (level, _) =
            classify_path(r"C:\Users\user\.cargo\registry\cache\index.crate");
        assert_eq!(level, "safe");
    }

    #[test]
    fn test_vscode_cache_is_safe() {
        let (level, _) =
            classify_path(r"C:\Users\user\AppData\Roaming\Code\Cache\something");
        assert_eq!(level, "safe");
    }

    #[test]
    fn test_chrome_cache_is_safe() {
        let (level, _) = classify_path(
            r"C:\Users\user\AppData\Local\Google\Chrome\User Data\Default\Cache\data_0",
        );
        assert_eq!(level, "safe");
    }

    #[test]
    fn test_prefetch_is_safe() {
        let (level, _) = classify_path(r"C:\Windows\Prefetch\CMD.EXE-1234.pf");
        assert_eq!(level, "safe");
    }

    #[test]
    fn test_crashdumps_is_safe() {
        let (level, _) =
            classify_path(r"C:\Users\user\AppData\Local\CrashDumps\crash.dmp");
        assert_eq!(level, "safe");
    }

    #[test]
    fn test_recycle_bin_is_safe() {
        let (level, _) = classify_path(r"C:\$Recycle.Bin\S-1-5-21\$RXXXXX.tmp");
        assert_eq!(level, "safe");
    }

    // ── Group E: Caution zones ──────────────────────────────────
    #[test]
    fn test_node_modules_is_caution() {
        let (level, _) =
            classify_path(r"C:\Users\user\projects\myapp\node_modules\react");
        assert_eq!(level, "caution");
    }

    #[test]
    fn test_build_folder_is_caution() {
        let (level, _) =
            classify_path(r"C:\Users\user\projects\myapp\build\output.js");
        assert_eq!(level, "caution");
    }

    #[test]
    fn test_unknown_path_is_caution() {
        let (level, _) = classify_path(r"C:\Users\user\random_documents\file.docx");
        assert_eq!(level, "caution");
    }

    // ── Group F: Safety re-check behavior ──────────────────────
    #[test]
    fn test_slash_normalization() {
        let (back, _) = classify_path(r"C:\Windows\System32\thing.dll");
        let (fwd, _) = classify_path("C:/Windows/System32/thing.dll");
        assert_eq!(back, "protected");
        assert_eq!(fwd, "protected");
    }

    #[test]
    fn test_protected_path_not_deletable() {
        let (level, _) = classify_path(r"C:\Windows\System32\important.dll");
        assert_ne!(level, "safe");
        assert_ne!(level, "caution");
    }
}
