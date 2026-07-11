"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ColorScheme = "light" | "dark" | "system";

interface ThemeContextValue {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveScheme(scheme: ColorScheme): "light" | "dark" {
  if (scheme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return scheme;
}

// Always resolves to an explicit "light"/"dark" attribute (never removes it) so
// Tailwind's `dark:` custom variant — which matches on [data-theme="dark"], not
// prefers-color-scheme — applies correctly even when the user is on "system".
function applyTheme(scheme: ColorScheme) {
  document.documentElement.setAttribute("data-theme", resolveScheme(scheme));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("colorScheme") as ColorScheme | null) ?? "system";
  });

  useEffect(() => {
    applyTheme(colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    if (colorScheme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => applyTheme("system");
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
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
