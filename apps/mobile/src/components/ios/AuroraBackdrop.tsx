import React from "react";
import { StyleSheet, View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

/*
 * Fundo das páginas de entrada e da pesquisa: uma cor lisa e calma, a mesma dos
 * fundos agrupados do resto da app. As luzes coloridas desfocadas que aqui havia
 * foram retiradas — distraíam do formulário e não combinavam com o painel.
 */

export function AuroraBackdrop() {
  const isDark = useColorScheme() === "dark";

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "#000000" : "#F5F5F2" }]}
    />
  );
}
