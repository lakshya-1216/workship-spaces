import { Sparkles } from "lucide-react";
import { IntentTag, TAG_EMOJIS, TAG_LABELS } from "@/lib/ai-search";

type AiIntentChipsProps = {
  intentTags: IntentTag[];
  query: string;
  resultCount: number;
};

/**
 * AiIntentChips — explanation chips displayed above AI search results.
 *
 * Shows detected preferences so users understand WHY workspaces are ranked as
 * they are. Only rendered when an AI query is active and has intent tags.
 */
export function AiIntentChips({ intentTags, query, resultCount }: AiIntentChipsProps) {
  // Show only tags with meaningful confidence
  const visibleTags = intentTags.filter((t) => t.confidence >= 0.6).slice(0, 6);

  if (!query.trim() || visibleTags.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-surface p-4">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">
            AI detected preferences
          </span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {resultCount} workspace{resultCount !== 1 ? "s" : ""} matched
        </span>
      </div>

      {/* Intent chips */}
      <div className="flex flex-wrap gap-2">
        {visibleTags.map(({ tag, confidence }) => {
          const label = TAG_LABELS[tag] ?? tag;
          const emoji = TAG_EMOJIS[tag] ?? "•";
          const strong = confidence >= 0.7;

          return (
            <span
              key={tag}
              title={`Confidence: ${Math.round(confidence * 100)}%`}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
                strong
                  ? "border-transparent bg-primary-soft text-forest"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              <span className="text-sm leading-none">{emoji}</span>
              {label}
            </span>
          );
        })}
      </div>

      {/* Query echo */}
      <p className="mt-2.5 truncate text-[11px] text-faint">
        Showing results for: <span className="italic">"{query}"</span>
      </p>
    </div>
  );
}
