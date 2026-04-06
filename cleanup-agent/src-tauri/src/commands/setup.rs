use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct OllamaSetupStatus {
    pub ollama_installed: bool,
    pub ollama_running: bool,
    pub models: Vec<String>,
}

fn find_ollama_bin() -> Option<String> {
    // Check PATH via 'where' command
    if let Ok(out) = std::process::Command::new("where").arg("ollama").output() {
        if out.status.success() {
            let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !path.is_empty() {
                return Some("ollama".to_string());
            }
        }
    }
    // Check default Windows install directory
    let home = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".into());
    let local_path = format!("{}\\AppData\\Local\\Programs\\Ollama\\ollama.exe", home);
    if std::path::Path::new(&local_path).exists() {
        return Some(local_path);
    }
    None
}

async fn is_ollama_running() -> bool {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .unwrap_or_default();
    client.get("http://localhost:11434/api/tags").send().await.is_ok()
}

async fn list_models() -> Vec<String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(3))
        .build()
        .unwrap_or_default();
    if let Ok(resp) = client.get("http://localhost:11434/api/tags").send().await {
        if let Ok(body) = resp.json::<serde_json::Value>().await {
            return body
                .get("models")
                .and_then(|m| m.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|m| m.get("name").and_then(|n| n.as_str()).map(String::from))
                        .collect()
                })
                .unwrap_or_default();
        }
    }
    vec![]
}

/// Kiểm tra trạng thái Ollama: đã cài, đang chạy, models hiện có
#[tauri::command]
pub async fn check_ollama_setup() -> OllamaSetupStatus {
    let ollama_installed = find_ollama_bin().is_some();
    let ollama_running = is_ollama_running().await;
    let models = if ollama_running { list_models().await } else { vec![] };
    OllamaSetupStatus { ollama_installed, ollama_running, models }
}

/// Khởi động ollama serve nếu chưa chạy, chờ tối đa 10 giây
#[tauri::command]
pub async fn ensure_ollama_running() -> Result<bool, String> {
    if is_ollama_running().await {
        return Ok(true);
    }
    let bin = find_ollama_bin()
        .ok_or_else(|| "Ollama chưa được cài đặt. Tải tại: https://ollama.com".to_string())?;

    std::process::Command::new(&bin)
        .arg("serve")
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Không thể khởi động Ollama: {}", e))?;

    // Poll tối đa 10 giây (20 × 500ms)
    for _ in 0..20 {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        if is_ollama_running().await {
            return Ok(true);
        }
    }
    Err("Ollama không phản hồi. Hãy chạy 'ollama serve' trong terminal.".to_string())
}

/// Kéo model về trong nền (fire-and-forget), frontend poll để biết tiến trình
#[tauri::command]
pub fn start_model_pull(model: String) -> Result<String, String> {
    let bin = find_ollama_bin().unwrap_or_else(|| "ollama".to_string());
    std::process::Command::new(&bin)
        .arg("pull")
        .arg(&model)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| format!("Lỗi bắt đầu tải model: {}", e))?;
    Ok(format!("Đang tải model {}... (chạy nền)", model))
}
