import type { Coordinates } from "@/services/location";

// A página que o mapa mostra: Leaflet com os mapas do OpenStreetMap e um pin no espaço.
// O mapa é só para ver onde fica (não se arrasta: está dentro de uma página que desliza);
// um toque avisa a app, que abre o caminho até lá.
export function spaceMapHtml({ latitude, longitude }: Coordinates, dark: boolean): string {
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
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var point = [${latitude}, ${longitude}];
  var map = L.map("map", {
    zoomControl: false, dragging: false, touchZoom: false, doubleClickZoom: false,
    scrollWheelZoom: false, boxZoom: false, keyboard: false, tap: false
  }).setView(point, 16);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  L.marker(point, {
    interactive: false,
    icon: L.divIcon({
      className: "",
      iconSize: [34, 42],
      iconAnchor: [17, 41],
      html: '<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg"><path d="M17 41C17 41 32 26.5 32 16A15 15 0 0 0 2 16C2 26.5 17 41 17 41Z" fill="#FF3B30" stroke="#fff" stroke-width="2"/><circle cx="17" cy="16" r="5.5" fill="#fff"/></svg>'
    })
  }).addTo(map);
  document.addEventListener("click", function () {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage("press");
  });
</script>
</body>
</html>`;
}
