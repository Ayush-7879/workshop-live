import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") || "system";
    } catch (e) {
      return "system";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      // ignore (private browsing etc.)
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      if (prev === "dark") return "light";
      if (prev === "light") return "dark";
      // "system" -> flip based on current system preference
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      return prefersDark ? "light" : "dark";
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
