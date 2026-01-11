import { useEffect, useRef, useState } from "react";
import { STORAGE_KEYS, THEME } from "../constants";

export function useTheme() {
  // Read initial state from DOM (set by inline script in index.html)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains(THEME.DARK);
  });

  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip saving on first render (only save after user explicitly toggles)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const root = document.documentElement;
    if (isDark) {
      root.classList.add(THEME.DARK);
    } else {
      root.classList.remove(THEME.DARK);
    }

    // localStorage can throw in private browsing or when storage is full
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, isDark ? THEME.DARK : THEME.LIGHT);
    } catch {
      // Silently fail - theme will still work for current session
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return { isDark, toggleTheme };
}
