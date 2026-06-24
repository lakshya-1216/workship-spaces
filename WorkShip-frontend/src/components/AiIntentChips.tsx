import { IntentTag, TAG_EMOJIS, TAG_LABELS } from "@/lib/ai-search";

type AiIntentChipsProps = {
  intentTags: IntentTag[];
  query: string;
  resultCount: number;
};

/**
 * AiIntentChips — Part 4: explanation chips displayed above AI search results.
 *
 * Shows detected preferences so users understand WHY workspaces are ranked as
 * they are. Only rendered when an AI query is active and has intent tags.
 */
export function AiIntentChips({ intentTags, query, resultCount }: AiIntentChipsProps) {
  // Show only tags with meaningful confidence
  const visibleTags = intentTags.filter((t) => t.confidence >= 0.60).slice(0, 6);

  if (!query.trim() || visibleTags.length === 0) return null;

  return (
    <div className="ai-intent-banner rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/8 via-primary/5 to-transparent p-4 mb-6 animate-fade-in">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs">
            ✦
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-primary-hover">
            AI Detected Preferences
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {resultCount} workspace{resultCount !== 1 ? "s" : ""} matched
        </span>
      </div>

      {/* Intent chips */}
      <div className="flex flex-wrap gap-2">
        {visibleTags.map(({ tag, confidence }) => {
          const label = TAG_LABELS[tag] ?? tag;
          const emoji = TAG_EMOJIS[tag] ?? "✦";
          // Confidence tier: high (≥0.85), medium (≥0.70), low (<0.70)
          const tier =
            confidence >= 0.85 ? "high" : confidence >= 0.70 ? "medium" : "low";

          return (
            <span
              key={tag}
              title={`Confidence: ${Math.round(confidence * 100)}%`}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-105 ${
                tier === "high"
                  ? "bg-primary/20 text-primary-hover border border-primary/30 shadow-sm"
                  : tier === "medium"
                    ? "bg-primary/12 text-primary-hover border border-primary/20"
                    : "bg-secondary/70 text-muted-foreground border border-border"
              }`}
            >
              <span className="text-sm leading-none">{emoji}</span>
              {label}
              {confidence >= 0.85 && (
                <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-primary-hover/60 animate-pulse" />
              )}
            </span>
          );
        })}
      </div>

      {/* Query echo */}
      <p className="mt-2.5 text-[11px] text-muted-foreground/70 truncate">
        Showing results for:{" "}
        <span className="italic text-muted-foreground">"{query}"</span>
      </p>
    </div>
  );
}
