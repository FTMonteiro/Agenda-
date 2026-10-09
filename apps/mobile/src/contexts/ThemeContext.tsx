import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform, useColorScheme as useSystemColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

export type ThemePreference = "light" | "dark" | "system";
export type ThemeScheme = "light" | "dark";

interface ThemeContextValue {
  preference: ThemePreference;
  scheme: ThemeScheme;
  setPreference: (preference: ThemePreference) => void;
}

const STORAGE_KEY = "slotix.theme";

// Sem provider (testes, ecrãs isolados) a app fica no aspeto claro.
const ThemeContext = createContext<ThemeContextValue>({
  preference: "light",
  scheme: "light",
  setPreference: () => undefined,
});

// expo-secure-store não existe no browser, por isso na versão web usa-se o localStorage.
async function readStored(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

async function writeStored(value: string): Promise<void> {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(STORAGE_KEY, value);
    else await SecureStore.setItemAsync(STORAGE_KEY, value);
  } catch {
    // sem armazenamento disponível: a escolha vale só até fechar a app
  }
}

// A escolha de tema da pessoa: Claro, Escuro ou Sistema (segue o telemóvel). Fica
// guardada no dispositivo e é o que todos os ecrãs leem através de useColorScheme().
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("light");

  useEffect(() => {
    void readStored().then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") setPreferenceState(stored);
    });
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    void writeStored(next);
  }, []);

  const scheme: ThemeScheme = preference === "system" ? (system === "dark" ? "dark" : "light") : preference;

  const value = useMemo(() => ({ preference, scheme, setPreference }), [preference, scheme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference(): ThemeContextValue {
  return useContext(ThemeContext);
}
