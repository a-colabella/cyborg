import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import ComponentRenderer from './ComponentRenderer';
import SaveDialog from './SaveDialog';
import PhosphorIcon from './PhosphorIcon';
import { ArrowLeftIcon, CoffeeIcon, FloppyDiskIcon, PaintBrushIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';

export default function CanvasPanel({ componentCode, schema, appInfo, onAppInfoUpdate, onClear }) {
  const [saving, setSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [appImageUrl, setAppImageUrl] = useState(null);

  const isSavedApp = appInfo != null;
  const metadata = appInfo?.metadata;

  // Load the app's image for the header when a saved app is active
  useEffect(() => {
    if (metadata?.image_path) {
      invoke('get_app_image', { imagePath: metadata.image_path })
        .then((base64) => setAppImageUrl(`data:image/png;base64,${base64}`))
        .catch(() => setAppImageUrl(null));
    } else {
      setAppImageUrl(null);
    }
  }, [metadata?.image_path]);

  const handleSave = async ({ name, description, icon, imageData }) => {
    setShowSaveDialog(false);
    setSaving(true);
    try {
      await invoke('save_app', {
        name,
        code: componentCode,
        description,
        icon,
        imageData,
        schema: schema ? JSON.stringify(schema) : null,
      });
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditMetadata = async ({ name, description, icon, imageData }) => {
    setShowEditDialog(false);
    try {
      await invoke('update_app_metadata', {
        filename: appInfo.filename,
        displayName: name,
        description,
        icon,
        imageData,
      });
      // Update local app info so the header reflects changes immediately
      if (onAppInfoUpdate) {
        const updatedMetadata = {
          ...metadata,
          display_name: name,
          description,
          icon: icon || metadata?.icon,
        };
        // If a new image was uploaded, the backend saved it — update the path
        if (imageData) {
          const stem = appInfo.filename.replace('.jsx', '');
          updatedMetadata.image_path = `images/${stem}.png`;
          updatedMetadata.icon = null;
          // Reload the image
          try {
            const base64 = await invoke('get_app_image', { imagePath: updatedMetadata.image_path });
            setAppImageUrl(`data:image/png;base64,${base64}`);
          } catch { /* ignore */ }
        } else if (icon) {
          updatedMetadata.image_path = null;
          updatedMetadata.icon = icon;
          setAppImageUrl(null);
        }
        onAppInfoUpdate({ ...appInfo, metadata: updatedMetadata });
      }
    } catch (err) {
      console.error('Failed to update metadata:', err);
    }
  };

  const displayName = metadata?.display_name || appInfo?.name;

  return (
    <div className="flex flex-col h-full bg-bg-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          {isSavedApp ? (
            <>
              {appImageUrl ? (
                <img
                  src={appImageUrl}
                  alt={displayName}
                  className="w-5 h-5 rounded object-cover flex-shrink-0"
                />
              ) : (
                <PhosphorIcon
                  name={metadata?.icon || 'Cube'}
                  size={18}
                  weight="fill"
                  className="text-accent flex-shrink-0"
                />
              )}
              <span className="text-sm font-semibold text-text-primary truncate max-w-[200px]">
                {displayName}
              </span>
            </>
          ) : (
            <>
              <PaintBrushIcon size={18} weight="regular" className="text-text-secondary" />
              <span className="text-sm font-semibold text-text-primary">Canvas</span>
            </>
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {isSavedApp ? (
            <>
              <button
                onClick={onClear}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeftIcon size={16} weight="regular" />
                <span>Back</span>
              </button>
              <button
                onClick={() => setShowEditDialog(true)}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              >
                <PencilSimpleIcon size={16} weight="regular" />
                <span>Edit</span>
              </button>
            </>
          ) : componentCode != null ? (
            <>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
              >
                <TrashIcon size={16} weight="regular" />
                <span>Clear</span>
              </button>
              <button
                onClick={() => setShowSaveDialog(true)}
                disabled={saving}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FloppyDiskIcon size={18} weight="regular" />
                <span>{saving ? 'Saving...' : 'Save as App'}</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Render Area */}
      <div className="flex-1 overflow-auto p-4">
        {componentCode ? (
          <ComponentRenderer code={componentCode} schema={schema} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-text-secondary text-sm">
            <CoffeeIcon size={48} weight="regular" />
            <span>
              Ask your AI agent to build something and it will appear here.
            </span>
          </div>
        )}
      </div>

      {/* Save Dialog (new apps) */}
      {showSaveDialog && (
        <SaveDialog
          onSave={handleSave}
          onCancel={() => setShowSaveDialog(false)}
        />
      )}

      {/* Edit Dialog (existing apps) */}
      {showEditDialog && (
        <SaveDialog
          editMode
          initialData={{
            name: metadata?.display_name || appInfo?.name || '',
            description: metadata?.description || '',
            icon: metadata?.icon || 'Cube',
            imagePreview: appImageUrl,
          }}
          onSave={handleEditMetadata}
          onCancel={() => setShowEditDialog(false)}
        />
      )}

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => e.target === e.currentTarget && setShowClearConfirm(false)}
        >
          <div className="bg-bg-secondary border border-border rounded-lg w-[400px] p-6">
            <h3 className="text-base font-semibold text-text-primary mb-2">Clear Canvas</h3>
            <p className="text-sm text-text-secondary mb-6">
              This will discard what is currently on the canvas. Are you sure?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  onClear();
                }}
                className="px-4 py-2 rounded-sm bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
