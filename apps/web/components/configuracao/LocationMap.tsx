"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { formatLocation, type PlaceDTO, type ProvinceDTO } from "@slotix/types";

// Everything the form stores about where the space is. All of it comes from the point
// chosen on the map (OpenStreetMap data) — nothing here is typed by hand.
export interface SpaceLocation {
  address: string;
  rua: string;
  bairro: string;
  distrito: string;
  municipio: string;
  provincia: string;
  latitude: number | null;
  longitude: number | null;
}

interface LocationMapProps {
  value: SpaceLocation;
  onChange: (location: SpaceLocation) => void;
}

type Point = { lat: number; lng: number };

// Centre of Luanda: where the map opens while the space has no pin yet.
const DEFAULT_CENTER: Point = { lat: -8.839, lng: 13.2894 };
const OVERVIEW_ZOOM = 12;
const PIN_ZOOM = 17;
const PROVINCE_ZOOM = 9;

// Leaflet's default marker images don't survive bundling, so the pin is drawn inline.
const PIN_HTML =
  '<svg width="34" height="42" viewBox="0 0 34 42" xmlns="http://www.w3.org/2000/svg"><path d="M17 41C17 41 32 26.5 32 16A15 15 0 0 0 2 16C2 26.5 17 41 17 41Z" fill="#2563eb" stroke="#fff" stroke-width="2"/><circle cx="17" cy="16" r="5.5" fill="#fff"/></svg>';

const round = (value: number) => Math.round(value * 1e6) / 1e6;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include", cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? "Pedido falhou.");
  return data as T;
}

export function LocationMap({ value, onChange }: LocationMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<LeafletMarker | null>(null);
  // The latest props, for the map listeners that are registered only once.
  const latest = useRef({ value, onChange });

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceDTO[] | null>(null);
  const [busy, setBusy] = useState<"search" | "locate" | "resolve" | null>(null);
  const [message, setMessage] = useState("");
  const [provinces, setProvinces] = useState<ProvinceDTO[]>([]);

  // Every province of Angola (from OpenStreetMap), to jump the map to any of them.
  useEffect(() => {
    let cancelled = false;
    fetchJson<ProvinceDTO[]>("/api/geo/provinces")
      .then((list) => {
        if (!cancelled) setProvinces(list);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    latest.current = { value, onChange };
  });

  const { latitude, longitude } = value;
  const hasPin = latitude !== null && longitude !== null;

  function showPin(position: Point, zoom: boolean) {
    if (!map.current || !marker.current) return;
    marker.current.setLatLng(position);
    if (!map.current.hasLayer(marker.current)) marker.current.addTo(map.current);
    if (zoom) map.current.setView(position, PIN_ZOOM);
  }

  // Puts the pin back where the form says it is (or hides it).
  function restorePin() {
    const saved = latest.current.value;
    if (saved.latitude === null || saved.longitude === null) marker.current?.remove();
    else showPin({ lat: saved.latitude, lng: saved.longitude }, false);
  }

  // Stores a point: the address, street, bairro, district, município and province are whatever
  // OpenStreetMap has for it. `known` skips the lookup when the point came from a search.
  async function place(position: Point, zoom: boolean, known?: PlaceDTO) {
    showPin(position, zoom);
    setMessage("");
    setBusy("resolve");

    try {
      const found =
        known ??
        (await fetchJson<PlaceDTO | null>(`/api/geo/reverse?latitude=${position.lat}&longitude=${position.lng}`));

      if (!found?.provincia) {
        restorePin();
        setMessage("Não há dados para esse ponto. Marque a localização do espaço dentro de Angola.");
        return;
      }

      latest.current.onChange({
        // The full line customers read ("Rua 5, Talatona, Luanda"), not just the street.
        address: formatLocation({ address: found.street, ...found }),
        rua: found.street,
        bairro: found.bairro ?? "",
        distrito: found.distrito ?? "",
        municipio: found.municipio ?? "",
        provincia: found.provincia,
        latitude: round(position.lat),
        longitude: round(position.lng),
      });
    } catch (error) {
      restorePin();
      setMessage(error instanceof Error ? error.message : "Não foi possível obter a morada desse ponto.");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const L = (await import("leaflet")).default;
        if (cancelled || !container.current) return;

        const saved = latest.current.value;
        const pinned = saved.latitude !== null && saved.longitude !== null;
        const center = pinned ? { lat: saved.latitude!, lng: saved.longitude! } : DEFAULT_CENTER;

        // The page scrolls past the map: zooming is on the buttons, not the wheel.
        const created = L.map(container.current, { scrollWheelZoom: false }).setView(center, pinned ? PIN_ZOOM : OVERVIEW_ZOOM);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(created);

        const pin = L.marker(center, {
          draggable: true,
          icon: L.divIcon({ html: PIN_HTML, className: "", iconSize: [34, 42], iconAnchor: [17, 41] }),
        });
        if (pinned) pin.addTo(created);

        created.on("click", (event) => void place(event.latlng, false));
        pin.on("dragend", () => void place(pin.getLatLng(), false));

        map.current = created;
        marker.current = pin;
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // The map is created once; later prop changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The saved position arrives after the map exists (settings load asynchronously), and
  // "discard changes" moves it back: keep the pin in step with the form.
  useEffect(() => {
    if (status !== "ready" || !marker.current || !map.current) return;

    if (latitude === null || longitude === null) {
      marker.current.remove();
      return;
    }

    const shown = marker.current.getLatLng();
    if (map.current.hasLayer(marker.current) && round(shown.lat) === latitude && round(shown.lng) === longitude) return;

    showPin({ lat: latitude, lng: longitude }, true);
  }, [status, latitude, longitude]);

  async function search() {
    const text = query.trim();
    if (text.length < 3 || busy) return;

    setBusy("search");
    setMessage("");
    setResults(null);
    try {
      const found = await fetchJson<PlaceDTO[]>(`/api/geo/search?q=${encodeURIComponent(text)}`);
      if (found.length === 0) setMessage("Não encontrámos essa morada. Tente outro nome ou marque o ponto diretamente no mapa.");
      else if (found.length === 1) return void (await place({ lat: found[0].latitude, lng: found[0].longitude }, true, found[0]));
      else setResults(found);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível procurar essa morada.");
    }
    setBusy(null);
  }

  function locate() {
    if (busy) return;
    if (!navigator.geolocation) {
      setMessage("Este navegador não permite obter a localização.");
      return;
    }

    setBusy("locate");
    setMessage("");
    setResults(null);
    navigator.geolocation.getCurrentPosition(
      (position) => void place({ lat: position.coords.latitude, lng: position.coords.longitude }, true),
      () => {
        setMessage("Não foi possível obter a sua localização. Verifique a permissão do navegador.");
        setBusy(null);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const disabled = status !== "ready" || busy !== null;
  const buttonClass =
    "flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm font-medium transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50";

  const details = [
    { label: "Morada", text: value.address },
    { label: "Rua", text: value.rua },
    { label: "Bairro", text: value.bairro },
    { label: "Distrito", text: value.distrito },
    { label: "Município", text: value.municipio },
    { label: "Província", text: value.provincia },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Só move o mapa para a província; o ponto do espaço marca-se a seguir. */}
          <select
            value=""
            disabled={status !== "ready" || provinces.length === 0}
            onChange={(event) => {
              const province = provinces.find((item) => item.name === event.target.value);
              if (province) map.current?.setView({ lat: province.latitude, lng: province.longitude }, PROVINCE_ZOOM);
            }}
            aria-label="Ir para uma província"
            className="h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50 sm:w-44"
          >
            <option value="">Ir para província</option>
            {provinces.map((province) => (
              <option key={province.name} value={province.name}>
                {province.name}
              </option>
            ))}
          </select>

          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void search();
              }}
              disabled={status !== "ready"}
              className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder="Procurar a morada do espaço: rua, bairro, cidade"
            />
          </div>

          <button type="button" onClick={() => void search()} disabled={disabled || query.trim().length < 3} className={buttonClass}>
            {busy === "search" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Procurar
          </button>

          <button type="button" onClick={locate} disabled={disabled} className={buttonClass}>
            {busy === "locate" ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            Estou no espaço
          </button>
        </div>

        {/* RESULTADOS DA PESQUISA */}
        {results ? (
          <ul className="mt-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
            {results.map((result) => (
              <li key={`${result.latitude},${result.longitude}`} className="border-b border-[var(--border)] last:border-b-0">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    setResults(null);
                    void place({ lat: result.latitude, lng: result.longitude }, true, result);
                  }}
                  className="flex w-full items-start gap-2 px-4 py-3 text-left text-sm transition hover:bg-[var(--surface-secondary)]"
                >
                  <MapPin size={15} className="mt-0.5 shrink-0 text-[var(--muted)]" />
                  {result.displayName}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {/* isolate: keeps Leaflet's own z-indexes below the page's menus and dialogs */}
        <div className="relative isolate mt-3 h-80 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)]">
          <div ref={container} className="h-full w-full" />

          {status !== "ready" ? (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center gap-2 bg-[var(--surface-secondary)] px-6 text-center text-sm text-[var(--muted)]">
              {status === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  A carregar o mapa...
                </>
              ) : (
                "Não foi possível carregar o mapa. Verifique a ligação e recarregue a página."
              )}
            </div>
          ) : null}
        </div>

        {message ? <p className="mt-3 text-xs text-red-600">{message}</p> : null}

        <p className="mt-3 text-xs text-[var(--muted)]">
          Escolha a província, procure a morada ou clique no mapa, e arraste o pin
          até à porta do espaço.
        </p>
      </div>

      {/* O QUE O OPENSTREETMAP TEM PARA O PONTO */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {busy === "resolve" ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
          {hasPin ? "Localização do espaço" : "Localização não disponível"}
        </div>

        {value.provincia ? (
          <dl className="mt-4 space-y-4">
            {details.map((item) => (
              <div key={item.label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{item.label}</dt>
                <dd className="mt-1 text-sm">{item.text || "—"}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Marque o ponto no mapa: a morada, a rua, o bairro, o distrito, o município e a
            província são preenchidos a partir dele.
          </p>
        )}

        {hasPin ? (
          <p className="mt-4 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
            {latitude}, {longitude}
          </p>
        ) : value.provincia ? (
          <p className="mt-4 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
            Ainda sem ponto no mapa: marque-o para a app mostrar o mapa, a distância e
            o caminho até ao espaço.
          </p>
        ) : null}
      </div>
    </div>
  );
}
