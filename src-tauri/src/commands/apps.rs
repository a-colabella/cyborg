use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub filename: String,
}

fn get_apps_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let apps_dir = app_data.join("saved_apps");
    if !apps_dir.exists() {
        fs::create_dir_all(&apps_dir).map_err(|e| e.to_string())?;
    }
    Ok(apps_dir)
}

#[tauri::command]
pub async fn save_app(app: AppHandle, name: String, code: String) -> Result<String, String> {
    let apps_dir = get_apps_dir(&app)?;
    let filename = format!("{}.jsx", sanitize_filename(&name));
    let path = apps_dir.join(&filename);
    fs::write(&path, &code).map_err(|e| e.to_string())?;
    Ok(filename)
}

#[tauri::command]
pub async fn load_app(app: AppHandle, filename: String) -> Result<String, String> {
    let apps_dir = get_apps_dir(&app)?;
    let path = apps_dir.join(&filename);
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_apps(app: AppHandle) -> Result<Vec<AppInfo>, String> {
    let apps_dir = get_apps_dir(&app)?;
    let mut apps = Vec::new();

    if apps_dir.exists() {
        for entry in fs::read_dir(&apps_dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();
            if path.extension().map(|e| e == "jsx").unwrap_or(false) {
                let filename = path.file_name().unwrap().to_string_lossy().to_string();
                let name = path.file_stem().unwrap().to_string_lossy().to_string();
                apps.push(AppInfo { name, filename });
            }
        }
    }

    Ok(apps)
}

#[tauri::command]
pub async fn delete_app(app: AppHandle, filename: String) -> Result<(), String> {
    let apps_dir = get_apps_dir(&app)?;
    let path = apps_dir.join(&filename);
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect()
}
