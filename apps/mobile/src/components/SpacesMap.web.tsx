import React, { useEffect, useMemo, useRef } from "react";

import type { SpacesMapProps } from "./SpacesMap";
import { selectionFromMessage, spacesMapHtml } from "./spacesMapHtml";
import { useT } from "@/i18n";

// A WebView não existe no browser: a versão web mostra a mesma página num iframe e ouve
// as mensagens que ela envia.
export function SpacesMap({ spaces, position, radiusKm, dark, tint, onSelect }: SpacesMapProps) {
  const t = useT();
  const frame = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => spacesMapHtml({ spaces, position, radiusKm, dark, tint }), [spaces, position, radiusKm, dark, tint]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const selection = selectionFromMessage(event.data);
      if (selection !== undefined) onSelect(selection);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [onSelect]);

  return <iframe ref={frame} srcDoc={html} title={t("Mapa dos espaços")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />;
}
