import { useState, useRef, useEffect } from 'react';
import { UploadSimpleIcon, ImageIcon } from '@phosphor-icons/react';
import PhosphorIcon, { ICON_MAP, ICON_NAMES } from './PhosphorIcon';

export default function SaveDialog({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [activeTab, setActiveTab] = useState('icon');
  const [selectedIcon, setSelectedIcon] = useState('Cube');
  const [imagePreview, setImagePreview] = useState(null);
  const [imageData, setImageData] = useState(null);
  const nameInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave({
      name: trimmed,
      description: description.trim() || null,
      icon: activeTab === 'icon' ? selectedIcon : null,
      imageData: activeTab === 'image' ? imageData : null,
    });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      // Resize image client-side to max 400x400
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 400;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize;
            width = maxSize;
          } else {
            width = (width / height) * maxSize;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png');
        setImagePreview(dataUrl);
        // Strip the data:image/png;base64, prefix for the backend
        setImageData(dataUrl.split(',')[1]);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleImageClear = () => {
    setImagePreview(null);
    setImageData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-bg-secondary border border-border rounded-lg w-[480px] max-h-[85vh] overflow-y-auto"
      >
        <div className="px-6 pt-6 pb-4">
          <h3 className="text-base font-semibold text-text-primary mb-4">Save App</h3>

          {/* Name */}
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Name</label>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My awesome app..."
            className="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors mb-4"
          />

          {/* Description */}
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Description <span className="text-text-secondary/50">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this app do?"
            rows={2}
            className="w-full bg-bg-primary border border-border rounded-sm px-3 py-2 text-sm text-text-primary outline-none focus:border-accent transition-colors resize-none mb-4"
          />

          {/* Icon / Image Tabs */}
          <label className="block text-xs font-medium text-text-secondary mb-2">App Icon</label>
          <div className="flex gap-1 mb-3">
            <button
              type="button"
              onClick={() => setActiveTab('icon')}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                activeTab === 'icon'
                  ? 'bg-accent text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              Choose Icon
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                activeTab === 'image'
                  ? 'bg-accent text-white'
                  : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              Upload Image
            </button>
          </div>

          {/* Icon Grid */}
          {activeTab === 'icon' && (
            <div className="grid grid-cols-10 gap-1 mb-2">
              {ICON_NAMES.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setSelectedIcon(iconName)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    selectedIcon === iconName
                      ? 'bg-accent/20 text-accent ring-1 ring-accent'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                  }`}
                  title={iconName}
                >
                  <PhosphorIcon name={iconName} size={20} weight={selectedIcon === iconName ? 'fill' : 'regular'} />
                </button>
              ))}
            </div>
          )}

          {/* Image Upload */}
          {activeTab === 'image' && (
            <div className="mb-2">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={handleImageClear}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 rounded-lg border-2 border-dashed border-border hover:border-accent/50 flex flex-col items-center justify-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  <UploadSimpleIcon size={32} weight="regular" />
                  <span className="text-xs">Click to upload an image</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
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
