import type { BusinessCategory } from "@slotix/types";

// A fotografia de cada tipo de espaço (public/categories), as mesmas que a app mostra.
const FILES: Record<BusinessCategory, string> = {
  Barbearia: "barbearia",
  Salão: "salao",
  Nails: "nails",
  SPA: "spa",
  Estética: "estetica",
  Tranças: "trancas",
  Maquilhagem: "maquilhagem",
  "Pestanas e sobrancelhas": "pestanas",
  Depilação: "depilacao",
  Massagens: "massagens",
  "Tatuagem e piercing": "tatuagem",
  "Pet shop": "petshop",
};

export function categoryImage(category: BusinessCategory): string {
  return `/categories/${FILES[category]}.jpg`;
}
