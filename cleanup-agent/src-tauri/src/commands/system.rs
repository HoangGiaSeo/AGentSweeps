use serde::Serialize;
use crate::utils::logger;

#[derive(Serialize)]
pub struct OllamaStatus {
    pub running: bool,
    pub models: Vec<String>,
    pub message: String,
}

#[tauri::command]
pub async fn check_ollama() -> OllamaStatus {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .unwrap_or_default();

    // Check if Ollama is reachable
    let tags_res = client.get("http://localhost:11434/api/tags").send().await;

    match tags_res {
        Ok(resp) => {
            if let Ok(body) = resp.json::<serde_json::Value>().await {
                // Lay tat ca models, bo qua embedding models (khong dung duoc cho chat)
                let all_models: Vec<String> = body
                    .get("models")
                    .and_then(|m| m.as_array())
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|m| m.get("name").and_then(|n| n.as_str()).map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();

                // Loc bo embedding models (nomic-embed, *-embed-*, mxbai-embed, v.v.)
                let mut models: Vec<String> = all_models
                    .into_iter()
                    .filter(|name| {
                        let lower = name.to_lowercase();
                        !lower.contains("embed") && !lower.contains("embedding")
                    })
                    .collect();

                // Uu tien gemma3:4b len dau neu co
                if let Some(pos) = models.iter().position(|m| m.starts_with("gemma3")) {
                    if pos != 0 {
                        let preferred = models.remove(pos);
                        models.insert(0, preferred);
                    }
                }

                let msg = if models.is_empty() {
                    "Agent chưa có model chat. Hãy chạy: ollama pull gemma3:4b".into()
                } else {
                    format!("Agent sẵn sàng với {} model(s)", models.len())
                };

                OllamaStatus {
                    running: true,
                    models,
                    message: msg,
                }
            } else {
                OllamaStatus {
                    running: true,
                    models: vec![],
                    message: "Ollama is running but could not list models".into(),
                }
            }
        }
        Err(_) => OllamaStatus {
            running: false,
            models: vec![],
            message: "Ollama is not running. Start it with: ollama serve".into(),
        },
    }
}

#[derive(Serialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub action: String,
    pub details: String,
}

#[tauri::command]
pub fn get_cleanup_log() -> Vec<LogEntry> {
    let raw = logger::read_log();
    if raw == "No log found" {
        return vec![];
    }

    raw.lines()
        .filter(|line| !line.trim().is_empty())
        .filter_map(|line| {
            // Format: [ts:12345] action — details
            let rest = line.strip_prefix('[')?;
            let (ts, rest) = rest.split_once(']')?;
            let rest = rest.trim();
            let (action, details) = rest.split_once('—').unwrap_or((rest, ""));
            Some(LogEntry {
                timestamp: ts.trim().to_string(),
                action: action.trim().to_string(),
                details: details.trim().to_string(),
            })
        })
        .collect()
}

#[tauri::command]
pub fn clear_cleanup_log() -> bool {
    logger::clear_log()
}
