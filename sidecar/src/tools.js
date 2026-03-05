/**
 * Agent tool definitions for the Vercel AI SDK.
 * Each tool calls back to Rust via the stdio bridge.
 */

import { tool } from 'ai';
import { z } from 'zod';
import { requestTool, emit } from './bridge.js';

export function createTools() {
  return {
    list_schemas: tool({
      description:
        'List all data tables the user has created, with their column definitions. Call this to understand what data exists before querying or mutating.',
      parameters: z.object({}),
      execute: async () => {
        emit({ type: 'agent_status', status: 'Checking data...' });
        return await requestTool('list_schemas', {});
      },
    }),

    query_data: tool({
      description:
        'Run a read-only SQL SELECT query against the user\'s data. Use this to look up, search, filter, or summarize data. Always use parameterized queries with $1, $2, etc. for user values.',
      parameters: z.object({
        sql: z.string().describe('The SELECT SQL query to execute'),
        params: z
          .array(z.union([z.string(), z.number(), z.null()]))
          .optional()
          .describe('Optional bind parameters for the query'),
      }),
      execute: async ({ sql, params }) => {
        emit({ type: 'agent_status', status: 'Checking data...' });
        return await requestTool('query', { sql, params: params || [] });
      },
    }),

    mutate_data: tool({
      description:
        'Insert, update, or delete a row in a data table. Use "insert" to add new rows, "update" to modify existing rows by id, "delete" to remove rows by id.',
      parameters: z.object({
        operation: z.enum(['insert', 'update', 'delete']),
        table: z.string().describe('The table name'),
        data: z
          .record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
          .optional()
          .describe('Row data for insert/update operations'),
        id: z
          .number()
          .optional()
          .describe('Row id for update/delete operations'),
      }),
      execute: async ({ operation, table, data, id }) => {
        emit({ type: 'agent_status', status: 'Updating data...' });
        return await requestTool('mutate', { operation, table, data, id });
      },
    }),

    create_schema: tool({
      description:
        'Create a new data table (or add missing columns to an existing one). Use this when the user wants to track something new. Every table must have an "id" column with "INTEGER PRIMARY KEY AUTOINCREMENT".',
      parameters: z.object({
        table: z
          .string()
          .describe(
            'Table name in lowercase snake_case (e.g. "todos", "habit_logs")'
          ),
        columns: z
          .record(z.string())
          .describe(
            'Column definitions as { name: type } where type is SQLite (e.g. "TEXT NOT NULL", "INTEGER DEFAULT 0")'
          ),
      }),
      execute: async ({ table, columns }) => {
        emit({ type: 'agent_status', status: 'Setting up data...' });
        return await requestTool('ensure_table', { table, columns });
      },
    }),

    render_component: tool({
      description:
        'Render a React component on the canvas. Use this when the user wants to see, visualize, or interact with something. The component must be a self-contained function named "App". ShadCN UI components are available via the UI object (e.g. UI.Button, UI.Card, UI.Input). Use inline styles for custom layout. Optionally include a schema if the component needs persistent data.',
      parameters: z.object({
        title: z.string().describe('Display title for the component'),
        code: z
          .string()
          .describe(
            'Complete JSX source code for the App component (no imports)'
          ),
        schema: z
          .object({
            table: z.string(),
            columns: z.record(z.string()),
          })
          .optional()
          .describe('Optional data schema if the component uses persistent data'),
      }),
      execute: async ({ title, code, schema }) => {
        emit({ type: 'agent_status', status: 'Building component...' });
        return await requestTool('canvas_render', { title, code, schema: schema || null });
      },
    }),
  };
}
