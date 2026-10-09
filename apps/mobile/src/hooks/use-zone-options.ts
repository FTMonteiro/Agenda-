import { useEffect, useMemo, useState } from "react";
import type { BusinessDTO, LocalityDTO, ZoneDTO } from "@slotix/types";

import { listBusinesses } from "@/services/businesses";
import { listZones, zoneOptions, type ZoneOption } from "@/services/localities";

/**
 * As zonas de uma província para os ecrãs de escolha de localização: as do mapa
 * (OpenStreetMap) e quantos espaços ficam em cada uma. Se o mapa não responder, ficam as
 * zonas onde há espaços registados — a lista nunca fica vazia por causa disso.
 */
export function useZoneOptions(provincia: string | null, localities: LocalityDTO[]): { options: ZoneOption[]; loading: boolean } {
  const [zones, setZones] = useState<ZoneDTO[]>([]);
  const [spaces, setSpaces] = useState<BusinessDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setZones([]);
    setSpaces([]);
    if (!provincia) return;

    let cancelled = false;
    setLoading(true);
    Promise.all([
      listZones(provincia).catch(() => [] as ZoneDTO[]),
      listBusinesses({ provincia, limit: 100 })
        .then((result) => result.data)
        .catch(() => [] as BusinessDTO[]),
    ])
      .then(([foundZones, foundSpaces]) => {
        if (cancelled) return;
        setZones(foundZones);
        setSpaces(foundSpaces);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [provincia]);

  const options = useMemo(() => zoneOptions(zones, localities, provincia, spaces), [zones, localities, provincia, spaces]);
  return { options, loading };
}
