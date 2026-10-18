import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatDistance } from "@slotix/types";

import { useIOSColors } from "@/components/ios";
import { BRAND_MARKER_URI } from "@/components/brandMarker";
import { RouteMap } from "@/components/RouteMap";
import { Typography } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSelectedLocation } from "../contexts/LocationContext";
import { fetchRoute, openDirections, type Route } from "../services/maps";
import { useT } from "@/i18n";

// "1 h 05 min" ou "12 min".
function durationText(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}

/*
 * O "Como chegar" de um espaço: o caminho de onde a pessoa está até lá, desenhado na
 * própria app, com o ícone da agenda+ no destino. Para ser guiada rua a rua, a pessoa
 * abre o mesmo destino na aplicação de mapas do telemóvel.
 */
export default function RouteScreen() {
  const t = useT();
  const router = useRouter();
  const colors = useIOSColors();
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === "dark";
  const { coordinates: position, requestPosition } = useSelectedLocation();

  const params = useLocalSearchParams<{ name?: string; address?: string; latitude?: string; longitude?: string }>();
  const name = params.name ?? "";
  const latitude = Number(params.latitude);
  const longitude = Number(params.longitude);
  const destination = useMemo(() => ({ latitude, longitude }), [latitude, longitude]);

  const [route, setRoute] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  // Sem posição, pede-a (uma vez): é o ponto de partida do caminho.
  useEffect(() => {
    if (position) return;
    void requestPosition().then((found) => {
      if (!found) {
        setDenied(true);
        setLoading(false);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O caminho só volta a ser pedido quando a pessoa mudou de sítio (~100 m).
  const fromLatitude = position ? Number(position.latitude.toFixed(3)) : null;
  const fromLongitude = position ? Number(position.longitude.toFixed(3)) : null;
  useEffect(() => {
    if (fromLatitude === null || fromLongitude === null || !position) return;
    let cancelled = false;
    setLoading(true);
    fetchRoute(position, destination)
      .then((found) => {
        if (!cancelled) setRoute(found);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromLatitude, fromLongitude, destination]);

  const handleNavigate = async () => {
    const opened = await openDirections(destination, name);
    if (!opened) Alert.alert(t("Não foi possível abrir o mapa"), t("Não encontrámos uma aplicação de mapas neste telemóvel."));
  };

  const summary = loading
    ? null
    : route
      ? `${formatDistance(route.distanceKm)}  ·  ${durationText(route.durationMin)} ${t("de carro")}`
      : denied
        ? t("Autorize a localização para ver o caminho desde onde está.")
        : t("Não foi possível calcular o caminho. Veja o destino no mapa.");

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.cardLine, { color: colors.textSecondary }]}>{t("Localização não disponível")}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <RouteMap destination={destination} name={name} position={position} path={route?.path ?? null} dark={dark} tint={colors.primary} />

      <View style={[styles.top, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("Voltar")}>
          {({ pressed }) => (
            <View style={[styles.back, styles.shadow, { backgroundColor: colors.card, opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </View>
          )}
        </Pressable>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
        <View style={[styles.card, styles.shadow, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Image source={{ uri: BRAND_MARKER_URI }} style={styles.logo} accessibilityLabel="agenda+" />
            <View style={styles.cardText}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {name}
              </Text>
              {params.address ? (
                <Text style={[styles.cardLine, { color: colors.textSecondary }]} numberOfLines={1}>
                  {params.address}
                </Text>
              ) : null}
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <Text style={[styles.summary, { color: route ? colors.text : colors.textSecondary }]}>{summary}</Text>
          )}

          <Pressable onPress={() => void handleNavigate()} accessibilityRole="button">
            {({ pressed }) => (
              <View style={[styles.open, { backgroundColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="navigate" size={17} color={colors.primaryForeground} />
                <Text style={[styles.openText, { color: colors.primaryForeground }]}>{t("Iniciar navegação")}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  shadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 4,
  },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 0,
  },
  card: {
    borderRadius: 22,
    borderCurve: "continuous",
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...Typography.headline,
  },
  cardLine: {
    ...Typography.footnote,
  },
  summary: {
    ...Typography.subheadline,
  },
  open: {
    height: 46,
    borderRadius: 13,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  openText: {
    ...Typography.headline,
  },
});
