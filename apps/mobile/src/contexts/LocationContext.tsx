import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { distanceBetweenKm, formatLocation, sameLocality, type BusinessDTO } from "@slotix/types";

import { reversePlace, spaceInZone } from "@/services/localities";
import { getCoordinatesIfAllowed, type Coordinates } from "@/services/location";
import { saveMyLocation } from "@/services/users";
import { useAuth } from "./AuthContext";
import { usePreferences } from "./PreferencesContext";
import { useT } from "@/i18n";

// "Perto de si" mostra os espaços até esta distância da pessoa.
export const NEAR_ME_RADIUS_KM = 15;

const STORAGE_KEY = "slotix.location";

interface LocationContextValue {
  // null = todas as províncias.
  provincia: string | null;
  // A zona escolhida dentro da província: o nome de um município ou de um bairro.
  bairro: string | null;
  nearMe: boolean;
  coordinates: Coordinates | null;
  // Onde a pessoa está agora, por extenso ("Cacuaco, Luanda"); null enquanto não se sabe.
  place: string | null;
  // Falso até a pessoa escolher a sua localização pela primeira vez (ecrã a seguir ao cadastro).
  chosen: boolean;
  // Verdadeiro depois de a escolha guardada no telemóvel ter sido lida.
  loaded: boolean;
  // "Perto de si", "Talatona, Luanda", só "Luanda" ou "Todas as localidades".
  label: string;
  setProvincia: (provincia: string | null) => void;
  // Escolhe uma zona; com a província quando a zona é de outra província, e com o centro
  // da zona no mapa quando é conhecido (permite achar os espaços que ficam perto dela).
  setBairro: (bairro: string | null, options?: { provincia?: string; center?: Coordinates | null }) => void;
  // Liga "Perto de si" (pede a localização). Devolve false se não foi possível obtê-la.
  chooseNearMe: () => Promise<boolean>;
  // Pede a localização ao telemóvel (com o pedido de autorização). null se não der.
  requestPosition: () => Promise<Coordinates | null>;
  // Mantém só os espaços da localização escolhida: os que ficam perto em "Perto de si";
  // senão os da província escolhida e, havendo zona, só os desse município ou bairro.
  // A região de cada espaço é a que o OpenStreetMap deu ao ponto marcado pelo dono; um
  // espaço sem ponto só aparece em "Todas as localidades".
  filterByBairro: (spaces: BusinessDTO[]) => BusinessDTO[];
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

// expo-secure-store não existe no browser, por isso na versão web usa-se o localStorage.
async function readStored(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null;
    return await SecureStore.getItemAsync(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(value: { provincia: string | null; bairro: string | null; center: Coordinates | null }): void {
  const text = JSON.stringify(value);
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(STORAGE_KEY, text);
    else void SecureStore.setItemAsync(STORAGE_KEY, text);
  } catch {
    // sem armazenamento disponível: a escolha vale só até fechar a app
  }
}

// A localização escolhida é partilhada pela Home, pelo Explorar e pela Pesquisa, e fica
// guardada no telemóvel: é a província e a zona que a pessoa indicou ao criar a conta
// (e pode mudar a qualquer momento ao tocar na localização).
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [provincia, setProvinciaState] = useState<string | null>(null);
  const [bairro, setBairroState] = useState<string | null>(null);
  const [bairroCenter, setBairroCenter] = useState<Coordinates | null>(null);
  const { user } = useAuth();
  const userId = user?.id;
  // Com a localização desligada no Perfil, a app não lê o GPS nem guarda a posição.
  const { preferences, loaded: preferencesLoaded } = usePreferences();
  const locationAllowed = preferences.location;
  const lastSaved = useRef<Coordinates | null>(null);
  const [nearMe, setNearMe] = useState(false);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [chosen, setChosen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void readStored().then((stored) => {
      try {
        const saved = stored
          ? (JSON.parse(stored) as { provincia?: string | null; bairro?: string | null; center?: Coordinates | null })
          : null;
        if (saved) {
          setProvinciaState(saved.provincia ?? null);
          setBairroState(saved.provincia ? (saved.bairro ?? null) : null);
          setBairroCenter(saved.provincia && saved.bairro ? (saved.center ?? null) : null);
          setChosen(true);
        }
      } catch {
        // valor guardado ilegível: fica a localização por omissão
      }
      setLoaded(true);
    });
  }, []);

  // Quem já autorizou a localização tem a posição lida logo ao abrir a app (sem pedido
  // nenhum), para todos os ecrãs mostrarem a distância até cada espaço. A posição fica só
  // na memória da app e segue nos pedidos que a usam; nunca é guardada.
  useEffect(() => {
    if (!preferencesLoaded) return;

    if (!locationAllowed) {
      setCoordinates(null);
      setNearMe(false);
      return;
    }

    void getCoordinatesIfAllowed().then((current) => {
      if (current) setCoordinates((known) => known ?? current);
    });
  }, [preferencesLoaded, locationAllowed]);

  // O nome do sítio onde a pessoa está (bairro ou município, e província), para o Perfil
  // mostrar a localização real. Só volta a perguntar quando a pessoa mudou de sítio
  // (~100 m): as coordenadas são arredondadas a três casas.
  const placeLatitude = coordinates ? Number(coordinates.latitude.toFixed(3)) : null;
  const placeLongitude = coordinates ? Number(coordinates.longitude.toFixed(3)) : null;
  useEffect(() => {
    if (placeLatitude === null || placeLongitude === null || !userId) {
      setPlace(null);
      return;
    }

    let cancelled = false;
    reversePlace({ latitude: placeLatitude, longitude: placeLongitude })
      .then((found) => {
        if (cancelled) return;
        const text = found ? formatLocation({ bairro: found.bairro ?? found.municipio, provincia: found.provincia }) : "";
        setPlace(text || null);
      })
      .catch(() => {
        if (!cancelled) setPlace(null);
      });

    return () => {
      cancelled = true;
    };
  }, [placeLatitude, placeLongitude, userId]);

  // A posição da pessoa fica também guardada no servidor (na conta dela), para a distância
  // aos espaços continuar a aparecer quando o telemóvel não dá uma leitura nova. Só volta
  // a enviar quando a pessoa se deslocou — não a cada leitura do GPS.
  useEffect(() => {
    if (!userId || !coordinates) return;
    if (lastSaved.current && distanceBetweenKm(lastSaved.current, coordinates) < 0.1) return;

    void saveMyLocation(coordinates).then((saved) => {
      if (saved) lastSaved.current = coordinates;
    });
  }, [userId, coordinates]);

  const save = useCallback((nextProvincia: string | null, nextBairro: string | null, nextCenter: Coordinates | null = null) => {
    setProvinciaState(nextProvincia);
    setBairroState(nextBairro);
    setBairroCenter(nextBairro ? nextCenter : null);
    setNearMe(false);
    setChosen(true);
    writeStored({ provincia: nextProvincia, bairro: nextBairro, center: nextBairro ? nextCenter : null });
  }, []);

  const readPosition = useCallback(async (): Promise<Coordinates | null> => {
    if (!locationAllowed) return null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return null;

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoordinates(current);
      return current;
    } catch {
      return null;
    }
  }, [locationAllowed]);

  const chooseNearMe = useCallback(async () => {
    const current = coordinates ?? (await readPosition());
    if (!current) return false;

    setBairroState(null);
    setNearMe(true);
    return true;
  }, [coordinates, readPosition]);

  const setProvincia = useCallback((next: string | null) => save(next, null), [save]);

  const setBairro = useCallback(
    (next: string | null, options?: { provincia?: string; center?: Coordinates | null }) =>
      save(options?.provincia ?? provincia, next, options?.center ?? null),
    [save, provincia],
  );

  const filterByBairro = useCallback(
    (spaces: BusinessDTO[]) => {
      if (nearMe) return spaces.filter((space) => space.distanceKm !== null && space.distanceKm <= NEAR_ME_RADIUS_KM);

      if (!provincia) return spaces;

      return spaces.filter((space) => {
        if (!sameLocality(space.provincia, provincia)) return false;
        return bairro ? spaceInZone(space, bairro, bairroCenter) : true;
      });
    },
    [provincia, bairro, bairroCenter, nearMe],
  );

  const value = useMemo(
    () => ({
      provincia,
      bairro,
      nearMe,
      coordinates,
      place,
      chosen,
      loaded,
      label: nearMe ? t("Perto de si") : !provincia ? t("Todas as localidades") : bairro ? `${bairro}, ${provincia}` : provincia,
      setProvincia,
      setBairro,
      chooseNearMe,
      requestPosition: readPosition,
      filterByBairro,
    }),
    [
      provincia,
      bairro,
      nearMe,
      coordinates,
      place,
      chosen,
      loaded,
      setProvincia,
      setBairro,
      chooseNearMe,
      readPosition,
      filterByBairro,
    ],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useSelectedLocation(): LocationContextValue {
  const t = useT();
  const context = useContext(LocationContext);
  if (!context) throw new Error(t("useSelectedLocation tem de ser usado dentro de um LocationProvider."));
  return context;
}
