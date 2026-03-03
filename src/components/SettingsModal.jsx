import { useState, useEffect } from 'react';
import { load } from '@tauri-apps/plugin-store';

const PROVIDERS = [
  { id: 'claude', name: 'Claude', placeholder: 'sk-ant-...' },
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'gemini', name: 'Gemini', placeholder: 'AI...' },
];

const MODELS = {
  claude: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  gemini: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
};

export default function SettingsModal({ onClose }) {
  const [activeProvider, setActiveProvider] = useState('claude');
  const [apiKeys, setApiKeys] = useState({ claude: '', openai: '', gemini: '' });
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const store = await load('settings.json', { autoSave: false });
        const keys = await store.get('apiKeys');
        const provider = await store.get('activeProvider');
        const sbUrl = await store.get('supabaseUrl');
        const sbKey = await store.get('supabaseKey');
        if (keys) setApiKeys(keys);
        if (provider) setActiveProvider(provider);
        if (sbUrl) setSupabaseUrl(sbUrl);
        if (sbKey) setSupabaseKey(sbKey);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const store = await load('settings.json', { autoSave: false });
      await store.set('apiKeys', apiKeys);
      await store.set('activeProvider', activeProvider);
      if (supabaseUrl) await store.set('supabaseUrl', supabaseUrl);
      if (supabaseKey) await store.set('supabaseKey', supabaseKey);
      await store.save();
      onClose();
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!loaded) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={handleBackdropClick}
    >
      <div className="bg-bg-secondary border border-border rounded-xl w-[520px] max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-lg leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-2">
              AI Provider
            </label>
            <div className="flex gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveProvider(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeProvider === p.id
                      ? 'bg-accent text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          {PROVIDERS.map((p) => (
            <div key={p.id} className={activeProvider === p.id ? '' : 'hidden'}>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                {p.name} API Key
              </label>
              <input
                type="password"
                value={apiKeys[p.id]}
                onChange={(e) =>
                  setApiKeys((prev) => ({ ...prev, [p.id]: e.target.value }))
                }
                placeholder={p.placeholder}
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
              />
              <div className="mt-2">
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Model
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MODELS[p.id].map((model) => (
                    <span
                      key={model}
                      className="text-xs px-2 py-1 rounded bg-bg-tertiary text-text-secondary"
                    >
                      {model}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Supabase Config */}
          <div className="border-t border-border pt-5">
            <h3 className="text-xs font-medium text-text-secondary mb-1">
              Supabase (Optional)
            </h3>
            <p className="text-xs text-text-secondary mb-3 opacity-70">
              Connect Supabase to sync your apps and data across devices.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
              />
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="Supabase anon key"
                className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
