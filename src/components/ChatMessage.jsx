import { useState } from 'react';
import Markdown from 'react-markdown';

function CodeCollapsible({ children, className }) {
  const [open, setOpen] = useState(false);

  // Only collapse fenced code blocks (``` blocks), not inline code
  // react-markdown passes className like "language-jsx" for fenced blocks
  const isBlock = className || String(children).includes('\n');
  if (!isBlock) {
    return (
      <code className="bg-bg-tertiary text-accent px-1.5 py-0.5 rounded text-xs">
        {children}
      </code>
    );
  }

  return (
    <div className="my-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors py-1"
      >
        <span
          className="inline-block transition-transform duration-150"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▶
        </span>
        Show Code
      </button>
      {open && (
        <pre className="bg-bg-tertiary rounded-lg p-3 mt-1 overflow-x-auto">
          <code className="text-xs text-text-primary whitespace-pre-wrap break-words">
            {children}
          </code>
        </pre>
      )}
    </div>
  );
}

export default function ChatMessage({ role, content }) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed overflow-hidden ${
          isUser
            ? 'bg-user-bubble text-white rounded-br-md'
            : 'bg-ai-bubble text-text-primary rounded-bl-md border border-border'
        }`}
      >
        {isUser ? (
          content
        ) : (
          <div className="prose prose-invert prose-sm max-w-none break-words [&_a]:text-accent">
            <Markdown
              components={{
                code: CodeCollapsible,
                pre: ({ children }) => <>{children}</>,
              }}
            >
              {content}
            </Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
