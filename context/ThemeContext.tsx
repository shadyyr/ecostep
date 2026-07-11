"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ColorScheme = "light" | "dark" | "system";

interface ThemeContextValue {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem("colorScheme") as ColorScheme | null;
    if (saved) {
      setColorSchemeState(saved);
      applyTheme(saved);
    }
    setMounted(true);
  }, []);

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    localStorage.setItem("colorScheme", scheme);
    applyTheme(scheme);
  };

  const applyTheme = (scheme: ColorScheme) => {
    const html = document.documentElement;
    if (scheme === "system") {
      html.removeAttribute("data-theme");
    } else {
      html.setAttribute("data-theme", scheme);
    }
  };

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
