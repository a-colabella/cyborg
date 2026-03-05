/**
 * Stdio bridge for communication between the Node.js sidecar and Rust.
 * Uses newline-delimited JSON over stdin/stdout.
 */

let pendingToolRequests = new Map();
let requestIdCounter = 0;

/**
 * Write a JSON message to stdout (Rust reads this).
 */
export function emit(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

/**
 * Send a tool_request to Rust and wait for the tool_result.
 * Returns a promise that resolves when Rust sends back the result.
 */
export function requestTool(tool, params) {
  const id = String(++requestIdCounter);
  return new Promise((resolve, reject) => {
    pendingToolRequests.set(id, { resolve, reject });
    emit({ type: 'tool_request', id, tool, params });
  });
}

/**
 * Resolve a pending tool request when Rust sends a tool_result.
 */
export function resolveToolResult(id, result) {
  const pending = pendingToolRequests.get(id);
  if (pending) {
    pendingToolRequests.delete(id);
    pending.resolve(result);
  }
}

/**
 * Check if there's a pending tool request with the given id.
 */
export function hasPendingRequest(id) {
  return pendingToolRequests.has(id);
}
