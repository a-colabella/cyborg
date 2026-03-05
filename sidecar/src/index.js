/**
 * Cyborg Sidecar — Node.js process that runs the Vercel AI SDK agentic loop.
 * Communicates with Rust via newline-delimited JSON over stdio.
 */

import { createInterface } from 'node:readline';
import { streamText } from 'ai';
import { getModel } from './providers.js';
import { createTools } from './tools.js';
import { buildSystemPrompt } from './systemPrompt.js';
import { emit, resolveToolResult } from './bridge.js';

const rl = createInterface({ input: process.stdin });

rl.on('line', async (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return; // ignore malformed lines
  }

  if (msg.type === 'tool_result') {
    resolveToolResult(msg.id, msg.result);
    return;
  }

  if (msg.type === 'request') {
    await handleRequest(msg);
    return;
  }
});

async function handleRequest(msg) {
  const {
    messages,
    provider,
    apiKey,
    schemas,
    currentCode,
    currentSchema,
    appName,
  } = msg;

  try {
    const model = getModel(provider, apiKey);
    const tools = createTools();
    const system = buildSystemPrompt({
      schemas: schemas || [],
      currentCode,
      currentSchema,
      appName,
    });

    emit({ type: 'agent_status', status: 'Thinking...' });

    const result = streamText({
      model,
      system,
      messages,
      tools,
      maxSteps: 10,
    });

    let fullText = '';

    for await (const chunk of result.fullStream) {
      if (chunk.type === 'text-delta') {
        fullText += chunk.textDelta;
        emit({ type: 'stream_chunk', delta: chunk.textDelta });
      }
      // tool-call and tool-result are handled automatically by the SDK
      // via the execute functions in our tool definitions
    }

    emit({ type: 'agent_status', status: null });
    emit({ type: 'final_response', text: fullText });
  } catch (err) {
    emit({ type: 'agent_status', status: null });
    emit({
      type: 'final_response',
      text: `Error: ${err.message || String(err)}`,
    });
  }
}

// Keep the process alive
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
