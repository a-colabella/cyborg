use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatRequest {
    pub provider: String,
    pub api_key: String,
    pub messages: Vec<ChatMessage>,
    pub system_prompt: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub component_code: Option<String>,
}

#[tauri::command]
pub async fn chat(request: ChatRequest) -> Result<ChatResponse, String> {
    let client = Client::new();

    match request.provider.as_str() {
        "claude" => call_claude(&client, &request).await,
        "openai" => call_openai(&client, &request).await,
        "gemini" => call_gemini(&client, &request).await,
        _ => Err(format!("Unknown provider: {}", request.provider)),
    }
}

async fn call_claude(client: &Client, request: &ChatRequest) -> Result<ChatResponse, String> {
    let body = serde_json::json!({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 4096,
        "system": request.system_prompt,
        "messages": request.messages.iter().map(|m| {
            serde_json::json!({
                "role": m.role,
                "content": m.content,
            })
        }).collect::<Vec<_>>(),
    });

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &request.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        let error_msg = data["error"]["message"]
            .as_str()
            .unwrap_or("Unknown API error");
        return Err(format!("Claude API error: {}", error_msg));
    }

    let content = data["content"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let component_code = extract_jsx_code(&content);

    Ok(ChatResponse {
        content,
        component_code,
    })
}

async fn call_openai(client: &Client, request: &ChatRequest) -> Result<ChatResponse, String> {
    let mut messages = vec![serde_json::json!({
        "role": "system",
        "content": request.system_prompt,
    })];
    messages.extend(request.messages.iter().map(|m| {
        serde_json::json!({
            "role": m.role,
            "content": m.content,
        })
    }));

    let body = serde_json::json!({
        "model": "gpt-4o",
        "messages": messages,
        "max_tokens": 4096,
    });

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", request.api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        let error_msg = data["error"]["message"]
            .as_str()
            .unwrap_or("Unknown API error");
        return Err(format!("OpenAI API error: {}", error_msg));
    }

    let content = data["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let component_code = extract_jsx_code(&content);

    Ok(ChatResponse {
        content,
        component_code,
    })
}

async fn call_gemini(client: &Client, request: &ChatRequest) -> Result<ChatResponse, String> {
    let body = serde_json::json!({
        "contents": request.messages.iter().map(|m| {
            serde_json::json!({
                "role": if m.role == "assistant" { "model" } else { &m.role },
                "parts": [{ "text": m.content }],
            })
        }).collect::<Vec<_>>(),
        "systemInstruction": {
            "parts": [{ "text": request.system_prompt }]
        },
    });

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={}",
        request.api_key
    );

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let data: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        let error_msg = data["error"]["message"]
            .as_str()
            .unwrap_or("Unknown API error");
        return Err(format!("Gemini API error: {}", error_msg));
    }

    let content = data["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .unwrap_or("")
        .to_string();

    let component_code = extract_jsx_code(&content);

    Ok(ChatResponse {
        content,
        component_code,
    })
}

/// Extracts JSX code from markdown code fences in AI responses.
fn extract_jsx_code(text: &str) -> Option<String> {
    let patterns = ["```jsx", "```react", "```javascript"];
    for pattern in patterns {
        if let Some(start) = text.find(pattern) {
            let code_start = start + pattern.len();
            if let Some(end) = text[code_start..].find("```") {
                let code = text[code_start..code_start + end].trim().to_string();
                if !code.is_empty() {
                    return Some(code);
                }
            }
        }
    }
    None
}
