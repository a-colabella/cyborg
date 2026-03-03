import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppWindowIcon, RocketLaunchIcon, TrashIcon } from '@phosphor-icons/react';
import PhosphorIcon from '../PhosphorIcon';

export default function MyAppsPage({ onLoadApp }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imageCache, setImageCache] = useState({});

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

  const handleLoad = async (filename) => {
    try {
      const code = await invoke('load_app', { filename });
      onLoadApp(code);
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
                onLoad={() => handleLoad(app.filename)}
                onDelete={() => handleDelete(app.filename)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AppCard({ app, imageUrl, onLoad, onDelete }) {
  const displayName = app.metadata?.display_name || app.name;
  const description = app.metadata?.description;
  const iconName = app.metadata?.icon;

  return (
    <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden hover:border-accent/50 transition-colors group">
      {/* Image / Icon area */}
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

      {/* Info */}
      <div className="p-3 cursor-pointer" onClick={onLoad}>
        <h3 className="text-sm font-medium text-text-primary truncate">{displayName}</h3>
        {description && (
          <p className="text-xs text-text-secondary mt-1 line-clamp-2">{description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-border opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onLoad}
          className="flex-1 py-2 text-xs text-text-secondary hover:text-accent transition-colors"
        >
          Open
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
