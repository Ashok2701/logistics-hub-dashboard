import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ColorTheme = "light" | "blue" | "dark" | "emerald" | "orange" | "teal";

export const COLOR_THEMES: { id: ColorTheme; label: string; description: string; preview: string }[] = [
  { id: "light", label: "Light", description: "Apple-inspired minimal", preview: "#F5F5F7" },
  { id: "blue", label: "Modern Blue", description: "Clean SaaS default", preview: "#2563EB" },
  { id: "dark", label: "Dark Mode", description: "Easy on the eyes", preview: "#38BDF8" },
  { id: "emerald", label: "Emerald Fleet", description: "Nature-inspired", preview: "#059669" },
  { id: "orange", label: "Sunset Orange", description: "Warm & energetic", preview: "#F97316" },
  { id: "teal", label: "Charcoal Teal", description: "Charcoal sidebar, teal accent", preview: "#0F6E56" },
];

const ThemeContext = createContext<{
  colorTheme: ColorTheme;
  setColorTheme: (c: ColorTheme) => void;
}>({ colorTheme: "blue", setColorTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("vanguard-color-theme") as ColorTheme) || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    // Handle dark class for Tailwind
    root.classList.remove("light", "dark");
    if (colorTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.add("light");
    }
    root.setAttribute("data-color-theme", colorTheme);
    localStorage.setItem("vanguard-color-theme", colorTheme);
  }, [colorTheme]);

  return (
    <ThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
