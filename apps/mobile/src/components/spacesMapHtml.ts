import type { Coordinates } from "@/services/location";
import { BRAND_MARKER_URI } from "./brandMarker";

export interface MapSpace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface SpacesMapData {
  spaces: MapSpace[];
  // Onde a pessoa está (ponto azul) e, havendo raio, o círculo da distância escolhida.
  position: Coordinates | null;
  radiusKm: number | null;
  dark: boolean;
  tint: string;
}

// Centro de Luanda: onde o mapa abre quando não há posição nem espaços para mostrar.
const DEFAULT_CENTER = [-8.839, 13.2894];

// A página do mapa de pesquisa: Leaflet com os mapas do OpenStreetMap, um marcador por
// espaço (com o ícone da agenda+) e a posição da pessoa. Tocar num marcador avisa a app com o id
// do espaço; tocar no mapa avisa que nada ficou escolhido.
export function spacesMapHtml({ spaces, position, radiusKm, dark, tint }: SpacesMapData): string {
  // "<" escapado para um nome ou imagem nunca fechar o <script> onde os dados entram.
  const data = JSON.stringify({ spaces, position, radiusKm }).replace(/</g, "\\u003c");

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
  .space {
    width: 46px; height: 46px; border-radius: 50%; box-sizing: border-box; overflow: hidden;
    border: 3px solid #fff; background: ${tint}; box-shadow: 0 3px 10px rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center;
  }
  .space.selected { border-color: ${tint}; transform: scale(1.18); }
  .space img { width: 100%; height: 100%; object-fit: cover; display: block; }
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
  var BRAND = '<img alt="agenda+" src="${BRAND_MARKER_URI}" />';

  function send(message) {
    var text = JSON.stringify(message);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else if (window.parent !== window) window.parent.postMessage(text, "*");
  }

  var map = L.map("map", { zoomControl: false }).setView(${JSON.stringify(DEFAULT_CENTER)}, 12);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  var bounds = [];
  var selected = null;
  var markers = [];

  data.spaces.forEach(function (space) {
    var element = document.createElement("div");
    element.className = "space";
    // Todos os espaços levam o ícone da agenda+; o logótipo de cada um vê-se no cartão.
    element.innerHTML = BRAND;

    var marker = L.marker([space.latitude, space.longitude], {
      title: space.name,
      icon: L.divIcon({ className: "", iconSize: [46, 46], iconAnchor: [23, 23], html: element })
    }).addTo(map);

    marker.on("click", function (event) {
      L.DomEvent.stopPropagation(event);
      if (selected) selected.classList.remove("selected");
      selected = element;
      element.classList.add("selected");
      send({ type: "space", id: space.id });
    });
    bounds.push([space.latitude, space.longitude]);
    markers.push({ marker: marker, at: L.latLng(space.latitude, space.longitude) });
  });

  // Espaços no mesmo sítio (ou tão perto que, a este zoom, os marcadores ficavam uns por
  // cima dos outros) abrem-se em roda à volta do ponto, para se verem todos de uma vez.
  var SPACING = 52;
  function spread() {
    var zoom = map.getZoom();
    var points = markers.map(function (entry) { return map.project(entry.at, zoom); });
    var group = markers.map(function (_, index) { return index; });
    function root(index) {
      while (group[index] !== index) index = group[index];
      return index;
    }
    for (var a = 0; a < points.length; a++) {
      for (var b = a + 1; b < points.length; b++) {
        if (points[a].distanceTo(points[b]) < SPACING) group[root(a)] = root(b);
      }
    }

    var groups = {};
    markers.forEach(function (_, index) {
      var key = root(index);
      (groups[key] = groups[key] || []).push(index);
    });

    Object.keys(groups).forEach(function (key) {
      var members = groups[key];
      if (members.length === 1) {
        markers[members[0]].marker.setLatLng(markers[members[0]].at);
        return;
      }
      var center = members.reduce(function (sum, index) { return sum.add(points[index]); }, L.point(0, 0)).divideBy(members.length);
      var radius = SPACING / (2 * Math.sin(Math.PI / members.length));
      members.forEach(function (index, order) {
        var angle = (2 * Math.PI * order) / members.length - Math.PI / 2;
        var point = center.add([radius * Math.cos(angle), radius * Math.sin(angle)]);
        markers[index].marker.setLatLng(map.unproject(point, zoom));
      });
    });
  }
  map.on("zoomend", spread);

  map.on("click", function () {
    if (selected) selected.classList.remove("selected");
    selected = null;
    send({ type: "none" });
  });

  if (data.position) {
    var me = [data.position.latitude, data.position.longitude];
    L.marker(me, { interactive: false, icon: L.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11], html: '<div class="me"></div>' }) }).addTo(map);
    bounds.push(me);

    if (data.radiusKm) {
      var circle = L.circle(me, {
        radius: data.radiusKm * 1000, color: "${tint}", weight: 1.5, fillColor: "${tint}", fillOpacity: 0.08, interactive: false
      }).addTo(map);
      // Com raio, o mapa enquadra o círculo todo: é a zona onde se está a procurar.
      bounds = [circle.getBounds().getSouthWest(), circle.getBounds().getNorthEast()];
    }
  }

  if (bounds.length === 1) map.setView(bounds[0], 15);
  else if (bounds.length > 1) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  spread();
</script>
</body>
</html>`;
}

// O que a página do mapa envia: {type: "space", id} ou {type: "none"}. Fica aqui, e não
// em SpacesMap, porque no browser "./SpacesMap" é o próprio SpacesMap.web.
export function selectionFromMessage(text: unknown): string | null | undefined {
  try {
    const message = JSON.parse(String(text)) as { type?: string; id?: string };
    if (message.type === "space" && message.id) return message.id;
    if (message.type === "none") return null;
  } catch {
    // não é uma mensagem do mapa
  }
  return undefined;
}
