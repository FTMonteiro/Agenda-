import {
  distanceBetweenKm,
  normalizeText,
  sameLocality,
  type BusinessDTO,
  type LocalityDTO,
  type PlaceDTO,
  type ProvinceDTO,
  type ZoneDTO,
} from "@slotix/types";
import type { Coordinates } from "./location";
import { apiFetch } from "./api-client";
import { translate } from "@/i18n";

export type LocalityOption = { name: string; count: number };

// As localidades onde existem espaços registados (com a região que o OpenStreetMap deu
// ao ponto de cada um). É daqui que vêm as províncias e zonas que a app oferece — não há
// nenhuma lista fixa de sítios.
export async function listLocalities(): Promise<LocalityDTO[]> {
  return apiFetch<LocalityDTO[]>("/businesses/localities");
}

// Todas as províncias de Angola, tal como estão no OpenStreetMap.
export async function listProvinces(): Promise<ProvinceDTO[]> {
  return apiFetch<ProvinceDTO[]>("/geo/provinces");
}

// O que os ecrãs de escolha de localização precisam: todas as províncias e as localidades
// com espaços. Se as províncias não vierem, ficam as que têm espaços — nunca uma lista vazia.
export async function loadLocationOptions(): Promise<{ provinces: ProvinceDTO[]; localities: LocalityDTO[] }> {
  const [provinces, localities] = await Promise.all([
    listProvinces().catch(() => [] as ProvinceDTO[]),
    listLocalities().catch(() => [] as LocalityDTO[]),
  ]);
  return { provinces, localities };
}

// As cidades, bairros e zonas de uma província, com o ponto de cada um (OpenStreetMap).
export async function listZones(provincia: string): Promise<ZoneDTO[]> {
  return apiFetch<ZoneDTO[]>(`/geo/provinces/${encodeURIComponent(provincia)}/zones`);
}

// O bairro, município e província de um ponto (OpenStreetMap); null se não houver dados.
export async function reversePlace({ latitude, longitude }: Coordinates): Promise<PlaceDTO | null> {
  return apiFetch<PlaceDTO | null>(`/geo/reverse?latitude=${latitude}&longitude=${longitude}`);
}

// Um espaço conta como "desta zona" até esta distância do centro dela.
export const ZONE_RADIUS_KM = 3;

// Um espaço pertence a uma zona se o seu bairro ou município tem esse nome, ou se o ponto
// marcado pelo dono fica perto do centro da zona — os nomes nem sempre coincidem entre o
// que o mapa dá ao ponto e o nome por que a zona é conhecida, as coordenadas não enganam.
export function spaceInZone(space: BusinessDTO, zona: string, center: Coordinates | null): boolean {
  if (sameLocality(space.bairro, zona) || sameLocality(space.municipio, zona)) return true;
  if (!center || space.latitude === null || space.longitude === null) return false;
  return distanceBetweenKm(center, { latitude: space.latitude, longitude: space.longitude }) <= ZONE_RADIUS_KM;
}

export type ZoneOption = { name: string; count: number; center: Coordinates | null };

// As zonas a oferecer numa província: todas as do mapa, mais as que só existem como nome
// num espaço; cada uma com o número de espaços que lá ficam. Primeiro as que têm espaços.
export function zoneOptions(zones: ZoneDTO[], localities: LocalityDTO[], provincia: string | null, spaces: BusinessDTO[]): ZoneOption[] {
  const byName = new Map<string, ZoneOption>();
  for (const zone of zones) {
    byName.set(normalizeText(zone.name), { name: zone.name, count: 0, center: { latitude: zone.latitude, longitude: zone.longitude } });
  }
  for (const item of zonasOf(localities, provincia)) {
    if (!byName.has(normalizeText(item.name))) byName.set(normalizeText(item.name), { name: item.name, count: 0, center: null });
  }

  return [...byName.values()]
    .map((option) => ({ ...option, count: spaces.filter((space) => spaceInZone(space, option.name, option.center)).length }))
    .sort((a, b) => Number(b.count > 0) - Number(a.count > 0) || b.count - a.count || a.name.localeCompare(b.name, "pt"));
}

function tally(entries: { name: string | null; count: number }[]): LocalityOption[] {
  const byName = new Map<string, LocalityOption>();
  for (const { name, count } of entries) {
    if (!name) continue;
    const key = normalizeText(name);
    byName.set(key, { name: byName.get(key)?.name ?? name, count: (byName.get(key)?.count ?? 0) + count });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

// Todas as províncias, cada uma com o número de espaços que lá existem (0 se nenhum).
export function provinciasOf(localities: LocalityDTO[], provinces: ProvinceDTO[] = []): LocalityOption[] {
  return tally([
    ...provinces.map((item) => ({ name: item.name, count: 0 })),
    ...localities.map((item) => ({ name: item.provincia, count: item.count })),
  ]);
}

export function countLabel(count: number): string {
  return count === 0 ? translate("Sem espaços") : count === 1 ? translate("1 espaço") : translate("{0} espaços", [count]);
}

// As zonas de uma província: os municípios e os bairros onde há espaços, numa só lista
// (quem procura "Talatona" não quer saber se é município ou bairro).
export function zonasOf(localities: LocalityDTO[], provincia: string | null): LocalityOption[] {
  if (!provincia) return [];
  const target = normalizeText(provincia);

  return tally(
    localities
      .filter((item) => normalizeText(item.provincia) === target)
      .flatMap((item) => {
        const sameName = item.municipio && item.bairro && normalizeText(item.municipio) === normalizeText(item.bairro);
        return [
          { name: item.municipio, count: item.count },
          { name: sameName ? null : item.bairro, count: item.count },
        ];
      })
      .filter((item) => item.name && normalizeText(item.name) !== target),
  );
}
