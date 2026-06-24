export function TypingIndicator() {
  return (
    <div className="flex w-full justify-start animate-fade-in-up">
      <div className="flex items-center gap-1.5 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-sm bg-gray-200 dark:bg-zinc-800 px-4 py-3 w-fit shadow-[var(--shadow-soft)]">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-typing" style={{ animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-typing" style={{ animationDelay: "150ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-typing" style={{ animationDelay: "300ms" }} />
      </div>
    </div>
  );
}
