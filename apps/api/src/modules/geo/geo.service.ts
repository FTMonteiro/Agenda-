import { normalizeText, type PlaceDTO, type ProvinceDTO, type ZoneDTO } from "@slotix/types";
import { env } from "../../config/env";
import { AppError } from "../../shared/errors";
import { nominatim, photon, type PhotonFeature } from "./geo.client";

// Only the fields used below; Nominatim's `address` has many more, all optional, and
// which ones are filled depends on how the place was mapped.
interface NominatimPlace {
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string | undefined>;
  error?: string;
}

// Businesses are only in Angola for now.
const COUNTRY_CODES = "ao";

// Coordinates are rounded so that pins a few metres apart share one cached answer.
const round = (value: number, digits: number) => Number(value.toFixed(digits));

// "Província de Luanda" and "Luanda" are the same province: keep the bare name, so
// businesses mapped either way group together.
function provinceName(state: string | undefined): string | null {
  return (
    state
      // OpenStreetMap has some names with decomposed accents ("i" + combining accent).
      ?.normalize("NFC")
      .replace(/^prov[ií]ncia\s+(de|do|da)\s+/i, "")
      .replace(/\s+province$/i, "")
      .trim() || null
  );
}

// Same for "Município do Talatona" → "Talatona".
function municipalityName(name: string | null): string | null {
  return name?.normalize("NFC").replace(/^munic[ií]pio\s+(de|do|da)\s+/i, "").trim() || null;
}

function toPlace(place: NominatimPlace): PlaceDTO {
  const address = place.address ?? {};
  const first = (...keys: string[]) => keys.map((key) => address[key]).find(Boolean) ?? null;

  const provincia = provinceName(address.state ?? address.region);
  const municipio = municipalityName(first("county", "municipality", "city", "town"));
  // OpenStreetMap files Luanda's urban districts under whichever key the mapper picked
  // (often "suburb"): one named "Distrito ..." is the district, not the bairro.
  const areas = ["suburb", "neighbourhood", "quarter", "city_district", "district", "village", "hamlet"]
    .map((key) => address[key]?.normalize("NFC"))
    .filter((value): value is string => Boolean(value));
  // ...and sometimes it is only in the full address line, not in any key at all.
  const named = [...areas, ...place.display_name.normalize("NFC").split(/\s*,\s*/)].find((value) => /^distrito\b/i.test(value));
  const distrito = named ?? first("city_district", "district")?.normalize("NFC") ?? null;
  // A bairro equal to the município adds nothing ("Talatona, Talatona"): take the next one.
  const bairro =
    areas.find((value) => value !== distrito && normalizeText(value) !== normalizeText(municipio ?? "")) ?? null;
  const road = [address.road, address.house_number].filter(Boolean).join(" ");
  // No street at that point: the place's own name ("Shopping Avennida") is still a
  // better first line than nothing, as long as it isn't just the region again.
  const name = place.name && ![provincia, municipio, bairro].includes(place.name) ? place.name : "";

  return {
    displayName: place.display_name,
    street: road || name,
    bairro,
    distrito,
    municipio,
    provincia,
    latitude: round(Number(place.lat), 6),
    longitude: round(Number(place.lon), 6),
  };
}

// Photon answers with the same OpenStreetMap data under other names: put it in
// Nominatim's shape so toPlace reads both the same way.
function fromPhoton(feature: PhotonFeature): NominatimPlace {
  const p = feature.properties;
  const [lon, lat] = feature.geometry.coordinates;
  const road = [p.street, p.housenumber].filter(Boolean).join(" ");
  const parts = [p.name, road, p.locality, p.district, p.city, p.county, p.state, p.country].filter(
    (part, index, all): part is string => Boolean(part) && all.indexOf(part) === index,
  );

  return {
    lat: String(lat),
    lon: String(lon),
    name: p.name,
    display_name: parts.join(", "),
    address: {
      road: p.street,
      house_number: p.housenumber,
      suburb: p.district ?? p.locality,
      neighbourhood: p.district ? p.locality : undefined,
      city: p.city,
      county: p.county,
      state: p.state,
      country_code: p.countrycode?.toLowerCase(),
    },
  };
}

// Angola, roughly: keeps Photon's search (which has no country filter) inside it.
const ANGOLA_BBOX = "11.4,-18.1,24.1,-4.3";

// Nominatim first; Photon when it fails. Only when both fail does the caller see an error.
async function eitherProvider<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    return fallback().catch(() => {
      throw error;
    });
  }
}

// Angola's provinces are its admin_level 4 boundaries in OpenStreetMap. The set changes
// maybe once a decade, so one answer is kept for a month — and an expired one is still
// served if Overpass is down, rather than leaving every province picker empty.
const PROVINCES_QUERY =
  '[out:json][timeout:60];area["ISO3166-1"="AO"][admin_level=2]->.a;relation(area.a)["boundary"="administrative"]["admin_level"="4"];out tags center;';
const PROVINCES_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string | undefined>;
}

// The public Overpass server turns requests away when it's busy (429/504), usually only
// for a few seconds: one more try is enough to ride that out.
async function overpass(query: string): Promise<OverpassElement[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await fetch(env.OVERPASS_URL, {
        method: "POST",
        headers: { "User-Agent": env.NOMINATIM_USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }).toString(),
        signal: AbortSignal.timeout(100_000),
      });
      if (!response.ok) throw new Error(`Overpass respondeu ${response.status}`);
      const body = (await response.json()) as { elements: OverpassElement[]; remark?: string };
      // A query cut short (server busy, timeout) still answers 200, with whatever it had
      // and a remark saying so: that is a failure, not a short list.
      if (body.remark) throw new Error(`Overpass: ${body.remark}`);
      return body.elements;
    } catch (error) {
      if (attempt >= 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// osmId is the province's boundary relation — how its places are looked up afterwards.
// The built-in list below has none: its provinces have no zones until Overpass answers.
type Province = ProvinceDTO & { osmId?: number };

// The 21 provinces (2024 division) at their capitals: what the province picker shows when
// Overpass has never answered since the API started — it is often down, and an empty
// picker (or an error) is worse than a list that is a few km off-centre.
const BUILT_IN_PROVINCES: Province[] = [
  { name: "Bengo", latitude: -8.578, longitude: 13.664 },
  { name: "Benguela", latitude: -12.578, longitude: 13.407 },
  { name: "Bié", latitude: -12.383, longitude: 16.933 },
  { name: "Cabinda", latitude: -5.55, longitude: 12.2 },
  { name: "Cuando", latitude: -15.79, longitude: 20.36 },
  { name: "Cuanza Norte", latitude: -9.297, longitude: 14.911 },
  { name: "Cuanza Sul", latitude: -11.206, longitude: 13.844 },
  { name: "Cubango", latitude: -14.658, longitude: 17.691 },
  { name: "Cunene", latitude: -17.067, longitude: 15.733 },
  { name: "Huambo", latitude: -12.776, longitude: 15.739 },
  { name: "Huíla", latitude: -14.917, longitude: 13.493 },
  { name: "Icolo e Bengo", latitude: -9.108, longitude: 13.708 },
  { name: "Luanda", latitude: -8.839, longitude: 13.289 },
  { name: "Lunda Norte", latitude: -7.38, longitude: 20.83 },
  { name: "Lunda Sul", latitude: -9.66, longitude: 20.39 },
  { name: "Malanje", latitude: -9.545, longitude: 16.341 },
  { name: "Moxico", latitude: -11.783, longitude: 19.917 },
  { name: "Moxico Leste", latitude: -11.88, longitude: 22.91 },
  { name: "Namibe", latitude: -15.196, longitude: 12.152 },
  { name: "Uíge", latitude: -7.609, longitude: 15.061 },
  { name: "Zaire", latitude: -6.267, longitude: 14.25 },
];

let provinces: { fetchedAt: number; value: Province[] } | null = null;
let loadingProvinces: Promise<Province[]> | null = null;

async function fetchProvinces(): Promise<Province[]> {
  const found = (await overpass(PROVINCES_QUERY))
    .map((element) => ({
      osmId: element.id,
      // The same cleaned-up name a business gets from its pin, so the two always match.
      name: provinceName(element.tags?.["name:pt"] ?? element.tags?.name),
      latitude: element.center?.lat,
      longitude: element.center?.lon,
    }))
    .filter((item): item is Province & { osmId: number } => Boolean(item.name) && item.latitude !== undefined && item.longitude !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name, "pt"));

  if (found.length === 0) throw new Error("Overpass não devolveu províncias");
  return found;
}

// The named places inside a province — its towns, bairros and neighbourhoods — as mapped
// in OpenStreetMap. Cached per province like the province list itself.
const zones = new Map<string, { fetchedAt: number; value: ZoneDTO[] }>();

async function fetchZones(province: Province & { osmId: number }): Promise<ZoneDTO[]> {
  const elements = await overpass(
    `[out:json][timeout:90];relation(${province.osmId});map_to_area->.p;` +
      `node(area.p)["place"~"^(city|town|suburb|quarter|neighbourhood|village)$"]["name"];out;`,
  );

  // Several nodes can share a name (two "Benfica" in one province): the first one stands.
  const byName = new Map<string, ZoneDTO>();
  for (const element of elements) {
    const name = (element.tags?.["name:pt"] ?? element.tags?.name)?.normalize("NFC").trim();
    if (!name || element.lat === undefined || element.lon === undefined) continue;
    if (normalizeText(name) === normalizeText(province.name)) continue;
    if (!byName.has(normalizeText(name))) byName.set(normalizeText(name), { name, latitude: element.lat, longitude: element.lon });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

async function loadProvinces(): Promise<Province[]> {
  if (provinces && Date.now() - provinces.fetchedAt < PROVINCES_TTL_MS) return provinces.value;

  // Concurrent callers share the one request instead of each hitting Overpass.
  loadingProvinces ??= fetchProvinces().finally(() => {
    loadingProvinces = null;
  });

  try {
    provinces = { fetchedAt: Date.now(), value: await loadingProvinces };
    return provinces.value;
  } catch (error) {
    console.error("Overpass falhou (províncias):", error instanceof Error ? error.message : error);
    return provinces?.value ?? BUILT_IN_PROVINCES;
  }
}

export const geoService = {
  // null when `name` isn't one of Angola's provinces — which also keeps arbitrary text
  // from ever reaching Overpass.
  async zones(name: string): Promise<ZoneDTO[] | null> {
    const province = (await loadProvinces()).find((item) => normalizeText(item.name) === normalizeText(name));
    if (!province) return null;
    if (province.osmId === undefined) {
      throw new AppError("GEO_UNAVAILABLE", "O serviço de mapas não respondeu. Tente outra vez dentro de momentos.", 502);
    }

    const cached = zones.get(province.name);
    if (cached && Date.now() - cached.fetchedAt < PROVINCES_TTL_MS) return cached.value;

    try {
      const value = await fetchZones({ ...province, osmId: province.osmId });
      // An empty answer isn't kept: a province with nothing mapped is asked again later.
      if (value.length > 0) zones.set(province.name, { fetchedAt: Date.now(), value });
      return value;
    } catch {
      if (cached) return cached.value;
      throw new AppError("GEO_UNAVAILABLE", "O serviço de mapas não respondeu. Tente outra vez dentro de momentos.", 502);
    }
  },

  async provinces(): Promise<ProvinceDTO[]> {
    return (await loadProvinces()).map(({ name, latitude, longitude }) => ({ name, latitude, longitude }));
  },

  async search(query: string): Promise<PlaceDTO[]> {
    const places = await eitherProvider(
      () => nominatim<NominatimPlace[]>("/search", { q: query.toLowerCase(), countrycodes: COUNTRY_CODES, limit: "5" }),
      async () =>
        (await photon("/api", { q: query.toLowerCase(), bbox: ANGOLA_BBOX, limit: "5" }))
          .filter((feature) => feature.properties.countrycode?.toLowerCase() === COUNTRY_CODES)
          .map(fromPhoton),
    );
    return places.map(toPlace);
  },

  // null when OpenStreetMap has nothing at that point (open sea, outside the country).
  async reverse(latitude: number, longitude: number): Promise<PlaceDTO | null> {
    const lat = String(round(latitude, 4));
    const lon = String(round(longitude, 4));
    const place = await eitherProvider(
      () => nominatim<NominatimPlace>("/reverse", { lat, lon, zoom: "18" }),
      async () => {
        const [nearest] = await photon("/reverse", { lat, lon });
        return nearest ? fromPhoton(nearest) : { lat, lon, display_name: "", error: "Unable to geocode" };
      },
    );
    if (place.error || place.address?.country_code !== COUNTRY_CODES) return null;

    // The lookup was rounded for the cache; the answer keeps the exact point asked for.
    return { ...toPlace(place), latitude: round(latitude, 6), longitude: round(longitude, 6) };
  },
};
