import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";

export type ColorTheme = "blue" | "green" | "orange" | "purple" | "teal" | "rose";

export const COLOR_THEMES: { id: ColorTheme; label: string; hue: string }[] = [
  { id: "blue", label: "Ocean Blue", hue: "217 91% 60%" },
  { id: "green", label: "Emerald", hue: "152 69% 41%" },
  { id: "orange", label: "Sunset", hue: "25 95% 53%" },
  { id: "purple", label: "Violet", hue: "263 70% 50%" },
  { id: "teal", label: "Teal", hue: "180 70% 40%" },
  { id: "rose", label: "Rose", hue: "340 75% 55%" },
];

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (c: ColorTheme) => void;
}>({ theme: "dark", toggleTheme: () => {}, colorTheme: "blue", setColorTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("vanguard-theme") as Theme) || "dark";
    }
    return "dark";
  });

  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("vanguard-color-theme") as ColorTheme) || "blue";
    }
    return "blue";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("vanguard-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-color-theme", colorTheme);
    localStorage.setItem("vanguard-color-theme", colorTheme);
  }, [colorTheme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
