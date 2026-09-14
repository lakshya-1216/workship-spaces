import { useEffect } from "react";

/**
 * Theme is locked to light mode — there is no theme switcher in the UI.
 * This hook keeps the `dark` class off even for returning visitors who
 * previously saved a dark preference or use a dark OS setting.
 */
export function useTheme() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("workship-theme", "light");
  }, []);

  return { theme: "light" as const, toggle: () => {} };
}
