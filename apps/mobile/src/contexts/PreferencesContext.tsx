import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { setHapticsEnabled } from "@/services/haptics";
import { useT } from "@/i18n";

// As escolhas que a pessoa faz no Perfil e nas Definições. Ficam guardadas no telemóvel
// e cada uma muda de facto alguma coisa na app — não há aqui opções só decorativas.
export interface Preferences {
  // Avisos no telemóvel antes de cada marcação (ver services/reminders).
  reminders: boolean;
  // Usar o GPS para mostrar espaços perto e distâncias (ver LocationContext).
  location: boolean;
  // Que avisos aparecem na lista de Notificações.
  notifyAppointments: boolean;
  notifyPayments: boolean;
  // Pequena vibração ao mudar de separador e ao marcar um favorito.
  haptics: boolean;
  // Mostrar o preço dos serviços antes de reservar.
  showPrices: boolean;
  // O separador em que a app abre.
  startPage: StartPage;
}

export type StartPage = "/" | "/explore" | "/marcar" | "/profile";

export const START_PAGES: { value: StartPage; label: string }[] = [
  { value: "/", label: "Início" },
  { value: "/explore", label: "Explorar" },
  { value: "/marcar", label: "Marcar" },
  { value: "/profile", label: "Perfil" },
];

export const DEFAULT_PREFERENCES: Preferences = {
  reminders: true,
  location: true,
  notifyAppointments: true,
  notifyPayments: true,
  haptics: true,
  showPrices: true,
  startPage: "/",
};

interface PreferencesContextValue {
  preferences: Preferences;
  // Verdadeiro depois de as escolhas guardadas no telemóvel terem sido lidas.
  loaded: boolean;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
}

const STORAGE_KEY = "slotix.preferences";

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

// expo-secure-store não existe no browser, por isso na versão web usa-se o localStorage.
async function readStored(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(value: Preferences): void {
  const text = JSON.stringify(value);
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(STORAGE_KEY, text);
    else void SecureStore.setItemAsync(STORAGE_KEY, text);
  } catch {
    // sem armazenamento disponível: as escolhas valem só até fechar a app
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void readStored().then((stored) => {
      try {
        // Sobre os valores por omissão, para uma opção nova não ficar sem valor em quem
        // já tinha escolhas guardadas de uma versão anterior.
        if (stored) setPreferences({ ...DEFAULT_PREFERENCES, ...(JSON.parse(stored) as Partial<Preferences>) });
      } catch {
        // valor guardado ilegível: ficam as escolhas por omissão
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    setHapticsEnabled(preferences.haptics);
  }, [preferences.haptics]);

  const setPreference = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => {
      const next = { ...current, [key]: value };
      writeStored(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    writeStored(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo(() => ({ preferences, loaded, setPreference, reset }), [preferences, loaded, setPreference, reset]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const t = useT();
  const context = useContext(PreferencesContext);
  if (!context) throw new Error(t("usePreferences tem de ser usado dentro de um PreferencesProvider."));
  return context;
}
