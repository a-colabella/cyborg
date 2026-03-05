use crate::commands::database::RustDb;
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

/// Persistent Node.js sidecar process.
pub struct SidecarProcess {
    child: Mutex<Option<Child>>,
    stdin: Mutex<Option<std::process::ChildStdin>>,
    stdout: Mutex<Option<BufReader<std::process::ChildStdout>>>,
    sidecar_path: Mutex<String>,
}

impl SidecarProcess {
    pub fn new() -> Self {
        SidecarProcess {
            child: Mutex::new(None),
            stdin: Mutex::new(None),
            stdout: Mutex::new(None),
            sidecar_path: Mutex::new(String::new()),
        }
    }

    /// Ensures the sidecar process is running. Spawns it if needed.
    fn ensure_running(&self, sidecar_dir: &str) -> Result<(), String> {
        let mut child_guard = self.child.lock().map_err(|e| e.to_string())?;

        // Check if existing process is still alive
        let needs_spawn = match child_guard.as_mut() {
            Some(c) => match c.try_wait() {
                Ok(Some(_)) => true,  // exited
                Ok(None) => false,    // still running
                Err(_) => true,       // error checking — respawn
            },
            None => true,
        };

        if !needs_spawn {
            return Ok(());
        }

        // Spawn new process
        let entry = format!("{}/src/index.js", sidecar_dir);
        let mut process = Command::new("node")
            .arg(&entry)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .current_dir(sidecar_dir)
            .spawn()
            .map_err(|e| format!("Failed to spawn sidecar: {e}"))?;

        let stdin = process.stdin.take().ok_or("Failed to capture sidecar stdin")?;
        let stdout = process
            .stdout
            .take()
            .ok_or("Failed to capture sidecar stdout")?;

        *child_guard = Some(process);
        *self.stdin.lock().map_err(|e| e.to_string())? = Some(stdin);
        *self.stdout.lock().map_err(|e| e.to_string())? = Some(BufReader::new(stdout));
        *self.sidecar_path.lock().map_err(|e| e.to_string())? = sidecar_dir.to_string();

        Ok(())
    }

    /// Write a JSON line to the sidecar's stdin.
    fn write_line(&self, msg: &Value) -> Result<(), String> {
        let mut stdin_guard = self.stdin.lock().map_err(|e| e.to_string())?;
        let stdin = stdin_guard.as_mut().ok_or("Sidecar stdin not available")?;
        let line = serde_json::to_string(msg).map_err(|e| e.to_string())?;
        stdin
            .write_all(line.as_bytes())
            .map_err(|e| e.to_string())?;
        stdin.write_all(b"\n").map_err(|e| e.to_string())?;
        stdin.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Read a JSON line from the sidecar's stdout.
    fn read_line(&self) -> Result<Value, String> {
        let mut stdout_guard = self.stdout.lock().map_err(|e| e.to_string())?;
        let reader = stdout_guard
            .as_mut()
            .ok_or("Sidecar stdout not available")?;
        let mut line = String::new();
        reader.read_line(&mut line).map_err(|e| e.to_string())?;
        if line.is_empty() {
            return Err("Sidecar process closed stdout".to_string());
        }
        serde_json::from_str(line.trim()).map_err(|e| format!("Failed to parse sidecar output: {e}"))
    }
}

/// Handle a tool_request from the sidecar by executing on RustDb.
fn handle_tool_request(
    rust_db: &RustDb,
    tool: &str,
    params: &Value,
) -> Result<Value, String> {
    match tool {
        "list_schemas" => rust_db.list_schemas(),

        "query" => {
            let sql = params["sql"]
                .as_str()
                .ok_or("Missing 'sql' param")?;
            let bind_params: Vec<Value> = params["params"]
                .as_array()
                .cloned()
                .unwrap_or_default();
            rust_db.query(sql, &bind_params)
        }

        "mutate" => {
            let operation = params["operation"]
                .as_str()
                .ok_or("Missing 'operation' param")?;
            let table = params["table"]
                .as_str()
                .ok_or("Missing 'table' param")?;

            match operation {
                "insert" => {
                    let data = params["data"]
                        .as_object()
                        .ok_or("Missing 'data' for insert")?;
                    rust_db.insert(table, data)
                }
                "update" => {
                    let id = params["id"]
                        .as_i64()
                        .ok_or("Missing 'id' for update")?;
                    let data = params["data"]
                        .as_object()
                        .ok_or("Missing 'data' for update")?;
                    rust_db.update(table, id, data)
                }
                "delete" => {
                    let id = params["id"]
                        .as_i64()
                        .ok_or("Missing 'id' for delete")?;
                    rust_db.delete(table, id)
                }
                _ => Err(format!("Unknown mutation operation: {operation}")),
            }
        }

        "ensure_table" => {
            let table = params["table"]
                .as_str()
                .ok_or("Missing 'table' param")?;
            let columns = params["columns"]
                .as_object()
                .ok_or("Missing 'columns' param")?;
            rust_db.ensure_table(table, columns)
        }

        _ => Err(format!("Unknown tool: {tool}")),
    }
}

#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    messages: Vec<Value>,
    provider: String,
    api_key: String,
    current_code: Option<String>,
    current_schema: Option<Value>,
    app_name: Option<String>,
) -> Result<String, String> {
    let rust_db = app.state::<Arc<RustDb>>();
    let sidecar = app.state::<Arc<SidecarProcess>>();

    // Resolve sidecar directory
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;
    let sidecar_dir = resource_dir
        .parent()
        .unwrap_or(&resource_dir)
        .join("sidecar");

    // Fallback: check if sidecar is next to the project root (dev mode)
    let sidecar_dir = if sidecar_dir.join("src/index.js").exists() {
        sidecar_dir
    } else {
        // In dev mode, sidecar is at the project root level
        let dev_path = std::env::current_dir()
            .map_err(|e| e.to_string())?
            .join("sidecar");
        if dev_path.join("src/index.js").exists() {
            dev_path
        } else {
            // Try relative to the Cargo manifest dir
            let manifest = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
            let project_root = manifest.parent().unwrap_or(&manifest);
            project_root.join("sidecar")
        }
    };

    let sidecar_dir_str = sidecar_dir.to_string_lossy().to_string();

    // Ensure sidecar is running
    sidecar.ensure_running(&sidecar_dir_str)?;

    // Get current schemas
    let schemas = rust_db.list_schemas().unwrap_or(Value::Array(vec![]));

    // Build the request message
    let mut request = json!({
        "type": "request",
        "messages": messages,
        "provider": provider,
        "apiKey": api_key,
        "schemas": schemas,
    });

    if let Some(code) = &current_code {
        request["currentCode"] = Value::String(code.clone());
    }
    if let Some(schema) = &current_schema {
        request["currentSchema"] = schema.clone();
    }
    if let Some(name) = &app_name {
        request["appName"] = Value::String(name.clone());
    }

    // Send request to sidecar
    sidecar.write_line(&request)?;

    // Read responses in a loop until we get final_response
    loop {
        let msg = sidecar.read_line()?;
        let msg_type = msg["type"].as_str().unwrap_or("");

        match msg_type {
            "tool_request" => {
                let id = msg["id"].as_str().unwrap_or("0").to_string();
                let tool = msg["tool"].as_str().unwrap_or("");
                let params = &msg["params"];

                // canvas_render is a side-effect tool — emit event to frontend
                let result = if tool == "canvas_render" {
                    let _ = app.emit("canvas_render", params);
                    json!({ "success": true, "message": "Component rendered on canvas." })
                } else {
                    match handle_tool_request(&rust_db, tool, params) {
                        Ok(v) => v,
                        Err(e) => json!({ "error": e }),
                    }
                };

                sidecar.write_line(&json!({
                    "type": "tool_result",
                    "id": id,
                    "result": result,
                }))?;
            }

            "agent_status" => {
                let _ = app.emit("agent_status", &msg);
            }

            "stream_chunk" => {
                let _ = app.emit("chat_stream_chunk", &msg);
            }

            "final_response" => {
                let text = msg["text"].as_str().unwrap_or("").to_string();
                return Ok(text);
            }

            _ => {
                // Unknown message type — skip
            }
        }
    }
}
