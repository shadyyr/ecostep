"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ColorScheme = "light" | "dark" | "system";

interface ThemeContextValue {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(scheme: ColorScheme) {
  const html = document.documentElement;
  if (scheme === "system") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", scheme);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("colorScheme") as ColorScheme | null) ?? "system";
  });

  useEffect(() => {
    applyTheme(colorScheme);
  }, [colorScheme]);

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    localStorage.setItem("colorScheme", scheme);
  };

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
