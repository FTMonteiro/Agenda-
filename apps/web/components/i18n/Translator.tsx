"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Languages } from "lucide-react";

import {
  getLanguage,
  readStoredLanguage,
  setCurrentLanguage,
  startTranslating,
  storeLanguage,
  subscribe,
  type Language,
} from "@/lib/i18n/translator";

const useLanguage = (): Language => useSyncExternalStore(subscribe, getLanguage, () => "pt");

// Fica na raiz da app: lê o idioma guardado e, em inglês, mantém a página traduzida.
export function Translator() {
  const language = useLanguage();

  useEffect(() => {
    setCurrentLanguage(readStoredLanguage());
  }, []);

  useEffect(() => {
    if (language !== "en") return;
    return startTranslating();
  }, [language]);

  return null;
}

// Botão PT / EN. `floating` fixa-o no canto, para as páginas sem cabeçalho (login, cadastro).
export function LanguageSwitch({ floating = false }: { floating?: boolean }) {
  const language = useLanguage();

  const change = () => {
    const next: Language = language === "en" ? "pt" : "en";
    storeLanguage(next);
    // Voltar ao português é recarregar a página: os textos originais são os do código.
    if (next === "pt") window.location.reload();
    else setCurrentLanguage(next);
  };

  return (
    <button
      type="button"
      onClick={change}
      aria-label="Mudar idioma"
      data-no-translate
      className={
        (floating ? "fixed right-4 top-4 z-50 border border-[var(--border)] bg-[var(--surface)] shadow-sm " : "") +
        "flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-[var(--muted)] transition-all duration-200 hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)] active:scale-95"
      }
    >
      <Languages size={17} />
      {language === "en" ? "EN" : "PT"}
    </button>
  );
}
