import { Linking, Platform } from "react-native";

import type { Coordinates } from "./location";

/**
 * Abre o destino na aplicação de mapas do telemóvel, que é quem traça o caminho pelas
 * ruas — a app não desenha nenhuma rota própria. Devolve false se nada o conseguiu abrir.
 */
export async function openDirections({ latitude, longitude }: Coordinates, name: string): Promise<boolean> {
  const point = `${latitude},${longitude}`;
  const label = encodeURIComponent(name);
  // O OpenStreetMap no browser: é o que a versão web usa, e o recurso quando o telemóvel
  // não tem nenhuma aplicação de mapas.
  const browser = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;

  const native = Platform.select({
    ios: `maps://?daddr=${point}&q=${label}`,
    android: `geo:0,0?q=${point}(${label})`,
  });

  for (const url of native ? [native, browser] : [browser]) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // sem aplicação para este endereço: tenta o seguinte
    }
  }
  return false;
}

export interface Route {
  // O caminho pelas ruas, ponto a ponto, como [latitude, longitude].
  path: [number, number][];
  distanceKm: number;
  durationMin: number;
}

/**
 * O caminho de carro entre dois pontos, pedido ao OSRM (o serviço de rotas sobre o
 * OpenStreetMap, os mesmos mapas que a app mostra). Devolve null sem ligação ou sem
 * caminho possível: quem chama mostra só o destino.
 */
export async function fetchRoute(from: Coordinates, to: Coordinates): Promise<Route | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      code?: string;
      routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
    };
    const route = body.code === "Ok" ? body.routes?.[0] : undefined;
    if (!route) return null;
    return {
      path: route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
      distanceKm: route.distance / 1000,
      durationMin: Math.max(1, Math.round(route.duration / 60)),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
