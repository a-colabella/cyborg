import { useState, useRef } from 'react';
import { PaperPlaneTilt } from '@phosphor-icons/react';

export default function ChatInput({ onSend, disabled, placeholder = "Describe what you want to build..." }) {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e) => {
    setText(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  return (
    <div className="border-t border-border p-4">
      <div className="flex items-center gap-3 bg-bg-secondary rounded-sm px-4 py-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent text-text-primary text-sm resize-none outline-none placeholder:text-text-secondary"
          disabled={disabled}
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || disabled}
          title="Send"
          className="p-2 rounded-sm bg-accent hover:bg-accent-hover text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PaperPlaneTilt size={20} weight="fill" />
        </button>
      </div>
    </div>
  );
}
