use serde::{Deserialize, Serialize};
use crate::commands::ai::ask_ai;

#[derive(Serialize, Deserialize)]
pub struct AiAction {
    #[serde(rename = "type")]
    pub action_type: String,
    pub safe: bool,
    pub reason: String,
}

#[derive(Serialize)]
pub struct SmartCleanupResult {
    pub raw_response: String,
    pub actions: Vec<AiAction>,
}

#[tauri::command]
pub async fn smart_cleanup(data: String) -> Result<SmartCleanupResult, String> {
    let prompt = format!(
        r#"You are a system optimizer AI. Analyze this disk scan data and suggest cleanup actions.
Only suggest cleaning items that have significant size (> 10MB).

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{{
  "actions": [
    {{ "type": "action_type", "safe": true, "reason": "explanation" }}
  ]
}}

Available action types: npm_cache, pip_cache, docker_prune, temp_files, windows_temp, prefetch, cargo_cache, gradle_cache, vscode_cache, windows_update, crash_dumps, thumbnail_cache.
Only include actions relevant to the scan data. Set "safe" to false if the action might affect running apps.
Keep "reason" brief (1 sentence).

Disk scan data:
{}"#,
        data
    );

    let raw_response = ask_ai(prompt).await?;

    // Try to parse AI response into structured actions
    let actions = parse_ai_actions(&raw_response);

    Ok(SmartCleanupResult {
        raw_response: raw_response.clone(),
        actions,
    })
}

fn parse_ai_actions(response: &str) -> Vec<AiAction> {
    // Try to find JSON in the response
    let json_str = extract_json(response);

    if let Some(json_str) = json_str {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&json_str) {
            if let Some(actions) = parsed.get("actions").and_then(|a| a.as_array()) {
                return actions
                    .iter()
                    .filter_map(|a| serde_json::from_value::<AiAction>(a.clone()).ok())
                    .collect();
            }
        }
    }

    // Fallback: return empty if parsing fails
    Vec::new()
}

fn extract_json(text: &str) -> Option<String> {
    // Find the first '{' and last '}' to extract JSON
    let start = text.find('{')?;
    let end = text.rfind('}')?;
    if end > start {
        Some(text[start..=end].to_string())
    } else {
        None
    }
}
