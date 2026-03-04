import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppWindowIcon, RocketLaunchIcon, TrashIcon, PencilSimpleIcon } from '@phosphor-icons/react';
import PhosphorIcon from '../PhosphorIcon';
import SaveDialog from '../SaveDialog';

export default function MyAppsPage({ onLoadApp }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageCache, setImageCache] = useState({});
  const [editingApp, setEditingApp] = useState(null);
  const [deletingApp, setDeletingApp] = useState(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    setLoading(true);
    try {
      const result = await invoke('list_apps');
      setApps(result);

      // Load images for apps that have them
      const cache = {};
      for (const app of result) {
        if (app.metadata?.image_path) {
          try {
            const base64 = await invoke('get_app_image', { imagePath: app.metadata.image_path });
            cache[app.filename] = `data:image/png;base64,${base64}`;
          } catch (err) {
            console.error(`Failed to load image for ${app.name}:`, err);
          }
        }
      }
      setImageCache(cache);
    } catch (err) {
      console.error('Failed to list apps:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async (app) => {
    try {
      const result = await invoke('load_app', { filename: app.filename });
      const schema = result.schema ? JSON.parse(result.schema) : null;
      onLoadApp(result.code, app, schema);
    } catch (err) {
      console.error('Failed to load app:', err);
    }
  };

  const handleDelete = async (filename) => {
    try {
      await invoke('delete_app', { filename });
      setApps((prev) => prev.filter((a) => a.filename !== filename));
      setImageCache((prev) => {
        const next = { ...prev };
        delete next[filename];
        return next;
      });
    } catch (err) {
      console.error('Failed to delete app:', err);
    } finally {
      setDeletingApp(null);
    }
  };

  const handleEditMetadata = async ({ name, description, icon, imageData }) => {
    const app = editingApp;
    setEditingApp(null);
    try {
      await invoke('update_app_metadata', {
        filename: app.filename,
        displayName: name,
        description,
        icon,
        imageData,
      });

      // If a new image was uploaded, reload it
      if (imageData) {
        const stem = app.filename.replace('.jsx', '');
        try {
          const base64 = await invoke('get_app_image', { imagePath: `images/${stem}.png` });
          setImageCache((prev) => ({ ...prev, [app.filename]: `data:image/png;base64,${base64}` }));
        } catch { /* ignore */ }
      } else if (icon) {
        // Switched from image to icon — clear the cached image
        setImageCache((prev) => {
          const next = { ...prev };
          delete next[app.filename];
          return next;
        });
      }

      // Refresh the apps list to pick up updated metadata
      const result = await invoke('list_apps');
      setApps(result);
    } catch (err) {
      console.error('Failed to update metadata:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      {/* Page Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <AppWindowIcon size={20} weight="regular" className="text-text-secondary" />
          <h1 className="text-base font-semibold text-text-primary">My Apps</h1>
        </div>
        {!loading && apps.length > 0 && (
          <span className="text-xs text-text-secondary">{apps.length} app{apps.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-text-secondary">Loading...</span>
          </div>
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-text-secondary">
            <RocketLaunchIcon size={64} weight="regular" />
            <h2 className="text-lg font-semibold text-text-primary">No apps yet</h2>
            <p className="text-sm text-center max-w-sm">
              Head to the Canvas and start chatting with your AI agent to build something. Save it as an app and it will show up here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {apps.map((app) => (
              <AppCard
                key={app.filename}
                app={app}
                imageUrl={imageCache[app.filename]}
                onLoad={() => handleLoad(app)}
                onEdit={() => setEditingApp(app)}
                onDelete={() => setDeletingApp(app)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Metadata Dialog */}
      {editingApp && (
        <SaveDialog
          editMode
          initialData={{
            name: editingApp.metadata?.display_name || editingApp.name,
            description: editingApp.metadata?.description || '',
            icon: editingApp.metadata?.icon || 'Cube',
            imagePreview: imageCache[editingApp.filename] || null,
          }}
          onSave={handleEditMetadata}
          onCancel={() => setEditingApp(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingApp && (
        <DeleteConfirmDialog
          appName={deletingApp.metadata?.display_name || deletingApp.name}
          onConfirm={() => handleDelete(deletingApp.filename)}
          onCancel={() => setDeletingApp(null)}
        />
      )}
    </div>
  );
}

function AppCard({ app, imageUrl, onLoad, onEdit, onDelete }) {
  const displayName = app.metadata?.display_name || app.name;
  const description = app.metadata?.description;
  const iconName = app.metadata?.icon;

  return (
    <div className="bg-bg-secondary border border-border rounded-sm overflow-hidden hover:border-accent/50 transition-colors group">
      {/* Image / Icon area — clicking opens the app */}
      <div
        className="h-40 bg-bg-tertiary flex items-center justify-center cursor-pointer"
        onClick={onLoad}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <PhosphorIcon
            name={iconName || 'Cube'}
            size={48}
            weight="regular"
            className="text-text-secondary"
          />
        )}
      </div>

      {/* Info — clicking opens the app */}
      <div className="p-3 cursor-pointer" onClick={onLoad}>
        <h3 className="text-sm font-medium text-text-primary truncate">{displayName}</h3>
        {description && (
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">{description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-1 flex-1 py-2 text-xs text-text-secondary hover:text-accent transition-colors"
        >
          <PencilSimpleIcon size={14} />
          Edit
        </button>
        <div className="w-px bg-border" />
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1 flex-1 py-2 text-xs text-text-secondary hover:text-red-400 transition-colors"
        >
          <TrashIcon size={14} />
          Delete
        </button>
      </div>
    </div>
  );
}

function DeleteConfirmDialog({ appName, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-bg-secondary border border-border rounded-sm w-[400px] p-6">
        <h3 className="text-base font-semibold text-text-primary mb-2">Delete App</h3>
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to delete <span className="text-text-primary font-medium">{appName}</span>? This will permanently remove the app and all its data.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-sm text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-sm bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
