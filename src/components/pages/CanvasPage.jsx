import { useState, useCallback, useRef, useEffect } from 'react';
import ChatPanel from '../ChatPanel';
import CanvasPanel from '../CanvasPanel';

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
  const containerRef = useRef(null);

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
          onComponentUpdate={setCurrentComponent}
          onSchemaUpdate={setCurrentSchema}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </div>
    </div>
  );
}
