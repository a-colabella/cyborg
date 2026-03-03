use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct Settings {
    pub active_provider: String,
    pub api_keys: Value,
    pub supabase_url: Option<String>,
    pub supabase_key: Option<String>,
}

#[tauri::command]
pub async fn get_settings(app: AppHandle) -> Result<Settings, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;

    let active_provider = store
        .get("activeProvider")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_else(|| "claude".to_string());

    let api_keys = store
        .get("apiKeys")
        .unwrap_or(serde_json::json!({ "claude": "", "openai": "", "gemini": "" }));

    let supabase_url = store
        .get("supabaseUrl")
        .and_then(|v| v.as_str().map(String::from));

    let supabase_key = store
        .get("supabaseKey")
        .and_then(|v| v.as_str().map(String::from));

    Ok(Settings {
        active_provider,
        api_keys,
        supabase_url,
        supabase_key,
    })
}

#[tauri::command]
pub async fn set_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;

    store.set("activeProvider", serde_json::json!(settings.active_provider));
    store.set("apiKeys", settings.api_keys);

    if let Some(url) = settings.supabase_url {
        store.set("supabaseUrl", serde_json::json!(url));
    }
    if let Some(key) = settings.supabase_key {
        store.set("supabaseKey", serde_json::json!(key));
    }

    store.save().map_err(|e| e.to_string())?;

    Ok(())
}
