/// Database initialization command.
/// The actual SQLite initialization happens via @tauri-apps/plugin-sql
/// JavaScript bindings. This is a placeholder for any Rust-side
/// database initialization logic (migrations, etc.)
#[tauri::command]
pub async fn init_db() -> Result<String, String> {
    Ok("Database initialized".to_string())
}
