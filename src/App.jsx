import { useState, useCallback, useRef, useEffect } from 'react';
import ChatPanel from './components/ChatPanel';
import CanvasPanel from './components/CanvasPanel';
import SettingsModal from './components/SettingsModal';

function App() {
  const [splitPosition, setSplitPosition] = useState(35);
  const [isDragging, setIsDragging] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentComponent, setCurrentComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
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
      className="flex h-screen w-screen bg-bg-primary select-none"
      style={{ cursor: isDragging ? 'col-resize' : 'default' }}
    >
      {/* Chat Panel */}
      <div style={{ width: `${splitPosition}%` }} className="h-full overflow-hidden">
        <ChatPanel
          messages={messages}
          setMessages={setMessages}
          onComponentUpdate={setCurrentComponent}
          onOpenSettings={() => setSettingsOpen(true)}
          isLoading={isLoading}
          setIsLoading={setIsLoading}
        />
      </div>

      {/* Draggable Divider */}
      <div
        className="w-1 bg-border hover:bg-accent cursor-col-resize transition-colors flex-shrink-0"
        onMouseDown={handleMouseDown}
      />

      {/* Canvas Panel */}
      <div style={{ width: `${100 - splitPosition}%` }} className="h-full overflow-hidden">
        <CanvasPanel componentCode={currentComponent} />
      </div>

      {/* Settings Modal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

export default App;
