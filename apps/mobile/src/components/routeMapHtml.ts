import type { Coordinates } from "@/services/location";
import { BRAND_MARKER_URI } from "./brandMarker";

export interface RouteMapData {
  destination: Coordinates;
  name: string;
  // Onde a pessoa está (ponto azul) e o caminho até ao espaço, quando já se conhecem.
  position: Coordinates | null;
  path: [number, number][] | null;
  dark: boolean;
  tint: string;
}

// A página do caminho até um espaço: Leaflet com os mapas do OpenStreetMap, a linha do
// caminho, a posição da pessoa e, no fim, o pin com o ícone da agenda+ — para se ver que
// aquele destino é um espaço da agenda+ e não um dos outros sítios do mapa.
export function routeMapHtml({ destination, name, position, path, dark, tint }: RouteMapData): string {
  // "<" escapado para o nome nunca fechar o <script> onde os dados entram.
  const data = JSON.stringify({ destination, name, position, path }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; background: ${dark ? "#1c1c1e" : "#e5e5ea"}; }
  ${dark ? ".leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9); }" : ""}
  .leaflet-control-attribution { font-size: 9px; }
  .brand { position: relative; width: 54px; height: 66px; }
  .brand .badge {
    position: absolute; top: 0; left: 0; width: 54px; height: 54px; border-radius: 50%;
    box-sizing: border-box; overflow: hidden; border: 3px solid #fff; background: ${tint};
    box-shadow: 0 4px 12px rgba(0,0,0,0.35); z-index: 1;
  }
  .brand .badge img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .brand .tip {
    position: absolute; left: 50%; bottom: 0; width: 18px; height: 18px; margin-left: -9px;
    background: #fff; transform: rotate(45deg); border-radius: 0 0 4px 0;
    box-shadow: 3px 3px 6px rgba(0,0,0,0.2);
  }
  .label {
    background: ${dark ? "#2c2c2e" : "#fff"}; color: ${dark ? "#fff" : "#000"}; border: 0;
    border-radius: 8px; padding: 4px 8px; font: 600 12px -apple-system, system-ui, sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .label::before { display: none; }
  .me {
    width: 16px; height: 16px; border-radius: 50%; background: ${tint};
    border: 3px solid #fff; box-shadow: 0 0 0 6px ${tint}33;
  }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var data = ${data};
  var end = [data.destination.latitude, data.destination.longitude];

  var map = L.map("map", { zoomControl: false }).setView(end, 16);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  var bounds = [end];

  if (data.path && data.path.length > 1) {
    // Um contorno por baixo da linha, para o caminho se ler sobre qualquer rua.
    L.polyline(data.path, { color: "#fff", weight: 9, opacity: 0.9, interactive: false }).addTo(map);
    L.polyline(data.path, { color: "${tint}", weight: 5, interactive: false }).addTo(map);
    // Do fim do caminho (a rua mais próxima) até ao ponto exacto do espaço, a tracejado.
    L.polyline([data.path[data.path.length - 1], end], { color: "${tint}", weight: 3, dashArray: "4 6", interactive: false }).addTo(map);
    bounds = bounds.concat(data.path);
  }

  if (data.position) {
    var me = [data.position.latitude, data.position.longitude];
    L.marker(me, { interactive: false, icon: L.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11], html: '<div class="me"></div>' }) }).addTo(map);
    bounds.push(me);
  }

  var brand = document.createElement("div");
  brand.className = "brand";
  brand.innerHTML = '<div class="tip"></div><div class="badge"><img alt="agenda+" src="${BRAND_MARKER_URI}" /></div>';
  L.marker(end, {
    interactive: false,
    zIndexOffset: 1000,
    icon: L.divIcon({ className: "", iconSize: [54, 66], iconAnchor: [27, 64], html: brand })
  })
    .bindTooltip(document.createTextNode(data.name), { permanent: true, direction: "top", offset: [0, -66], className: "label" })
    .addTo(map);

  if (bounds.length > 1) map.fitBounds(bounds, { paddingTopLeft: [48, 110], paddingBottomRight: [48, 230], maxZoom: 17 });
</script>
</body>
</html>`;
}
