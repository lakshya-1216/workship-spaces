import { Paperclip, Send, Smile } from "lucide-react";
import { useRef, useState } from "react";

const EMOJIS = ["😀", "😂", "🥲", "😎", "🤝", "👋", "👍", "🔥", "✨", "🙏", "☕", "📅", "💬", "❤️", "🎉", "📌"];

export function ChatInput({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const v = text.trim();
    if (!v) return;
    onSend(v);
    setText("");
    inputRef.current?.focus();
  }

  return (
    <div className="relative border-t border-border bg-background p-3 md:p-4">
      {showEmoji && (
        <div className="absolute bottom-full left-3 mb-3 flex max-w-xs flex-wrap gap-2 rounded-2xl border border-border bg-popover p-3 shadow-lg animate-fade-in-up">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => { setText((t) => t + e); setShowEmoji(false); }}
              className="rounded-lg p-2 text-lg transition-colors hover:bg-secondary"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <div className="mx-auto max-w-2xl">
        <div className="flex items-end gap-2 rounded-full border border-border bg-surface-elevated px-4 py-2.5 transition-colors focus-within:border-teal-500/50 focus-within:ring-1 focus-within:ring-teal-500/20">
          <button onClick={() => setShowEmoji((v) => !v)} className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Emoji">
            <Smile className="h-5 w-5" />
          </button>
          <button className="shrink-0 rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Attach">
            <Paperclip className="h-5 w-5" />
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Write a message…"
            className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-teal-500 dark:hover:bg-teal-600"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
