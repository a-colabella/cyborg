import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import ChatPanel from '../ChatPanel';
import CanvasPanel from '../CanvasPanel';
import { ensureTable } from '../../appDb';

export default function CanvasPage({
  messages,
  setMessages,
  currentComponent,
  setCurrentComponent,
  currentSchema,
  setCurrentSchema,
  currentAppInfo,
  setCurrentAppInfo,
  isLoading,
  setIsLoading,
}) {
  const [splitPosition, setSplitPosition] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const [savedVersion, setSavedVersion] = useState(null);
  const [agentStatus, setAgentStatus] = useState(null);
  const [streamingText, setStreamingText] = useState(null);
  const containerRef = useRef(null);

  const isEditingMode = currentAppInfo != null;
  const hasPendingUpdate = isEditingMode && savedVersion != null
    && (currentComponent !== savedVersion.code
        || JSON.stringify(currentSchema) !== JSON.stringify(savedVersion.schema));

  // Snapshot savedVersion when a saved app loads
  useEffect(() => {
    if (currentAppInfo != null) {
      setSavedVersion({ code: currentComponent, schema: currentSchema });
    } else {
      setSavedVersion(null);
    }
  }, [currentAppInfo]);

  // Listen for sidecar events
  useEffect(() => {
    const unlisten = [
      listen('canvas_render', async (e) => {
        const { code, schema, title } = e.payload;
        // Set component code immediately so the canvas updates without waiting on DB
        if (code) {
          setCurrentComponent(code);
        }
        if (schema) {
          try {
            const parsed = typeof schema === 'string' ? JSON.parse(schema) : schema;
            await ensureTable(parsed);
            setCurrentSchema(parsed);
          } catch (err) {
            console.error('Failed to ensure table from canvas_render:', err);
          }
        } else {
          setCurrentSchema(null);
        }
      }),
      listen('agent_status', (e) => {
        setAgentStatus(e.payload.status || null);
      }),
      listen('chat_stream_chunk', (e) => {
        setStreamingText((prev) => (prev || '') + (e.payload.delta || ''));
      }),
    ];
    return () => unlisten.forEach((p) => p.then((fn) => fn()));
  }, []);

  const handleAccept = async () => {
    try {
      await invoke('update_app_code', {
        filename: currentAppInfo.filename,
        code: currentComponent,
        schema: currentSchema ? JSON.stringify(currentSchema) : null,
      });
      setSavedVersion({ code: currentComponent, schema: currentSchema });
    } catch (err) {
      console.error('Failed to save app update:', err);
    }
  };

  const handleDiscard = () => {
    if (savedVersion) {
      setCurrentComponent(savedVersion.code);
      setCurrentSchema(savedVersion.schema);
    }
  };

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      setSplitPosition(Math.min(80, Math.max(20, percentage)));
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full select-none"
      style={{ cursor: isDragging ? 'col-resize' : 'default' }}
    >
      {/* Canvas Panel — LEFT */}
      <div style={{ width: `${splitPosition}%` }} className="h-full overflow-hidden">
        <CanvasPanel
          componentCode={currentComponent}
          schema={currentSchema}
          appInfo={currentAppInfo}
          onAppInfoUpdate={setCurrentAppInfo}
          onClear={() => {
            setCurrentComponent(null);
            setCurrentSchema(null);
            setCurrentAppInfo(null);
            setSavedVersion(null);
          }}
        />
      </div>

      {/* Draggable Divider */}
      <div
        className="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={handleMouseDown}
      />

      {/* Chat Panel — RIGHT */}
      <div style={{ width: `${100 - splitPosition}%` }} className="h-full overflow-hidden">
        <ChatPanel
          messages={messages}
          setMessages={setMessages}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          appInfo={currentAppInfo}
          currentCode={currentComponent}
          currentSchema={currentSchema}
          hasPendingUpdate={hasPendingUpdate}
          onAccept={handleAccept}
          onDiscard={handleDiscard}
          onClear={() => {
            setCurrentComponent(null);
            setCurrentSchema(null);
            setCurrentAppInfo(null);
            setSavedVersion(null);
          }}
          agentStatus={agentStatus}
          setAgentStatus={setAgentStatus}
          streamingText={streamingText}
          setStreamingText={setStreamingText}
        />
      </div>
    </div>
  );
}
