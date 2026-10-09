import { en } from "./en";

/*
 * O tradutor do painel. Os ecrãs estão escritos em português; em vez de alterar cada um,
 * o tradutor percorre a página já desenhada e troca cada texto pelo do dicionário (en.ts),
 * e fica atento ao que muda (modais, avisos, listas que carregam) para traduzir também.
 * Um texto que não esteja no dicionário fica como está — nunca desaparece.
 */

export type Language = "pt" | "en";

const STORAGE_KEY = "agenda-language";
const ATTRIBUTES = ["placeholder", "title", "aria-label", "alt"] as const;
// O que as pessoas escrevem e o código da página não se traduz.
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "NOSCRIPT"]);

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

const exact = new Map<string, string>();
const patterns: { source: RegExp; target: string }[] = [];
for (const [key, value] of Object.entries(en)) {
  if (!/\{\d+\}/.test(key)) {
    exact.set(collapse(key), value);
    continue;
  }
  // "há {0} min" → /^há (.+?) min$/ ; o que o {0} apanhou volta a entrar na tradução.
  const source = collapse(key)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\{(\d+)\\\}/g, "(.+?)");
  patterns.push({ source: new RegExp(`^${source}$`), target: value });
}

// A tradução de um texto, mantendo os espaços à volta; null se não houver.
export function translateText(text: string): string | null {
  const core = collapse(text);
  if (!core || !/\p{L}/u.test(core)) return null;

  let translated = exact.get(core);
  if (translated === undefined) {
    for (const { source, target } of patterns) {
      const match = source.exec(core);
      if (match) {
        translated = target.replace(/\{(\d+)\}/g, (_all, index) => match[Number(index) + 1] ?? "");
        break;
      }
    }
  }
  if (translated === undefined) return null;

  const lead = /^\s*/.exec(text)?.[0] ?? "";
  const tail = /\s*$/.exec(text)?.[0] ?? "";
  return lead + translated + tail;
}

// O último texto que o tradutor pôs em cada nó, para não o traduzir duas vezes.
const written = new WeakMap<Node, string>();

function translateNode(node: Text): void {
  const value = node.nodeValue ?? "";
  if (written.get(node) === value) return;
  const parent = node.parentElement;
  if (!parent || SKIP.has(parent.tagName) || parent.closest("[contenteditable],[data-no-translate]")) return;

  const translated = translateText(value);
  if (translated !== null && translated !== value) {
    written.set(node, translated);
    node.nodeValue = translated;
  }
}

function translateAttributes(element: Element): void {
  for (const name of ATTRIBUTES) {
    const value = element.getAttribute(name);
    if (!value) continue;
    const translated = translateText(value);
    if (translated !== null && translated !== value) element.setAttribute(name, translated);
  }
}

function translateTree(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) return translateNode(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;

  const element = root as Element;
  translateAttributes(element);
  element.querySelectorAll("[placeholder],[title],[aria-label],[alt]").forEach(translateAttributes);

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) translateNode(node as Text);
}

// Traduz a página e tudo o que nela mudar daqui em diante. Devolve como parar.
export function startTranslating(): () => void {
  document.documentElement.lang = "en";
  translateTree(document.body);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") translateNode(mutation.target as Text);
      else if (mutation.type === "attributes") translateAttributes(mutation.target as Element);
      else mutation.addedNodes.forEach(translateTree);
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRIBUTES],
  });

  return () => observer.disconnect();
}

const listeners = new Set<() => void>();
let current: Language = "pt";

export function readStoredLanguage(): Language {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "pt";
  } catch {
    return "pt";
  }
}

export function getLanguage(): Language {
  return current;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setCurrentLanguage(language: Language): void {
  current = language;
  listeners.forEach((listener) => listener());
}

export function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // sem armazenamento: a escolha vale só até recarregar a página
  }
}
