/*
 * Ajudas de localização partilhadas pela app e pelo painel. Não há aqui nenhuma lista de
 * províncias ou bairros: a região de cada espaço vem do OpenStreetMap quando o dono marca
 * o ponto no mapa (ver BusinessDTO.provincia/municipio/bairro), e as localidades que a
 * app oferece são as que têm espaços registados (LocalityDTO).
 */

// Compara sem acentos nem maiúsculas ("Huila" = "Huíla", "luanda" = "Luanda").
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Dois nomes de localidade são o mesmo sítio, escritos de formas diferentes?
export function sameLocality(a: string | null | undefined, b: string | null | undefined): boolean {
  return Boolean(a && b) && normalizeText(a!) === normalizeText(b!);
}

// Distância em linha reta entre dois pontos, em km (fórmula de Haversine).
export function distanceBetweenKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.latitude - a.latitude);
  const dLng = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// A distância como se lê: "850 m", "2,4 km", "127 km". Abaixo de 1 km arredonda às
// dezenas de metros — o GPS não é mais exato do que isso.
export function formatDistance(distanceKm: number): string {
  const metres = Math.max(10, Math.round((distanceKm * 1000) / 10) * 10);
  if (metres < 1000) return `${metres} m`;
  if (distanceKm < 99.95) return `${distanceKm.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(distanceKm)} km`;
}

// A morada de um espaço numa linha: "Rua 5, Talatona, Luanda" (sem repetir nomes).
export function formatLocation(place: {
  address?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  provincia?: string | null;
}): string {
  const parts: string[] = [];
  for (const part of [place.address, place.bairro, place.municipio, place.provincia]) {
    const text = part?.trim();
    if (text && !parts.some((seen) => normalizeText(seen) === normalizeText(text))) parts.push(text);
  }
  return parts.join(", ");
}
