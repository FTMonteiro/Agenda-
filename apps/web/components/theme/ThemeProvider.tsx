"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "nevrix-theme";

const THEME_EVENT = "nevrix:themechange";

/*
 * A fonte de verdade do tema é a classe em <html>, definida pelo script inline
 * do layout antes da primeira pintura. Em vez de duplicar isso em estado do
 * React e sincronizar num efeito, lemos o DOM directamente com
 * useSyncExternalStore: na hidratação usa-se o snapshot do servidor, evitando
 * descasamento entre o ícone renderizado no servidor e no cliente.
 */
function subscribe(onStoreChange: () => void) {
  window.addEventListener(THEME_EVENT, onStoreChange);

  return () => window.removeEventListener(THEME_EVENT, onStoreChange);
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.classList.remove("light", "dark");

  root.classList.add(theme);

  // Ajuda o browser a pintar controlos nativos (scrollbar, date picker) no
  // tom certo.
  root.style.colorScheme = theme;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Modo privado ou storage bloqueado: o tema vale só para esta sessão.
  }

  window.dispatchEvent(new Event(THEME_EVENT));
}

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: Theme) => applyTheme(next), []);

  const toggleTheme = useCallback(() => {
    applyTheme(getSnapshot() === "dark" ? "light" : "dark");
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme precisa estar dentro de ThemeProvider");
  }

  return context;
}
