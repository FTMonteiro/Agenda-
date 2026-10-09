import { useThemePreference, type ThemeScheme } from "@/contexts/ThemeContext";

// O tema em uso ("light" ou "dark"), já resolvido a partir da escolha da pessoa
// (Claro / Escuro / Sistema). Todo o código que precisa do tema passa por aqui.
export function useColorScheme(): ThemeScheme {
  return useThemePreference().scheme;
}
