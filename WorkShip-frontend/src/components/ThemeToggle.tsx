import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme placeholder"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-elevated text-foreground transition-all"
      />
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-elevated text-foreground transition-all hover:border-primary/40 hover:text-primary-hover"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
