use serde::Serialize;
use chrono::Datelike;
use crate::commands::cleanup::{run_cleanup, CleanupAction, CleanupResult};
use crate::commands::settings::{load_settings, save_settings, ScheduleConfig};

#[derive(Serialize)]
pub struct ScheduleRunResult {
    pub ran: bool,
    pub results: Vec<CleanupResult>,
    pub message: String,
}

#[tauri::command]
pub fn get_schedule() -> ScheduleConfig {
    load_settings().schedule.unwrap_or_default()
}

#[tauri::command]
pub fn save_schedule(config: ScheduleConfig) -> Result<bool, String> {
    let mut settings = load_settings();
    settings.schedule = Some(config);
    save_settings(&settings)?;
    Ok(true)
}

#[tauri::command]
pub fn check_and_run_schedule() -> Result<ScheduleRunResult, String> {
    let settings = load_settings();
    let schedule = match settings.schedule {
        Some(ref s) if s.enabled && !s.actions.is_empty() && !s.days.is_empty() => s.clone(),
        _ => {
            return Ok(ScheduleRunResult {
                ran: false,
                results: vec![],
                message: "Schedule not active".into(),
            });
        }
    };

    let now = chrono::Local::now();
    let today_str = now.format("%Y-%m-%d").to_string();

    // Already ran today?
    if schedule.last_run == today_str {
        return Ok(ScheduleRunResult {
            ran: false,
            results: vec![],
            message: "Already ran today".into(),
        });
    }

    // Check day of week: chrono Mon=0..Sun=6
    let current_day = now.weekday().num_days_from_monday() as u8;
    if !schedule.days.contains(&current_day) {
        return Ok(ScheduleRunResult {
            ran: false,
            results: vec![],
            message: "Not a scheduled day".into(),
        });
    }

    // Check time (within 2-minute window)
    let current_time = now.format("%H:%M").to_string();
    match (time_to_minutes(&schedule.time), time_to_minutes(&current_time)) {
        (Some(sched), Some(curr)) => {
            let diff = (curr as i32 - sched as i32).abs();
            if diff > 2 {
                return Ok(ScheduleRunResult {
                    ran: false,
                    results: vec![],
                    message: "Not the scheduled time yet".into(),
                });
            }
        }
        _ => {
            return Ok(ScheduleRunResult {
                ran: false,
                results: vec![],
                message: "Invalid time format".into(),
            });
        }
    }

    // Time to run!
    let actions: Vec<CleanupAction> = schedule
        .actions
        .iter()
        .map(|a| CleanupAction {
            action_type: a.clone(),
            enabled: true,
        })
        .collect();

    let results = run_cleanup(actions);

    // Update last_run
    let mut settings = load_settings();
    if let Some(ref mut sched) = settings.schedule {
        sched.last_run = today_str;
    }
    save_settings(&settings)?;

    let count = results.len();
    let success = results.iter().filter(|r| r.success).count();

    Ok(ScheduleRunResult {
        ran: true,
        results,
        message: format!("Dọn tự động hoàn tất: {}/{} thành công", success, count),
    })
}

fn time_to_minutes(time: &str) -> Option<u32> {
    let parts: Vec<&str> = time.split(':').collect();
    if parts.len() == 2 {
        let h = parts[0].parse::<u32>().ok()?;
        let m = parts[1].parse::<u32>().ok()?;
        Some(h * 60 + m)
    } else {
        None
    }
}
