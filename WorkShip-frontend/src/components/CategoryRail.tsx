import { Building, Coffee, DoorClosed, Mic, Presentation, Sparkles, Sun, Users, type LucideIcon } from "lucide-react";
import { categories } from "@/lib/mock";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, DoorClosed, Users, Presentation, Sun, Coffee, Building, Mic,
};

export function CategoryRail({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {categories.map((c) => {
        const Icon = ICONS[c.icon] ?? Sparkles;
        const on = active === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={`group flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2.5 text-xs font-semibold transition-all ${
              on
                ? "border-primary/30 bg-primary/10 text-primary-hover shadow-[0_0_0_1px_rgba(16,185,129,0.12)]"
                : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="whitespace-nowrap">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
