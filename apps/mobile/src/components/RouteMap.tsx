import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

import { routeMapHtml, type RouteMapData } from "./routeMapHtml";

export type RouteMapProps = RouteMapData;

/**
 * O caminho até um espaço num mapa do OpenStreetMap, numa WebView como o SpaceMap: não
 * exige um módulo de mapas nativo, e trocar por um é substituir só este ficheiro.
 */
export function RouteMap({ destination, name, position, path, dark, tint }: RouteMapProps) {
  const html = useMemo(
    () => routeMapHtml({ destination, name, position, path, dark, tint }),
    [destination, name, position, path, dark, tint],
  );

  return (
    <WebView
      source={{ html }}
      originWhitelist={["*"]}
      // O servidor de mapas do OpenStreetMap pede que a aplicação se identifique.
      applicationNameForUserAgent="AgendaPlus/1.0"
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      setSupportMultipleWindows={false}
      style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]}
    />
  );
}
