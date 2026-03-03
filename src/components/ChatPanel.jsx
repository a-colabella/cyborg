import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { load } from '@tauri-apps/plugin-store';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import SavedAppsMenu from './SavedAppsMenu';
import { Gear, GearIcon } from '@phosphor-icons/react';
import { SYSTEM_PROMPT } from '../systemPrompt';
import logo from '../assets/app-icon.svg';

export default function ChatPanel({
  messages,
  setMessages,
  onComponentUpdate,
  onOpenSettings,
  isLoading,
  setIsLoading,
}) {
  const [savedAppsOpen, setSavedAppsOpen] = useState(false);

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
              'Please set your API key in Settings first. Click the **Settings** button above to configure your AI provider.',
          },
        ]);
        setIsLoading(false);
        return;
      }

      const response = await invoke('chat', {
        request: {
          provider,
          api_key: apiKey,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
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
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h1 className="text-sm font-semibold text-text-primary tracking-wide">
          <img src={logo} alt="Cyborg" width={32} height={32} className="brightness-0 invert" />
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setSavedAppsOpen(!savedAppsOpen)}
            className="text-xs px-3 py-1.5 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            Saved Apps
          </button>
          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-1.5 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          >
            <GearIcon size={18} weight="regular" />
          </button>
        </div>
      </div>

      {/* Saved Apps Dropdown */}
      {savedAppsOpen && (
        <SavedAppsMenu
          onSelect={(code) => {
            onComponentUpdate(code);
            setSavedAppsOpen(false);
          }}
          onClose={() => setSavedAppsOpen(false)}
        />
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-secondary text-sm">
            Start a conversation to begin building.
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-ai-bubble border border-border rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-text-secondary">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
