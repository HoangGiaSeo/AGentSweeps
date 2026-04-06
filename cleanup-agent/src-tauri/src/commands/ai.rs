use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Deserialize)]
struct OllamaResponse {
    response: Option<String>,
}

#[derive(Deserialize)]
struct OllamaChatResponse {
    message: Option<OllamaChatMessage>,
    error: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct OllamaChatMessage {
    pub role: String,
    pub content: String,
}

#[tauri::command]
pub async fn ask_ai(prompt: String) -> Result<String, String> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let res = client
        .post("http://localhost:11434/api/generate")
        .json(&json!({
            "model": "gemma3:4b",
            "prompt": prompt,
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Cannot connect to Ollama. Make sure Ollama is running (ollama serve).".to_string()
            } else if e.is_timeout() {
                "AI request timed out. Try again with a simpler query.".to_string()
            } else {
                format!("AI request failed: {}", e)
            }
        })?;

    let body: OllamaResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse AI response: {}", e))?;

    Ok(body.response.unwrap_or_else(|| "No response from AI".into()))
}

#[tauri::command]
pub async fn chat_ai(messages: Vec<OllamaChatMessage>, model: String) -> Result<String, String> {
    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let system_msg = OllamaChatMessage {
        role: "system".into(),
        content: "Bạn là trợ lý Agent chuyên về dọn dẹp và tối ưu máy tính, tên gọi là Đệ. Bạn luôn gọi người dùng là 'đại ca'. Bạn xưng là 'Đệ'. Phong cách nói chuyện hài hước, hóm hỉnh, vui vẻ nhưng vẫn hữu ích và chính xác. Hãy trả lời bằng tiếng Việt, ngắn gọn và dí dỏm. Bạn có thể tư vấn về: xóa file rác, tối ưu ổ đĩa, quản lý dung lượng, gỡ phần mềm, dọn cache, tối ưu hiệu năng Windows. Không thực thi lệnh trực tiếp — chỉ hướng dẫn đại ca.".into(),
    };

    let mut full_messages = vec![system_msg];
    full_messages.extend(messages);

    let res = client
        .post("http://localhost:11434/api/chat")
        .json(&json!({
            "model": model,
            "messages": full_messages,
            "stream": false
        }))
        .send()
        .await
        .map_err(|e| {
            if e.is_connect() {
                "Không thể kết nối Agent. Hãy chắc chắn Agent đang chạy (ollama serve).".to_string()
            } else if e.is_timeout() {
                "Yêu cầu Agent đã hết thời gian. Hãy thử câu hỏi ngắn hơn.".to_string()
            } else {
                format!("Lỗi gọi Agent: {}", e)
            }
        })?;

    let body: OllamaChatResponse = res
        .json()
        .await
        .map_err(|e| format!("Không thể phân tích phản hồi Agent: {}", e))?;

    match body.message {
        Some(msg) => Ok(msg.content),
        None => {
            if let Some(err) = body.error {
                Err(format!("Agent lỗi: {}. Hãy kiểm tra model đã được cài (Modules list).", err))
            } else {
                Err("Không nhận được phản hồi từ Agent. Hãy kiểm tra Agent đang chạy và model đã được cài.".into())
            }
        }
    }
}
