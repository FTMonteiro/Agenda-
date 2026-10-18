import React, { useMemo } from "react";

import type { RouteMapProps } from "./RouteMap";
import { routeMapHtml } from "./routeMapHtml";
import { useT } from "@/i18n";

// A WebView não existe no browser: a versão web mostra a mesma página num iframe.
export function RouteMap({ destination, name, position, path, dark, tint }: RouteMapProps) {
  const t = useT();
  const html = useMemo(
    () => routeMapHtml({ destination, name, position, path, dark, tint }),
    [destination, name, position, path, dark, tint],
  );

  return (
    <iframe
      srcDoc={html}
      title={t("Caminho até {0}", [name])}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
    />
  );
}
