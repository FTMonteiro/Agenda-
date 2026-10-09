import React, { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

import type { Coordinates } from "@/services/location";
import { spaceMapHtml } from "./spaceMapHtml";
import { useT } from "@/i18n";

export interface SpaceMapProps {
  coordinates: Coordinates;
  title: string;
  height: number;
  dark: boolean;
  onPress: () => void;
}

/**
 * Mapa do OpenStreetMap com o pin do espaço, mostrado numa WebView para não exigir um
 * módulo de mapas nativo. Quem usa só conhece estas props: trocar por um mapa nativo
 * (MapLibre) é substituir este ficheiro, sem tocar nos ecrãs.
 */
export function SpaceMap({ coordinates, title, height, dark, onPress }: SpaceMapProps) {
  const t = useT();
  const { latitude, longitude } = coordinates;
  const html = useMemo(() => spaceMapHtml({ latitude, longitude }, dark), [latitude, longitude, dark]);

  return (
    <View style={{ height }} accessibilityLabel={t("Mapa com a localização de {0}", [title])}>
      <WebView
        source={{ html }}
        originWhitelist={["*"]}
        // O servidor de mapas do OpenStreetMap pede que a aplicação se identifique.
        applicationNameForUserAgent="AgendaPlus/1.0"
        onMessage={onPress}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        setSupportMultipleWindows={false}
        style={{ backgroundColor: "transparent" }}
      />
    </View>
  );
}
