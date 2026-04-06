use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct ScheduleConfig {
    pub enabled: bool,
    pub days: Vec<u8>,       // 0=Mon..6=Sun
    pub time: String,         // "HH:MM"
    pub actions: Vec<String>, // action types
    pub last_run: String,     // "YYYY-MM-DD"
}

#[derive(Serialize, Deserialize, Clone, Default)]
pub struct AppSettings {
    pub api_keys: HashMap<String, ApiKeyEntry>,
    #[serde(default)]
    pub schedule: Option<ScheduleConfig>,
    #[serde(default = "default_first_run")]
    pub first_run: bool,
}

fn default_first_run() -> bool { true }

#[derive(Serialize, Deserialize, Clone)]
pub struct ApiKeyEntry {
    pub provider: String,
    pub key: String,
    pub enabled: bool,
}

fn settings_path() -> PathBuf {
    let home = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".into());
    PathBuf::from(home).join(".dev-cleanup-agent-settings.json")
}

pub(crate) fn load_settings() -> AppSettings {
    let path = settings_path();
    if path.exists() {
        let data = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        AppSettings::default()
    }
}

pub(crate) fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = settings_path();
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("Failed to write settings: {}", e))
}

#[tauri::command]
pub fn get_api_keys() -> HashMap<String, ApiKeyEntry> {
    load_settings().api_keys
}

#[tauri::command]
pub fn save_api_key(provider: String, key: String, enabled: bool) -> Result<bool, String> {
    let mut settings = load_settings();
    settings.api_keys.insert(
        provider.clone(),
        ApiKeyEntry {
            provider,
            key,
            enabled,
        },
    );
    save_settings(&settings)?;
    Ok(true)
}

#[tauri::command]
pub fn remove_api_key(provider: String) -> Result<bool, String> {
    let mut settings = load_settings();
    settings.api_keys.remove(&provider);
    save_settings(&settings)?;
    Ok(true)
}

#[tauri::command]
pub async fn test_api_key(provider: String, key: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    match provider.as_str() {
        "openai" => {
            let res = client
                .get("https://api.openai.com/v1/models")
                .header("Authorization", format!("Bearer {}", key))
                .send()
                .await
                .map_err(|e| format!("Lỗi kết nối OpenAI: {}", e))?;

            if res.status().is_success() {
                Ok("✅ Kết nối OpenAI thành công!".into())
            } else if res.status().as_u16() == 401 {
                Err("❌ API Key không hợp lệ".into())
            } else {
                Err(format!("❌ Lỗi HTTP {}", res.status()))
            }
        }
        "gemini" => {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models?key={}",
                key
            );
            let res = client
                .get(&url)
                .send()
                .await
                .map_err(|e| format!("Lỗi kết nối Gemini: {}", e))?;

            if res.status().is_success() {
                Ok("✅ Kết nối Google Gemini thành công!".into())
            } else if res.status().as_u16() == 400 || res.status().as_u16() == 403 {
                Err("❌ API Key không hợp lệ".into())
            } else {
                Err(format!("❌ Lỗi HTTP {}", res.status()))
            }
        }
        "anthropic" => {
            let res = client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", &key)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .body(r#"{"model":"claude-3-haiku-20240307","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}"#)
                .send()
                .await
                .map_err(|e| format!("Lỗi kết nối Anthropic: {}", e))?;

            if res.status().is_success() {
                Ok("✅ Kết nối Anthropic thành công!".into())
            } else if res.status().as_u16() == 401 {
                Err("❌ API Key không hợp lệ".into())
            } else {
                Err(format!("❌ Lỗi HTTP {}", res.status()))
            }
        }
        _ => Err(format!("Provider '{}' không được hỗ trợ", provider)),
    }
}

/// Chat using an external AI provider
#[tauri::command]
pub async fn chat_external(
    provider: String,
    key: String,
    messages: Vec<super::ai::OllamaChatMessage>,
    model: String,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("HTTP client error: {}", e))?;

    let system_content = "Bạn là trợ lý AI chuyên về dọn dẹp và tối ưu máy tính, tên gọi là Đệ. Bạn luôn gọi người dùng là 'đại ca'. Bạn xưng là 'Đệ'. Phong cách nói chuyện hài hước, hóm hỉnh, vui vẻ nhưng vẫn hữu ích và chính xác. Hãy trả lời bằng tiếng Việt hoặc ngôn ngữ theo yêu cầu, ngắn gọn và dí dỏm.";

    match provider.as_str() {
        "openai" => {
            let mut api_messages = vec![serde_json::json!({"role": "system", "content": system_content})];
            for m in &messages {
                api_messages.push(serde_json::json!({"role": m.role, "content": m.content}));
            }

            let res = client
                .post("https://api.openai.com/v1/chat/completions")
                .header("Authorization", format!("Bearer {}", key))
                .json(&serde_json::json!({
                    "model": model,
                    "messages": api_messages,
                    "max_tokens": 2048
                }))
                .send()
                .await
                .map_err(|e| format!("Lỗi kết nối OpenAI: {}", e))?;

            let body: serde_json::Value = res.json().await
                .map_err(|e| format!("Lỗi parse response: {}", e))?;

            if let Some(err) = body.get("error") {
                return Err(format!("OpenAI: {}", err.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error")));
            }

            body["choices"][0]["message"]["content"]
                .as_str()
                .map(String::from)
                .ok_or_else(|| "Không nhận được phản hồi từ OpenAI".into())
        }
        "gemini" => {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                model, key
            );

            let mut parts = vec![serde_json::json!({"text": system_content})];
            for m in &messages {
                parts.push(serde_json::json!({"text": format!("[{}]: {}", m.role, m.content)}));
            }

            let res = client
                .post(&url)
                .json(&serde_json::json!({
                    "contents": [{"parts": parts}]
                }))
                .send()
                .await
                .map_err(|e| format!("Lỗi kết nối Gemini: {}", e))?;

            let body: serde_json::Value = res.json().await
                .map_err(|e| format!("Lỗi parse response: {}", e))?;

            if let Some(err) = body.get("error") {
                return Err(format!("Gemini: {}", err.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error")));
            }

            body["candidates"][0]["content"]["parts"][0]["text"]
                .as_str()
                .map(String::from)
                .ok_or_else(|| "Không nhận được phản hồi từ Gemini".into())
        }
        "anthropic" => {
            let api_messages: Vec<serde_json::Value> = messages.iter()
                .map(|m| serde_json::json!({"role": m.role, "content": m.content}))
                .collect();

            let res = client
                .post("https://api.anthropic.com/v1/messages")
                .header("x-api-key", &key)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .json(&serde_json::json!({
                    "model": model,
                    "max_tokens": 2048,
                    "system": system_content,
                    "messages": api_messages
                }))
                .send()
                .await
                .map_err(|e| format!("Lỗi kết nối Anthropic: {}", e))?;

            let body: serde_json::Value = res.json().await
                .map_err(|e| format!("Lỗi parse response: {}", e))?;

            if let Some(err) = body.get("error") {
                return Err(format!("Anthropic: {}", err.get("message").and_then(|m| m.as_str()).unwrap_or("Unknown error")));
            }

            body["content"][0]["text"]
                .as_str()
                .map(String::from)
                .ok_or_else(|| "Không nhận được phản hồi từ Anthropic".into())
        }
        _ => Err(format!("Provider '{}' không được hỗ trợ", provider)),
    }
}

/// Kiểm tra xem đây có phải lần đầu chạy ứng dụng không
#[tauri::command]
pub fn check_first_run() -> bool {
    load_settings().first_run
}

/// Đánh dấu đã hoàn thành setup, không hiện lại wizard
#[tauri::command]
pub fn complete_setup() -> Result<bool, String> {
    let mut settings = load_settings();
    settings.first_run = false;
    save_settings(&settings)?;
    Ok(true)
}
