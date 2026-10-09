import { useMemo, useSyncExternalStore } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { en } from "./en";

/*
 * Os idiomas da app. Os textos estão escritos em português no código; cada outro idioma
 * é um dicionário "texto em português" → "texto nesse idioma" (ver en.ts). Um texto que
 * ainda não esteja no dicionário aparece em português, nunca em branco.
 *
 * Para acrescentar um idioma: criar o dicionário (como en.ts), juntá-lo a DICTIONARIES e
 * a LANGUAGES. Nada mais muda nos ecrãs.
 */

export type Language = "pt" | "en";

export const LANGUAGES: { id: Language; name: string; flag: string; dateLocale: string }[] = [
  { id: "pt", name: "Português", flag: "🇦🇴", dateLocale: "pt-AO" },
  { id: "en", name: "English", flag: "🇬🇧", dateLocale: "en-GB" },
];

const DICTIONARIES: Record<Language, Record<string, string> | null> = { pt: null, en };

const STORAGE_KEY = "slotix.language";

let current: Language = "pt";
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return current;
}

// expo-secure-store não existe no browser, por isso na versão web usa-se o localStorage.
function store(language: Language): void {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(STORAGE_KEY, language);
    else void SecureStore.setItemAsync(STORAGE_KEY, language);
  } catch {
    // sem armazenamento disponível: a escolha vale só até fechar a app
  }
}

export function setLanguage(language: Language): void {
  if (language === current) return;
  current = language;
  store(language);
  listeners.forEach((listener) => listener());
}

// Lê o idioma guardado no telemóvel; chamado uma vez, ao abrir a app.
export async function loadLanguage(): Promise<void> {
  try {
    const stored =
      Platform.OS === "web" ? (globalThis.localStorage?.getItem(STORAGE_KEY) ?? null) : await SecureStore.getItemAsync(STORAGE_KEY);
    if (LANGUAGES.some((language) => language.id === stored) && stored !== current) {
      current = stored as Language;
      listeners.forEach((listener) => listener());
    }
  } catch {
    // fica o português
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// O idioma em que as datas se escrevem ("segunda-feira, 6 de outubro" / "Monday, 6 October").
export function dateLocale(): string {
  return LANGUAGES.find((language) => language.id === current)?.dateLocale ?? "pt-AO";
}

type Params = readonly unknown[];

function lookup(language: Language, text: string, params?: Params): string;
function lookup(language: Language, text: string | null | undefined, params?: Params): string | null | undefined;
function lookup(language: Language, text: string | null | undefined, params?: Params): string | null | undefined {
  if (typeof text !== "string") return text;
  // Os espaços à volta não fazem parte da chave ("  · desde {0}" procura "· desde {0}").
  const key = text.trim();
  const translated = DICTIONARIES[language]?.[key];
  let result = translated === undefined ? text : text.replace(key, () => translated);
  if (params) result = result.replace(/\{(\d+)\}/g, (_match, index) => String(params[Number(index)] ?? ""));
  return result;
}

/**
 * O texto no idioma atual. `params` preenche os {0}, {1}… do texto. Para usar fora dos
 * componentes (serviços, avisos); dentro de um componente usa-se o `t` de useT(), que
 * faz o ecrã atualizar quando o idioma muda.
 */
export const translate = ((text: string | null | undefined, params?: Params) => lookup(current, text, params)) as Translate;

// Um valor em falta (um texto opcional) passa como veio, para `t(x?.titulo) ?? "…"` continuar a funcionar.
export type Translate = <T extends string | null | undefined>(text: T, params?: Params) => T extends string ? string : T;

// O `t` dos componentes: muda de identidade quando o idioma muda, para tudo o que
// depende dele ser refeito (incluindo o que o React Compiler guarda em memória).
export function useT(): Translate {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return useMemo(
    () => ((text: string | null | undefined, params?: Params) => lookup(language, text, params)) as Translate,
    [language],
  );
}

export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, getLanguage);
}
