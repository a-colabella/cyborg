mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
