import { normalizeText } from "./locations";

/*
 * Tipos de espaço, partilhados pelo painel, pela API e pela app. O dono escolhe um ao
 * criar a conta (e pode mudá-lo nas configurações); é por ele que a app arruma o espaço
 * nas categorias. Basta acrescentar nomes a esta lista — o nome é guardado tal e qual em
 * Business.category.
 */
export const BUSINESS_CATEGORIES = [
  "Barbearia",
  "Salão",
  "Nails",
  "SPA",
  "Estética",
  "Tranças",
  "Maquilhagem",
  "Pestanas e sobrancelhas",
  "Depilação",
  "Massagens",
  "Tatuagem e piercing",
  "Pet shop",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

// Texto de ajuda mostrado ao dono quando escolhe o tipo de espaço.
export const BUSINESS_CATEGORY_DESCRIPTIONS: Record<BusinessCategory, string> = {
  Barbearia: "Cortes, barba e cuidados masculinos",
  Salão: "Salão de beleza e cabeleireiro",
  Nails: "Manicure, pedicure e unhas de gel",
  SPA: "Spa, relaxamento e bem-estar",
  Estética: "Tratamentos de rosto e corpo",
  Tranças: "Tranças, cabelo afro e extensões",
  Maquilhagem: "Maquilhagem para eventos e dia a dia",
  "Pestanas e sobrancelhas": "Extensão de pestanas e design de sobrancelhas",
  Depilação: "Depilação a cera, linha ou laser",
  Massagens: "Massagens terapêuticas e de relaxamento",
  "Tatuagem e piercing": "Estúdio de tatuagem e piercing",
  "Pet shop": "Banho, tosquia e cuidados para animais",
};

// O nome da lista para um texto escrito de outra forma ("barbearia", "Salao"), ou null se
// não for nenhum deles.
export function matchBusinessCategory(value: string | null | undefined): BusinessCategory | null {
  if (!value) return null;
  const normalized = normalizeText(value);
  return BUSINESS_CATEGORIES.find((category) => normalizeText(category) === normalized) ?? null;
}
