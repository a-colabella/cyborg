import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { load } from '@tauri-apps/plugin-store';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { ChatTextIcon, CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react';

export default function ChatPanel({
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  appInfo,
  currentCode,
  currentSchema,
  hasPendingUpdate,
  onAccept,
  onDiscard,
  onClear,
  agentStatus,
  setAgentStatus,
  streamingText,
  setStreamingText,
}) {
  const [accepting, setAccepting] = useState(false);
  const isEditingMode = appInfo != null;
  const displayName = appInfo?.metadata?.display_name || appInfo?.name || 'App';
  const messagesEndRef = useRef(null);

  // Auto-scroll when streaming text updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [streamingText, messages]);

  const handleSend = async (text) => {
    const userMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingText(null);
    setAgentStatus(null);

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
      const aiMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Call the sidecar-based send_message command
      // Always pass currentCode/currentSchema so the agent can modify
      // whatever is on the canvas, even if it's not a saved app.
      const responseText = await invoke('send_message', {
        messages: aiMessages,
        provider,
        apiKey,
        currentCode: currentCode || null,
        currentSchema: currentSchema || null,
        appName: isEditingMode ? displayName : null,
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: responseText },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err}` },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingText(null);
      setAgentStatus(null);
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
          <div className="flex flex-col gap-2">
            {agentStatus && (
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-xs text-text-secondary">{agentStatus}</span>
              </div>
            )}
            {streamingText ? (
              <ChatMessage role="assistant" content={streamingText} />
            ) : !agentStatus && (
              <div className="flex justify-start">
                <div className="bg-ai-bubble border border-border rounded-sm rounded-bl-sm px-4 py-2.5 text-sm text-text-secondary">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context Indicator Bar — visible when editing a saved app */}
      {isEditingMode && (
        <div className="flex items-center justify-start px-4 py-2 bg-accent border-t border-accent/30">
          <span className="text-xs text-primary font-medium">
            Editing: {displayName}
          </span>
        </div>
      )}

      {/* Accept/Discard Bar — visible when there's a pending update */}
      {hasPendingUpdate && (
        <div className="flex items-center justify-between px-4 py-2 bg-emerald-900/20 border-t border-emerald-700/30">
          <span className="text-xs text-emerald-300 font-medium">
            New version ready.
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onDiscard}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
            >
              <XCircleIcon size={14} weight="regular" />
              <span>Discard</span>
            </button>
            <button
              onClick={async () => {
                setAccepting(true);
                try { await onAccept(); } finally { setAccepting(false); }
              }}
              disabled={accepting}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircleIcon size={14} weight="fill" />
              <span>{accepting ? 'Saving...' : 'Accept & Save'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
        placeholder={isEditingMode ? `Describe a change or bug fix for ${displayName}...` : undefined}
      />
    </div>
  );
}
