import React, { useMemo } from "react";
import { Pressable } from "react-native";

import type { SpaceMapProps } from "./SpaceMap";
import { spaceMapHtml } from "./spaceMapHtml";
import { useT } from "@/i18n";

// A WebView não existe no browser: a versão web mostra a mesma página num iframe.
export function SpaceMap({ coordinates, title, height, dark, onPress }: SpaceMapProps) {
  const t = useT();
  const { latitude, longitude } = coordinates;
  const html = useMemo(() => spaceMapHtml({ latitude, longitude }, dark), [latitude, longitude, dark]);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={t("Mapa com a localização de {0}", [title])}>
      <iframe srcDoc={html} title={title} style={{ width: "100%", height, border: 0, pointerEvents: "none" }} />
    </Pressable>
  );
}
