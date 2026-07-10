import { SunIcon, MoonIcon } from "@heroicons/react/24/solid";
import { useTheme } from "../hooks";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600 text-stone-500 dark:text-slate-400 hover:text-stone-700 dark:hover:text-slate-200 transition-[color,border-color,background-color,transform] duration-200 ease-snappy active:scale-95 cursor-pointer"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Both icons stacked; the incoming one rotates in as the other rotates out */}
      <span className="relative block w-5 h-5">
        <SunIcon
          className={`absolute inset-0 w-5 h-5 transition-[opacity,transform] duration-300 ease-snappy ${
            isDark
              ? "opacity-100 rotate-0 scale-100"
              : "opacity-0 -rotate-90 scale-50"
          }`}
        />
        <MoonIcon
          className={`absolute inset-0 w-5 h-5 transition-[opacity,transform] duration-300 ease-snappy ${
            isDark
              ? "opacity-0 rotate-90 scale-50"
              : "opacity-100 rotate-0 scale-100"
          }`}
        />
      </span>
    </button>
  );
}
