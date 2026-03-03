import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function SavedAppsMenu({ onSelect, onClose }) {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await invoke('list_apps');
        setApps(result);
      } catch (err) {
        console.error('Failed to list apps:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLoad = async (filename) => {
    try {
      const code = await invoke('load_app', { filename });
      onSelect(code);
    } catch (err) {
      console.error('Failed to load app:', err);
    }
  };

  const handleDelete = async (filename) => {
    try {
      await invoke('delete_app', { filename });
      setApps((prev) => prev.filter((a) => a.filename !== filename));
    } catch (err) {
      console.error('Failed to delete app:', err);
    }
  };

  return (
    <div className="border-b border-border bg-bg-secondary px-4 py-3 max-h-60 overflow-y-auto">
      {loading ? (
        <p className="text-xs text-text-secondary">Loading...</p>
      ) : apps.length === 0 ? (
        <p className="text-xs text-text-secondary">No saved apps yet.</p>
      ) : (
        <ul className="space-y-1">
          {apps.map((app) => (
            <li
              key={app.filename}
              className="flex items-center justify-between group"
            >
              <button
                onClick={() => handleLoad(app.filename)}
                className="text-xs text-text-primary hover:text-accent truncate flex-1 text-left py-1"
              >
                {app.name || app.filename}
              </button>
              <button
                onClick={() => handleDelete(app.filename)}
                className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
