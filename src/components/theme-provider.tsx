"use client";

import { createContext, useContext, useEffect, useState } from "react";

type ThemeChoice = "SYSTEM" | "DARK" | "LIGHT";

const ThemeContext = createContext<{ theme: ThemeChoice; setTheme: (t: ThemeChoice) => void }>({
  theme: "SYSTEM",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("SYSTEM");

  useEffect(() => {
    const stored = window.localStorage.getItem("lokal-theme") as ThemeChoice | null;
    if (stored) setThemeState(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "SYSTEM") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme.toLowerCase());
    }
  }, [theme]);

  const setTheme = (t: ThemeChoice) => {
    setThemeState(t);
    try {
      window.localStorage.setItem("lokal-theme", t);
    } catch {
      // private browsing / storage disabled — theme just won't persist
    }
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
