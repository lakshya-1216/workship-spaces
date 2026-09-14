import { Building, Coffee, DoorClosed, Mic, Presentation, Sparkles, Sun, Users, type LucideIcon } from "lucide-react";
import { categories } from "@/lib/mock";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, DoorClosed, Users, Presentation, Sun, Coffee, Building, Mic,
};

/**
 * CategoryRail — marketplace discovery bar, visually part of the header.
 * Quiet text by default; the active category gets a soft sage fill.
 * Only this rail scrolls horizontally on mobile; the page never does.
 */
export function CategoryRail({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Workspace categories"
      className="no-scrollbar flex min-w-0 max-w-full touch-pan-x items-center gap-1 overflow-x-auto sm:gap-1.5"
    >
      {categories.map((c) => {
        const Icon = ICONS[c.icon] ?? Sparkles;
        const on = active === c.id;
        return (
          <button
            key={c.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(c.id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors sm:text-sm ${
              on
                ? "bg-primary-soft text-forest"
                : "text-muted-foreground hover:bg-hover-surface hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={on ? 2.25 : 1.75} />
            <span className="whitespace-nowrap">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
