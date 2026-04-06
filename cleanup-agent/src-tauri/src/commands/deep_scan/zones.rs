// Known safe zones catalog — all locations the scanner visits
pub fn get_scan_zones(
    home: &str,
    local: &str,
    appdata: &str,
    temp: &str,
) -> Vec<(String, String, String, String, String)> {
    // (path, name, category, safety_level, reason)
    let mut zones: Vec<(String, String, String, String, String)> = Vec::new();

    let add = |zones: &mut Vec<_>,
               path: &str,
               name: &str,
               cat: &str,
               safety: &str,
               reason: &str| {
        zones.push((
            path.to_string(),
            name.to_string(),
            cat.to_string(),
            safety.to_string(),
            reason.to_string(),
        ));
    };

    // ── System junk ─────────────────────────────────────────
    add(&mut zones, temp, "Temp files (%TEMP%)", "system_junk", "safe", "File tạm hệ thống — luôn an toàn xóa");
    add(&mut zones, "C:\\Windows\\Temp", "Windows Temp", "system_junk", "safe", "Temp của Windows — an toàn");
    add(&mut zones, "C:\\Windows\\Prefetch", "Windows Prefetch", "system_junk", "safe", "Cache khởi động — Windows tự tạo lại");
    add(&mut zones, "C:\\Windows\\SoftwareDistribution\\Download", "Windows Update Cache", "system_junk", "safe", "Cache cập nhật đã tải xong — an toàn xóa");
    add(&mut zones, &format!("{}\\Temp", local), "LocalAppData Temp", "system_junk", "safe", "Temp của ứng dụng trong LocalAppData");
    add(&mut zones, "C:\\$Recycle.Bin", "Thùng rác", "system_junk", "safe", "Thùng rác — an toàn xóa hoàn toàn");

    // ── Crash & error logs ──────────────────────────────────
    add(&mut zones, &format!("{}\\CrashDumps", local), "Crash Dumps", "crash_logs", "safe", "File crash dump — an toàn xóa");
    add(&mut zones, &format!("{}\\Microsoft\\Windows\\WER", local), "Windows Error Reports (User)", "crash_logs", "safe", "Báo cáo lỗi Windows của người dùng");
    add(&mut zones, "C:\\ProgramData\\Microsoft\\Windows\\WER", "Windows Error Reports (System)", "crash_logs", "safe", "Báo cáo lỗi hệ thống");
    add(&mut zones, &format!("{}\\Microsoft\\Windows\\Explorer", local), "Thumbnail Cache", "system_junk", "safe", "Cache hình thu nhỏ — Windows tự tạo lại");

    // ── Dev package caches ──────────────────────────────────
    add(&mut zones, &format!("{}\\AppData\\Local\\npm-cache", home), "npm cache", "dev_cache", "safe", "Cache npm packages — npm tự tải lại khi cần");
    add(&mut zones, &format!("{}\\pip\\cache", local), "pip cache", "dev_cache", "safe", "Cache pip Python — tự tải lại");
    add(&mut zones, &format!("{}\\.cargo\\registry\\cache", home), "Cargo registry cache", "dev_cache", "safe", "Cache Rust crates (binary) — Cargo tự tải lại");
    add(&mut zones, &format!("{}\\.cargo\\registry\\src", home), "Cargo registry src", "dev_cache", "safe", "Source code Rust crates — tự tải lại");
    add(&mut zones, &format!("{}\\.gradle\\caches", home), "Gradle caches", "dev_cache", "safe", "Cache Gradle/Java — Gradle tự tải lại");
    add(&mut zones, &format!("{}\\.gradle\\wrapper", home), "Gradle wrapper binaries", "dev_cache", "safe", "Gradle wrapper — tự tải lại");
    add(&mut zones, &format!("{}\\.m2\\repository", home), "Maven repository", "dev_cache", "safe", "Cache Maven (.jar) — Maven tự tải lại");
    add(&mut zones, &format!("{}\\.nuget\\packages", home), "NuGet packages", "dev_cache", "safe", "Cache NuGet (.NET) — dotnet tự tải lại");
    add(&mut zones, &format!("{}\\.pub-cache", home), "Pub cache (Flutter/Dart)", "dev_cache", "safe", "Cache Flutter/Dart — pub tự tải lại");

    // ── App caches ──────────────────────────────────────────
    add(&mut zones, &format!("{}\\Code\\Cache", appdata), "VS Code Cache", "app_cache", "safe", "Cache VS Code — tự tạo lại khi mở");
    add(&mut zones, &format!("{}\\Code\\CachedData", appdata), "VS Code CachedData", "app_cache", "safe", "Data cache VS Code — tự tạo lại");
    add(&mut zones, &format!("{}\\Code\\CachedExtensions", appdata), "VS Code CachedExtensions", "app_cache", "safe", "Cache extension VS Code");
    add(&mut zones, &format!("{}\\Code\\logs", appdata), "VS Code Logs", "log_files", "safe", "Log file VS Code");
    add(&mut zones, &format!("{}\\JetBrains", local), "JetBrains IDE Cache", "app_cache", "safe", "Cache IDE JetBrains — tự tạo lại");

    // ── Browser caches ──────────────────────────────────────
    add(&mut zones, &format!("{}\\Google\\Chrome\\User Data\\Default\\Cache", local), "Chrome Cache", "browser_cache", "safe", "Cache Chrome — tự tạo lại khi duyệt web");
    add(&mut zones, &format!("{}\\Google\\Chrome\\User Data\\Default\\Code Cache", local), "Chrome Code Cache", "browser_cache", "safe", "Code cache Chrome");
    add(&mut zones, &format!("{}\\Google\\Chrome\\User Data\\Default\\GPUCache", local), "Chrome GPU Cache", "browser_cache", "safe", "GPU cache Chrome");
    add(&mut zones, &format!("{}\\Google\\Chrome\\User Data\\Default\\Service Worker\\CacheStorage", local), "Chrome Service Worker Cache", "browser_cache", "safe", "Service worker cache Chrome");
    add(&mut zones, &format!("{}\\Microsoft\\Edge\\User Data\\Default\\Cache", local), "Edge Cache", "browser_cache", "safe", "Cache Edge — tự tạo lại");
    add(&mut zones, &format!("{}\\Microsoft\\Edge\\User Data\\Default\\Code Cache", local), "Edge Code Cache", "browser_cache", "safe", "Code cache Edge");
    add(&mut zones, &format!("{}\\Mozilla\\Firefox\\Profiles", local), "Firefox Cache", "browser_cache", "safe", "Cache Firefox — tự tạo lại");
    add(&mut zones, &format!("{}\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache", local), "Brave Cache", "browser_cache", "safe", "Cache Brave");
    add(&mut zones, &format!("{}\\Opera Software\\Opera Stable\\Cache", appdata), "Opera Cache", "browser_cache", "safe", "Cache Opera");

    // ── Docker ──────────────────────────────────────────────
    add(&mut zones, "C:\\ProgramData\\Docker", "Docker Data", "docker", "caution", "Data Docker — cẩn thận nếu có container/volumes đang dùng");

    zones
}
