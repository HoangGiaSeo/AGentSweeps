mod commands;
mod utils;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::scan::scan_disk,
            commands::scan::get_disk_overview,
            commands::cleanup::run_cleanup,
            commands::ai::ask_ai,
            commands::ai::chat_ai,
            commands::decision::smart_cleanup,
            commands::system::check_ollama,
            commands::system::get_cleanup_log,
            commands::system::clear_cleanup_log,
            commands::system::open_url,
            commands::settings::get_api_keys,
            commands::settings::save_api_key,
            commands::settings::remove_api_key,
            commands::settings::test_api_key,
            commands::settings::chat_external,
            commands::settings::check_first_run,
            commands::settings::complete_setup,
            commands::scheduler::get_schedule,
            commands::scheduler::save_schedule,
            commands::scheduler::check_and_run_schedule,
            commands::backup::zip_backup,
            commands::cleanup::estimate_cleanup_size,
            commands::setup::check_ollama_setup,
            commands::setup::ensure_ollama_running,
            commands::setup::start_model_pull,
            commands::deep_scan::deep_scan_drive,
            commands::deep_scan::deep_clean_items,
            commands::drive_detail::analyze_drive,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}
