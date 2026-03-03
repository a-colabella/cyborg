import { useState, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ComponentRenderer from './ComponentRenderer';
import { CoffeeIcon, FloppyDiskIcon, PaintBrushIcon } from '@phosphor-icons/react';

function SaveDialog({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-bg-secondary border border-border rounded-sm w-[360px] p-6"
      >
        <h3 className="text-sm font-semibold text-text-primary mb-4">
          Save App
        </h3>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter a name for this app..."
          className="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors mb-4"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-4 py-2 rounded-sm bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CanvasPanel({ componentCode }) {
  const [saving, setSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleSave = async (name) => {
    setShowSaveDialog(false);
    setSaving(true);
    try {
      await invoke('save_app', { name, code: componentCode });
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Canvas Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <PaintBrushIcon size={18} weight="regular" />
          <span className="text-sm font-semibold text-text-primary">Canvas</span>
        </div>
        <button
          onClick={() => setShowSaveDialog(true)}
          disabled={componentCode == null || saving}
          hidden={componentCode == null}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FloppyDiskIcon size={18} weight="regular" />
          <span>{saving ? 'Saving...' : 'Save as App'}</span>
        </button>
      </div>

      {/* Render Area */}
      <div className="flex-1 overflow-auto p-4">
        {componentCode ? (
          <ComponentRenderer code={componentCode} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-text-secondary text-sm">
            <CoffeeIcon size={48} weight="regular" />
            <span>
              Ask your AI agent to build something and it will appear here.
            </span>
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <SaveDialog
          onSave={handleSave}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}
    </div>
  );
}
