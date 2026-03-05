use rusqlite::{params_from_iter, Connection};
use serde_json::{json, Map, Value};
use std::path::Path;
use std::sync::Mutex;

const RESERVED_TABLES: &[&str] = &[
    "conversations",
    "messages",
    "sqlite_master",
    "sqlite_sequence",
];

pub struct RustDb {
    conn: Mutex<Connection>,
}

impl RustDb {
    /// Opens (or creates) a SQLite database at the given path and enables WAL mode.
    pub fn open(path: &Path) -> Result<Self, String> {
        let conn = Connection::open(path).map_err(|e| format!("Failed to open DB: {e}"))?;
        conn.execute_batch("PRAGMA journal_mode=WAL;")
            .map_err(|e| format!("Failed to set WAL mode: {e}"))?;
        Ok(RustDb {
            conn: Mutex::new(conn),
        })
    }

    /// Lists all user-created tables with their column definitions.
    /// Returns a JSON array of `{ table, columns: { name: type, ... } }`.
    pub fn list_schemas(&self) -> Result<Value, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
            .map_err(|e| e.to_string())?;

        let table_names: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .filter(|name: &String| !RESERVED_TABLES.contains(&name.as_str()))
            .collect();

        let mut schemas = Vec::new();

        for table in &table_names {
            let mut pragma = conn
                .prepare(&format!("PRAGMA table_info(\"{}\")", table))
                .map_err(|e| e.to_string())?;

            let columns: Map<String, Value> = pragma
                .query_map([], |row| {
                    let col_name: String = row.get(1)?;
                    let col_type: String = row.get(2)?;
                    let notnull: bool = row.get(3)?;
                    let default_val: Option<String> = row.get(4)?;
                    let pk: bool = row.get(5)?;

                    let mut type_str = col_type.clone();
                    if pk {
                        type_str.push_str(" PRIMARY KEY");
                    }
                    if notnull && !pk {
                        type_str.push_str(" NOT NULL");
                    }
                    if let Some(def) = default_val {
                        type_str.push_str(&format!(" DEFAULT {}", def));
                    }

                    Ok((col_name, type_str))
                })
                .map_err(|e| e.to_string())?
                .filter_map(|r| r.ok())
                .map(|(name, typ)| (name, Value::String(typ)))
                .collect();

            schemas.push(json!({
                "table": table,
                "columns": columns,
            }));
        }

        Ok(Value::Array(schemas))
    }

    /// Executes a read-only SELECT query and returns results as a JSON array.
    pub fn query(&self, sql: &str, params: &[Value]) -> Result<Value, String> {
        let trimmed = sql.trim().to_uppercase();
        if !trimmed.starts_with("SELECT") && !trimmed.starts_with("PRAGMA") {
            return Err("Only SELECT queries are allowed".to_string());
        }

        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

        let col_count = stmt.column_count();
        let col_names: Vec<String> = (0..col_count)
            .map(|i| stmt.column_name(i).unwrap_or("?").to_string())
            .collect();

        let sqlite_params: Vec<Box<dyn rusqlite::types::ToSql>> =
            params.iter().map(|v| json_value_to_sql(v)).collect();
        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            sqlite_params.iter().map(|b| b.as_ref()).collect();

        let rows = stmt
            .query_map(params_from_iter(param_refs.iter()), |row| {
                let mut map = Map::new();
                for (i, name) in col_names.iter().enumerate() {
                    let val = sqlite_value_to_json(row, i);
                    map.insert(name.clone(), val);
                }
                Ok(Value::Object(map))
            })
            .map_err(|e| e.to_string())?;

        let results: Vec<Value> = rows.filter_map(|r| r.ok()).collect();
        Ok(Value::Array(results))
    }

    /// Inserts a row into a table. Returns `{ id: <last_insert_rowid> }`.
    pub fn insert(&self, table: &str, data: &Map<String, Value>) -> Result<Value, String> {
        validate_table_name(table)?;
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let keys: Vec<&String> = data.keys().collect();
        let placeholders: Vec<&str> = keys.iter().map(|_| "?").collect();

        let sql = format!(
            "INSERT INTO \"{}\" ({}) VALUES ({})",
            table,
            keys.iter()
                .map(|k| format!("\"{}\"", k))
                .collect::<Vec<_>>()
                .join(", "),
            placeholders.join(", ")
        );

        let values: Vec<Box<dyn rusqlite::types::ToSql>> = keys
            .iter()
            .map(|k| json_value_to_sql(&data[k.as_str()]))
            .collect();
        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            values.iter().map(|b| b.as_ref()).collect();

        conn.execute(&sql, params_from_iter(param_refs.iter()))
            .map_err(|e| e.to_string())?;

        let id = conn.last_insert_rowid();
        Ok(json!({ "id": id }))
    }

    /// Updates a row by id. Returns `{ success: true }`.
    pub fn update(
        &self,
        table: &str,
        id: i64,
        data: &Map<String, Value>,
    ) -> Result<Value, String> {
        validate_table_name(table)?;
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let keys: Vec<&String> = data.keys().collect();
        let set_clause = keys
            .iter()
            .map(|k| format!("\"{}\" = ?", k))
            .collect::<Vec<_>>()
            .join(", ");

        let sql = format!("UPDATE \"{}\" SET {} WHERE \"id\" = ?", table, set_clause);

        let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = keys
            .iter()
            .map(|k| json_value_to_sql(&data[k.as_str()]))
            .collect();
        values.push(Box::new(id));

        let param_refs: Vec<&dyn rusqlite::types::ToSql> =
            values.iter().map(|b| b.as_ref()).collect();

        conn.execute(&sql, params_from_iter(param_refs.iter()))
            .map_err(|e| e.to_string())?;

        Ok(json!({ "success": true }))
    }

    /// Deletes a row by id. Returns `{ success: true }`.
    pub fn delete(&self, table: &str, id: i64) -> Result<Value, String> {
        validate_table_name(table)?;
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        conn.execute(
            &format!("DELETE FROM \"{}\" WHERE \"id\" = ?", table),
            [id],
        )
        .map_err(|e| e.to_string())?;

        Ok(json!({ "success": true }))
    }

    /// Creates a table if it doesn't exist, and adds any missing columns.
    /// Mirrors the logic from appDb.js `ensureTable()`.
    pub fn ensure_table(
        &self,
        table: &str,
        columns: &Map<String, Value>,
    ) -> Result<Value, String> {
        validate_table_name(table)?;
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let col_defs: Vec<String> = columns
            .iter()
            .map(|(name, typ)| format!("\"{}\" {}", name, typ.as_str().unwrap_or("TEXT")))
            .collect();

        conn.execute_batch(&format!(
            "CREATE TABLE IF NOT EXISTS \"{}\" ({})",
            table,
            col_defs.join(", ")
        ))
        .map_err(|e| e.to_string())?;

        // Check for missing columns and add them via ALTER TABLE
        let mut pragma = conn
            .prepare(&format!("PRAGMA table_info(\"{}\")", table))
            .map_err(|e| e.to_string())?;

        let existing: Vec<String> = pragma
            .query_map([], |row| row.get(1))
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let mut migrated = false;
        for (name, typ) in columns {
            if !existing.contains(name) {
                let type_str = typ.as_str().unwrap_or("TEXT").to_string();
                let alter_type = type_str
                    .replace("PRIMARY KEY", "")
                    .replace("AUTOINCREMENT", "")
                    .trim()
                    .to_string();

                conn.execute_batch(&format!(
                    "ALTER TABLE \"{}\" ADD COLUMN \"{}\" {}",
                    table, name, alter_type
                ))
                .map_err(|e| e.to_string())?;
                migrated = true;
            }
        }

        if migrated {
            Ok(json!({ "migrated": true }))
        } else {
            Ok(json!({ "created": true }))
        }
    }
}

fn validate_table_name(name: &str) -> Result<(), String> {
    let valid = name
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_');
    let starts_ok = name
        .chars()
        .next()
        .map_or(false, |c| c.is_ascii_lowercase() || c == '_');

    if !valid || !starts_ok || name.is_empty() {
        return Err(format!(
            "Invalid table name: \"{}\". Use lowercase letters, numbers, and underscores only.",
            name
        ));
    }
    if RESERVED_TABLES.contains(&name) {
        return Err(format!("Table name \"{}\" is reserved.", name));
    }
    Ok(())
}

fn json_value_to_sql(v: &Value) -> Box<dyn rusqlite::types::ToSql> {
    match v {
        Value::Null => Box::new(rusqlite::types::Null),
        Value::Bool(b) => Box::new(if *b { 1i64 } else { 0i64 }),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Box::new(i)
            } else if let Some(f) = n.as_f64() {
                Box::new(f)
            } else {
                Box::new(n.to_string())
            }
        }
        Value::String(s) => Box::new(s.clone()),
        _ => Box::new(v.to_string()),
    }
}

fn sqlite_value_to_json(row: &rusqlite::Row, idx: usize) -> Value {
    if let Ok(v) = row.get::<_, i64>(idx) {
        return Value::Number(v.into());
    }
    if let Ok(v) = row.get::<_, f64>(idx) {
        return serde_json::Number::from_f64(v)
            .map(Value::Number)
            .unwrap_or(Value::Null);
    }
    if let Ok(v) = row.get::<_, String>(idx) {
        return Value::String(v);
    }
    Value::Null
}

/// Placeholder Tauri command — kept for backward compat during transition.
#[tauri::command]
pub async fn init_db() -> Result<String, String> {
    Ok("Database initialized".to_string())
}
