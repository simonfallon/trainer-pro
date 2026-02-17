"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Theme, defaultTheme, getThemeById } from "@/themes";

interface ThemeContextType {
  theme: Theme;
  setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
  initialThemeId?: string;
  initialTheme?: Theme;
}

export function ThemeProvider({ children, initialThemeId, initialTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(
    initialTheme || (initialThemeId ? getThemeById(initialThemeId) || defaultTheme : defaultTheme)
  );

  const setTheme = (themeId: string) => {
    const newTheme = getThemeById(themeId);
    if (newTheme) {
      setThemeState(newTheme);
    }
  };

  useEffect(() => {
    // Apply CSS custom properties for theme
    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.colors.primary);
    root.style.setProperty("--color-secondary", theme.colors.secondary);
    root.style.setProperty("--color-background", theme.colors.background);
    root.style.setProperty("--color-text", theme.colors.text);
    root.style.setProperty("--font-heading", theme.fonts.heading);
    root.style.setProperty("--font-body", theme.fonts.body);

    // Apply background and text color to body
    document.body.style.backgroundColor = theme.colors.background;
    document.body.style.color = theme.colors.text;
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
