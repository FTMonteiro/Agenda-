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
