mod commands;

use commands::database::RustDb;
use commands::sidecar::SidecarProcess;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            let db_path = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data dir")
                .join("cyborg.db");

            // Ensure the parent directory exists
            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent).ok();
            }

            let rust_db =
                Arc::new(RustDb::open(&db_path).expect("Failed to open rusqlite database"));
            app.manage(rust_db);
            app.manage(Arc::new(SidecarProcess::new()));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ai::chat,
            commands::apps::save_app,
            commands::apps::load_app,
            commands::apps::list_apps,
            commands::apps::delete_app,
            commands::apps::get_app_image,
            commands::apps::update_app_metadata,
            commands::apps::update_app_code,
            commands::settings::get_settings,
            commands::settings::set_settings,
            commands::database::init_db,
            commands::sidecar::send_message,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
