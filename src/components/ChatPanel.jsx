import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { load } from '@tauri-apps/plugin-store';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { ChatTextIcon } from '@phosphor-icons/react';
import { SYSTEM_PROMPT } from '../systemPrompt';

export default function ChatPanel({
  messages,
  setMessages,
  onComponentUpdate,
  onSchemaUpdate,
  isLoading,
  setIsLoading,
  appInfo,
  currentCode,
  currentSchema,
}) {
  const isEditingMode = appInfo != null;
  const displayName = appInfo?.metadata?.display_name || appInfo?.name || 'App';

  const handleSend = async (text) => {
    const userMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const store = await load('settings.json', { autoSave: false });
      const provider = (await store.get('activeProvider')) || 'claude';
      const apiKeys = (await store.get('apiKeys')) || {};
      const apiKey = apiKeys[provider];

      if (!apiKey) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'Please set your API key in Settings first. Use the **Settings** page in the sidebar to configure your AI provider.',
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Build the messages array for the AI
      let aiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // In editing mode, prepend a context block with the current app code/schema
      if (isEditingMode && currentCode) {
        const schemaBlock = currentSchema
          ? `\n\nCurrent schema:\n\`\`\`schema\n${JSON.stringify(currentSchema, null, 2)}\n\`\`\``
          : '';
        const contextMessage = {
          role: 'user',
          content: `[SYSTEM CONTEXT — CURRENT APP]\nThe user is editing "${displayName}". Current code and schema follow.\n\n\`\`\`jsx\n${currentCode}\n\`\`\`${schemaBlock}\n\nInstructions: Respond with the updated component. Always include a schema block if the current app has one. Do NOT use window.confirm(), window.alert(), or window.prompt(). Output the FULL component, not a diff.`,
        };
        aiMessages = [contextMessage, ...aiMessages];
      }

      const response = await invoke('chat', {
        request: {
          provider,
          api_key: apiKey,
          messages: aiMessages,
          system_prompt: SYSTEM_PROMPT,
        },
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.content },
      ]);

      if (response.component_code) {
        onComponentUpdate(response.component_code);
      }

      if (response.schema) {
        try {
          const parsed = JSON.parse(response.schema);
          onSchemaUpdate(parsed);
        } catch (e) {
          console.error('Failed to parse schema:', e);
          onSchemaUpdate(null);
        }
      } else if (response.component_code) {
        // New component without schema — clear any previous schema
        onSchemaUpdate(null);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <ChatTextIcon size={18} weight="regular" className="text-text-secondary" />
        <span className="text-sm font-semibold text-text-primary">Chat</span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-text-secondary text-sm">
            <ChatTextIcon size={48} weight="regular" />
            <span>
              Start a conversation to begin building.
            </span>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-ai-bubble border border-border rounded-sm rounded-bl-sm px-4 py-2.5 text-sm text-text-secondary">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
        placeholder={isEditingMode ? `Describe a change or bug fix for ${displayName}...` : undefined}
      />
    </div>
  );
}
