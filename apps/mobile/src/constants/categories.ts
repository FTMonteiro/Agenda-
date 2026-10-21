import type Ionicons from "@expo/vector-icons/Ionicons";
import { BUSINESS_CATEGORIES, type BusinessCategory } from "@slotix/types";

type IconName = keyof typeof Ionicons.glyphMap;

// A lista de tipos de espaço é partilhada com o painel — vive em @slotix/types. Aqui fica
// só o que é da app: a fotografia de cada um (assets/images/categories), e o ícone e a
// cor para os sítios onde não cabe uma imagem.
const CATEGORY_STYLE: Record<BusinessCategory, { icon: IconName; color: string; image: number }> = {
  Barbearia: { icon: "cut", color: "#2E67B3", image: require("../../assets/images/categories/barbearia.jpg") },
  Salão: { icon: "sparkles", color: "#AF52DE", image: require("../../assets/images/categories/salao.jpg") },
  Nails: { icon: "color-palette", color: "#FF2D55", image: require("../../assets/images/categories/nails.jpg") },
  SPA: { icon: "water", color: "#30B0C7", image: require("../../assets/images/categories/spa.jpg") },
  Estética: { icon: "flower", color: "#FF9500", image: require("../../assets/images/categories/estetica.jpg") },
  Tranças: { icon: "ribbon", color: "#A2845E", image: require("../../assets/images/categories/trancas.jpg") },
  Maquilhagem: { icon: "brush", color: "#FF375F", image: require("../../assets/images/categories/maquilhagem.jpg") },
  "Pestanas e sobrancelhas": { icon: "eye", color: "#5856D6", image: require("../../assets/images/categories/pestanas.jpg") },
  Depilação: { icon: "leaf", color: "#34C759", image: require("../../assets/images/categories/depilacao.jpg") },
  Massagens: { icon: "hand-left", color: "#00C7BE", image: require("../../assets/images/categories/massagens.jpg") },
  "Tatuagem e piercing": { icon: "color-wand", color: "#636366", image: require("../../assets/images/categories/tatuagem.jpg") },
  "Pet shop": { icon: "paw", color: "#FFCC00", image: require("../../assets/images/categories/petshop.jpg") },
};

// "Todos" não tem fotografia.
export type CategoryOption = { name: string; icon: IconName; color: string; image?: number };

export const CATEGORIES: CategoryOption[] = BUSINESS_CATEGORIES.map((name) => ({ name, ...CATEGORY_STYLE[name] }));

// "Todos" só existe na app: quer dizer "sem filtro de categoria".
export const ALL_CATEGORIES = "Todos";

export const CATEGORY_FILTERS: CategoryOption[] = [{ name: ALL_CATEGORIES, icon: "apps", color: "#8E8E93" }, ...CATEGORIES];
