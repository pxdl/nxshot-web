import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import { useTheme } from "../hooks";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600 text-stone-500 dark:text-slate-400 hover:text-stone-700 dark:hover:text-slate-200 transition-all active:scale-95 cursor-pointer"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <SunIcon className="w-5 h-5" />
      ) : (
        <MoonIcon className="w-5 h-5" />
      )}
    </button>
  );
}
