import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ComponentRenderer from './ComponentRenderer';
import SaveDialog from './SaveDialog';
import { CoffeeIcon, FloppyDiskIcon, PaintBrushIcon } from '@phosphor-icons/react';

export default function CanvasPanel({ componentCode }) {
  const [saving, setSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleSave = async ({ name, description, icon, imageData }) => {
    setShowSaveDialog(false);
    setSaving(true);
    try {
      await invoke('save_app', { name, code: componentCode, description, icon, imageData });
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
          <PaintBrushIcon size={18} weight="regular" className="text-text-secondary" />
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
