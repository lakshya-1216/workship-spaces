import { Building, Coffee, DoorClosed, Mic, Presentation, Sparkles, Sun, Users, type LucideIcon } from "lucide-react";
import { categories } from "@/lib/mock";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, DoorClosed, Users, Presentation, Sun, Coffee, Building, Mic,
};

export function CategoryRail({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:px-0">
      {categories.map((c) => {
        const Icon = ICONS[c.icon] ?? Sparkles;
        const on = active === c.id;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            className={`group flex shrink-0 flex-col items-center gap-2 border-b-2 px-4 py-3 text-xs font-medium transition-colors ${
              on
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="whitespace-nowrap">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
