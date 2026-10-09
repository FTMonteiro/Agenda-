/**
 * Splits a free-text search query into individual lowercase words. Matching per-word
 * (rather than the whole phrase as one substring) is what lets "cortar cabelo" find a
 * service named "Corte de Cabelo" — a plain `contains` on the full phrase wouldn't,
 * since "cortar" and "corte" are different word forms. No stemming/fuzzy matching is
 * attempted; this is a deliberately light substitute for it.
 */
export function splitSearchWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)
    .slice(0, 8);
}

/** How many of `words` appear anywhere across the given text fields. */
export function countMatchingWords(words: string[], ...fields: (string | null | undefined)[]): number {
  const haystack = fields.filter((field): field is string => Boolean(field)).join(" ").toLowerCase();
  return words.filter((word) => haystack.includes(word)).length;
}
