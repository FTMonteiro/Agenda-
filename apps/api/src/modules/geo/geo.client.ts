import { env } from "../../config/env";
import { AppError } from "../../shared/errors";

// The public Nominatim server's usage policy: at most 1 request per second, an
// identifying User-Agent, and results must be cached. All three are enforced here, in
// the one place that talks to it — nothing else in the API (and no client) calls it.
const MIN_INTERVAL_MS = 1100;
const TIMEOUT_MS = 10_000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 1000;

const cache = new Map<string, { expiresAt: number; value: unknown }>();

// Requests wait in line behind this promise, so concurrent callers are spaced out
// instead of hitting Nominatim together.
let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function remember(key: string, value: unknown): void {
  // Map keeps insertion order: the first key is the oldest entry.
  if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
}

async function request(path: string, params: Record<string, string>): Promise<unknown> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();

  const url = new URL(path, env.NOMINATIM_URL);
  url.search = new URLSearchParams({
    ...params,
    format: "jsonv2",
    addressdetails: "1",
    "accept-language": "pt",
    ...(env.NOMINATIM_EMAIL ? { email: env.NOMINATIM_EMAIL } : {}),
  }).toString();

  const response = await fetch(url, {
    headers: { "User-Agent": env.NOMINATIM_USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Nominatim respondeu ${response.status}`);
  return response.json();
}

export async function nominatim<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = `${path}?${new URLSearchParams(params).toString()}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;

  const result = queue.then(() => request(path, params));
  // A failed request must not block the ones queued behind it.
  queue = result.catch(() => undefined);

  try {
    const value = await result;
    remember(key, value);
    return value as T;
  } catch (error) {
    // Why it failed (403 from a blocked address, 429, timeout) only shows up in the log.
    console.error("Nominatim falhou:", error instanceof Error ? error.message : error);
    throw new AppError("GEO_UNAVAILABLE", "O serviço de mapas não respondeu. Tente outra vez dentro de momentos.", 502);
  }
}

// Photon (komoot) — the same OpenStreetMap data, served by another host. Used only when
// Nominatim fails: the public Nominatim server often turns away requests from cloud
// providers' addresses, which left the settings map with no search and no address.
const PHOTON_URL = "https://photon.komoot.io";

export interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | undefined>;
}

export async function photon(path: "/api" | "/reverse", params: Record<string, string>): Promise<PhotonFeature[]> {
  const key = `photon:${path}?${new URLSearchParams(params).toString()}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as PhotonFeature[];

  try {
    const url = new URL(path, PHOTON_URL);
    url.search = new URLSearchParams(params).toString();
    const response = await fetch(url, {
      headers: { "User-Agent": env.NOMINATIM_USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Photon respondeu ${response.status}`);
    const features = ((await response.json()) as { features?: PhotonFeature[] }).features ?? [];
    remember(key, features);
    return features;
  } catch (error) {
    console.error("Photon falhou:", error instanceof Error ? error.message : error);
    throw new AppError("GEO_UNAVAILABLE", "O serviço de mapas não respondeu. Tente outra vez dentro de momentos.", 502);
  }
}
