import React, { useMemo } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

import { selectionFromMessage, spacesMapHtml, type SpacesMapData } from "./spacesMapHtml";

export interface SpacesMapProps extends SpacesMapData {
  // O id do espaço cujo marcador foi tocado, ou null ao tocar no mapa.
  onSelect: (spaceId: string | null) => void;
}

/**
 * Mapa do OpenStreetMap com um marcador por espaço, numa WebView como o SpaceMap: não
 * exige um módulo de mapas nativo, e trocar por um é substituir só este ficheiro.
 */
export function SpacesMap({ spaces, position, radiusKm, dark, tint, onSelect }: SpacesMapProps) {
  const html = useMemo(() => spacesMapHtml({ spaces, position, radiusKm, dark, tint }), [spaces, position, radiusKm, dark, tint]);

  return (
    <WebView
      source={{ html }}
      originWhitelist={["*"]}
      // O servidor de mapas do OpenStreetMap pede que a aplicação se identifique.
      applicationNameForUserAgent="AgendaPlus/1.0"
      onMessage={(event) => {
        const selection = selectionFromMessage(event.nativeEvent.data);
        if (selection !== undefined) onSelect(selection);
      }}
      bounces={false}
      overScrollMode="never"
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      setSupportMultipleWindows={false}
      style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]}
    />
  );
}
