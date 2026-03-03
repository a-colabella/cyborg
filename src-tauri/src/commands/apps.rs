use base64::{engine::general_purpose::STANDARD, Engine};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppMetadata {
    pub display_name: String,
    pub description: Option<String>,
    pub icon: Option<String>,
    pub image_path: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub filename: String,
    pub metadata: Option<AppMetadata>,
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
pub async fn save_app(
    app: AppHandle,
    name: String,
    code: String,
    description: Option<String>,
    icon: Option<String>,
    image_data: Option<String>,
) -> Result<String, String> {
    let apps_dir = get_apps_dir(&app)?;
    let sanitized = sanitize_filename(&name);
    let filename = format!("{}.jsx", sanitized);
    let path = apps_dir.join(&filename);

    // Write the JSX code file
    fs::write(&path, &code).map_err(|e| e.to_string())?;

    // Handle image if provided
    let image_path = if let Some(data) = image_data {
        let images_dir = apps_dir.join("images");
        if !images_dir.exists() {
            fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
        }
        let image_filename = format!("{}.png", sanitized);
        let image_full_path = images_dir.join(&image_filename);
        let bytes = STANDARD.decode(&data).map_err(|e| e.to_string())?;
        fs::write(&image_full_path, &bytes).map_err(|e| e.to_string())?;
        Some(format!("images/{}", image_filename))
    } else {
        None
    };

    // Write metadata sidecar JSON
    let now = Utc::now().to_rfc3339();
    let metadata = AppMetadata {
        display_name: name,
        description,
        icon,
        image_path,
        created_at: now.clone(),
        updated_at: now,
    };
    let meta_path = apps_dir.join(format!("{}.json", sanitized));
    let meta_json = serde_json::to_string_pretty(&metadata).map_err(|e| e.to_string())?;
    fs::write(&meta_path, meta_json).map_err(|e| e.to_string())?;

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
                let stem = path.file_stem().unwrap().to_string_lossy().to_string();

                // Try to read sidecar metadata
                let meta_path = apps_dir.join(format!("{}.json", stem));
                let metadata = if meta_path.exists() {
                    fs::read_to_string(&meta_path)
                        .ok()
                        .and_then(|s| serde_json::from_str::<AppMetadata>(&s).ok())
                } else {
                    None
                };

                apps.push(AppInfo {
                    name: stem,
                    filename,
                    metadata,
                });
            }
        }
    }

    Ok(apps)
}

#[tauri::command]
pub async fn delete_app(app: AppHandle, filename: String) -> Result<(), String> {
    let apps_dir = get_apps_dir(&app)?;
    let path = apps_dir.join(&filename);
    let stem = path.file_stem().unwrap().to_string_lossy().to_string();

    // Read metadata to find associated image before deleting
    let meta_path = apps_dir.join(format!("{}.json", stem));
    if meta_path.exists() {
        if let Ok(meta_str) = fs::read_to_string(&meta_path) {
            if let Ok(metadata) = serde_json::from_str::<AppMetadata>(&meta_str) {
                if let Some(img_path) = metadata.image_path {
                    let full_img_path = apps_dir.join(&img_path);
                    if full_img_path.exists() {
                        let _ = fs::remove_file(&full_img_path);
                    }
                }
            }
        }
        let _ = fs::remove_file(&meta_path);
    }

    // Delete the JSX file
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn update_app_metadata(
    app: AppHandle,
    filename: String,
    display_name: String,
    description: Option<String>,
    icon: Option<String>,
    image_data: Option<String>,
) -> Result<(), String> {
    let apps_dir = get_apps_dir(&app)?;
    let stem = filename.trim_end_matches(".jsx");
    let meta_path = apps_dir.join(format!("{}.json", stem));

    // Load existing metadata or create a new one
    let mut metadata = if meta_path.exists() {
        fs::read_to_string(&meta_path)
            .ok()
            .and_then(|s| serde_json::from_str::<AppMetadata>(&s).ok())
            .unwrap_or_else(|| {
                let now = Utc::now().to_rfc3339();
                AppMetadata {
                    display_name: stem.to_string(),
                    description: None,
                    icon: None,
                    image_path: None,
                    created_at: now.clone(),
                    updated_at: now,
                }
            })
    } else {
        let now = Utc::now().to_rfc3339();
        AppMetadata {
            display_name: stem.to_string(),
            description: None,
            icon: None,
            image_path: None,
            created_at: now.clone(),
            updated_at: now,
        }
    };

    metadata.display_name = display_name;
    metadata.description = description;
    metadata.updated_at = Utc::now().to_rfc3339();

    // Handle image update
    if let Some(data) = image_data {
        let images_dir = apps_dir.join("images");
        if !images_dir.exists() {
            fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
        }
        let image_filename = format!("{}.png", stem);
        let image_full_path = images_dir.join(&image_filename);
        let bytes = STANDARD.decode(&data).map_err(|e| e.to_string())?;
        fs::write(&image_full_path, &bytes).map_err(|e| e.to_string())?;
        metadata.image_path = Some(format!("images/{}", image_filename));
        metadata.icon = None;
    } else if icon.is_some() {
        metadata.icon = icon;
        // If switching from image to icon, clean up old image
        if let Some(ref img_path) = metadata.image_path {
            let full_img_path = apps_dir.join(img_path);
            if full_img_path.exists() {
                let _ = fs::remove_file(&full_img_path);
            }
        }
        metadata.image_path = None;
    }

    let meta_json = serde_json::to_string_pretty(&metadata).map_err(|e| e.to_string())?;
    fs::write(&meta_path, meta_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_app_image(app: AppHandle, image_path: String) -> Result<String, String> {
    let apps_dir = get_apps_dir(&app)?;
    let full_path = apps_dir.join(&image_path);
    let bytes = fs::read(&full_path).map_err(|e| e.to_string())?;
    Ok(STANDARD.encode(&bytes))
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
