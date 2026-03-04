import { getDb } from './db';

const RESERVED_TABLES = ['conversations', 'messages', 'sqlite_master', 'sqlite_sequence'];

function validateTableName(name) {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(
      `Invalid table name: "${name}". Use lowercase letters, numbers, and underscores only.`
    );
  }
  if (RESERVED_TABLES.includes(name)) {
    throw new Error(`Table name "${name}" is reserved.`);
  }
}

/**
 * Ensures a SQLite table exists matching the given schema.
 * Creates the table if it doesn't exist, adds missing columns if it does.
 *
 * @param {{ table: string, columns: Record<string, string> }} schema
 * @returns {Promise<{ created?: boolean, migrated?: boolean }>}
 */
export async function ensureTable(schema) {
  validateTableName(schema.table);

  const db = getDb();
  if (!db) throw new Error('Database not initialized');

  const tableName = schema.table;
  const columns = schema.columns;

  // Build CREATE TABLE IF NOT EXISTS
  const colDefs = Object.entries(columns)
    .map(([name, type]) => `"${name}" ${type}`)
    .join(', ');

  await db.execute(`CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs})`);

  // Check for missing columns and add them via ALTER TABLE
  const existing = await db.select(`PRAGMA table_info("${tableName}")`);
  const existingNames = new Set(existing.map((c) => c.name));

  let migrated = false;
  for (const [name, type] of Object.entries(columns)) {
    if (!existingNames.has(name)) {
      // Strip PRIMARY KEY / AUTOINCREMENT from ALTER TABLE (SQLite doesn't allow it)
      const alterType = type
        .replace(/PRIMARY\s+KEY/i, '')
        .replace(/AUTOINCREMENT/i, '')
        .trim();
      await db.execute(
        `ALTER TABLE "${tableName}" ADD COLUMN "${name}" ${alterType}`
      );
      migrated = true;
    }
  }

  return migrated ? { migrated: true } : { created: true };
}

/**
 * Creates a `db` object to be injected into a component's execution scope.
 * Provides async CRUD methods bound to the given table name.
 *
 * @param {string} tableName
 * @returns {object} The db API object
 */
export function createDbObject(tableName) {
  validateTableName(tableName);

  return {
    TABLE: tableName,

    query: async (sql, params = []) => {
      const db = getDb();
      if (!db) throw new Error('Database not initialized');
      return await db.select(sql, params);
    },

    insert: async (data) => {
      const db = getDb();
      if (!db) throw new Error('Database not initialized');
      const keys = Object.keys(data);
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map((k) => data[k]);
      const result = await db.execute(
        `INSERT INTO "${tableName}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders})`,
        values
      );
      return { id: result.lastInsertId };
    },

    update: async (id, data) => {
      const db = getDb();
      if (!db) throw new Error('Database not initialized');
      const keys = Object.keys(data);
      const setClause = keys.map((k) => `"${k}" = ?`).join(', ');
      const values = [...keys.map((k) => data[k]), id];
      await db.execute(
        `UPDATE "${tableName}" SET ${setClause} WHERE "id" = ?`,
        values
      );
      return { success: true };
    },

    delete: async (id) => {
      const db = getDb();
      if (!db) throw new Error('Database not initialized');
      await db.execute(`DELETE FROM "${tableName}" WHERE "id" = ?`, [id]);
      return { success: true };
    },

    get: async (id) => {
      const db = getDb();
      if (!db) throw new Error('Database not initialized');
      const rows = await db.select(
        `SELECT * FROM "${tableName}" WHERE "id" = ? LIMIT 1`,
        [id]
      );
      return rows.length > 0 ? rows[0] : null;
    },
  };
}

/**
 * Drops a table created for an app. Used during app deletion cleanup.
 *
 * @param {string} tableName
 */
export async function dropAppTable(tableName) {
  validateTableName(tableName);
  const db = getDb();
  if (!db) return;
  await db.execute(`DROP TABLE IF EXISTS "${tableName}"`);
}
