import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BusinessDTO } from "@slotix/types";
import { formatDistance } from "@slotix/types";

import { useIOSColors } from "@/components/ios";
import { likesText, placeText, ratingWithCount, RowGroup, SectionTitle } from "@/components/SpaceCards";
import { CATEGORIES } from "@/constants/categories";
import { Typography } from "@/constants/theme";
import { useSelectedLocation } from "../contexts/LocationContext";
import { listMyAppointments } from "../services/appointments";
import { getBusiness, listBusinesses } from "../services/businesses";
import { useT } from "@/i18n";

/*
 * O ecrã do "+": vai direto aos espaços. Escolhe-se um — da lista, afinada pelo tipo de
 * serviço, ou um onde já se esteve — e segue-se para os passos da marcação (serviço,
 * profissional, data). As marcações já feitas estão no Perfil.
 */

const REBOOK_LIMIT = 6;

function SpaceImage({ space, size }: { space: BusinessDTO; size: number }) {
  const colors = useIOSColors();
  return (
    <View style={[styles.image, { width: size, height: size, backgroundColor: colors.backgroundSelected }]}>
      {space.imageUrl ? (
        <Image source={{ uri: space.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <Ionicons name="storefront-outline" size={size * 0.36} color={colors.textTertiary} />
      )}
    </View>
  );
}

export default function BookScreen() {
  const t = useT();
  const router = useRouter();
  const colors = useIOSColors();
  const insets = useSafeAreaInsets();
  const { coordinates } = useSelectedLocation();

  const [category, setCategory] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<BusinessDTO[]>([]);
  const [recent, setRecent] = useState<BusinessDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Só a resposta do pedido mais recente conta (ver o mesmo cuidado no Explorar).
  const latestRequest = useRef(0);

  const loadSpaces = useCallback(async () => {
    const request = ++latestRequest.current;
    try {
      const data = await listBusinesses({
        category: category ?? undefined,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        sortBy: coordinates ? "nearest" : "recommended",
        limit: 50,
      });
      if (request === latestRequest.current) setSpaces(data.data);
    } catch {
      if (request === latestRequest.current) setSpaces([]);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [category, coordinates]);

  // Os espaços onde a pessoa já marcou, do mais recente para o mais antigo.
  const loadRecent = useCallback(async () => {
    try {
      const appointments = await listMyAppointments();
      const ids = [
        ...new Set(
          [...appointments].sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).map((appointment) => appointment.businessId),
        ),
      ].slice(0, REBOOK_LIMIT);
      const found = await Promise.allSettled(ids.map((id) => getBusiness(id)));
      setRecent(found.flatMap((result) => (result.status === "fulfilled" ? [result.value] : [])));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadSpaces();
  }, [loadSpaces]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSpaces(), loadRecent()]);
    setRefreshing(false);
  };

  const book = (space: BusinessDTO) => router.push({ pathname: "/booking/service", params: { businessId: space.id } });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textSecondary} />}
      >
        <Pressable onPress={() => router.push("/search")} accessibilityRole="search">
          {({ pressed }) => (
            <View style={[styles.search, { backgroundColor: colors.input, opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="search" size={17} color={colors.textSecondary} />
              <Text style={[styles.searchText, { color: colors.textSecondary }]}>{t("Procurar um espaço ou serviço")}</Text>
            </View>
          )}
        </Pressable>

        {/* O tipo de serviço afina a lista de espaços. */}
        <View style={styles.categories}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.bleedContent}>
            {CATEGORIES.map((item) => {
              const active = item.name === category;
              return (
                <Pressable
                  key={item.name}
                  onPress={() => setCategory(active ? null : item.name)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  {({ pressed }) => (
                    <View style={[styles.category, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
                      <View style={[styles.categoryRing, { borderColor: active ? colors.primary : "transparent" }]}>
                        <View style={[styles.categoryImage, { backgroundColor: item.color }]}>
                          <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                        </View>
                      </View>
                      <Text
                        style={[styles.categoryLabel, { color: active ? colors.primary : colors.text, fontWeight: active ? "600" : "400" }]}
                        numberOfLines={2}
                      >
                        {t(item.name)}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {recent.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle title={t("Marcar de novo")} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.bleedContent}>
              {recent.map((space) => (
                <Pressable key={space.id} onPress={() => book(space)} accessibilityRole="button" accessibilityLabel={space.name}>
                  {({ pressed }) => (
                    <View style={[styles.recent, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}>
                      <SpaceImage space={space} size={44} />
                      <View style={styles.recentText}>
                        <Text style={[styles.recentName, { color: colors.text }]} numberOfLines={1}>
                          {space.name}
                        </Text>
                        <Text style={[styles.recentMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                          {t(space.category)}
                        </Text>
                      </View>
                      <Ionicons name="arrow-forward-circle" size={26} color={colors.primary} />
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionTitle title={t("Espaços")} />

          {loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : spaces.length === 0 ? (
            <View style={styles.state}>
              <Ionicons name="storefront-outline" size={44} color={colors.textTertiary} />
              <Text style={[styles.stateTitle, { color: colors.text }]}>{t("Nenhum espaço encontrado")}</Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>{t("Experimente outra categoria.")}</Text>
            </View>
          ) : (
            <RowGroup>
              {spaces.map((space) => {
                const details = [
                  `★ ${ratingWithCount(space)}`,
                  likesText(space),
                  space.distanceKm !== null ? formatDistance(space.distanceKm) : null,
                  t(space.category),
                ].filter(Boolean);

                return (
                  <Pressable key={space.id} onPress={() => book(space)} accessibilityRole="button" accessibilityLabel={space.name}>
                    {({ pressed }) => (
                      <View style={[styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}>
                        <SpaceImage space={space} size={64} />
                        <View style={styles.rowText}>
                          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                            {space.name}
                          </Text>
                          <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                            {placeText(space) ?? t("Sem morada")}
                          </Text>
                          <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                            {details.join("  ·  ")}
                          </Text>
                        </View>
                        <View style={[styles.bookPill, { backgroundColor: colors.infoBackground }]}>
                          <Text style={[styles.bookPillText, { color: colors.primary }]}>{t("Marcar")}</Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </RowGroup>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 150,
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
  },
  search: {
    height: 40,
    borderRadius: 12,
    borderCurve: "continuous",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  searchText: {
    ...Typography.body,
  },
  categories: {
    marginTop: 16,
  },
  section: {
    marginTop: 28,
  },
  // As filas horizontais vão até à margem do ecrã.
  bleed: {
    marginHorizontal: -16,
  },
  bleedContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  image: {
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  recent: {
    width: 250,
    padding: 10,
    borderRadius: 18,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  recentText: {
    flex: 1,
  },
  recentName: {
    ...Typography.headline,
  },
  recentMeta: {
    ...Typography.footnote,
  },
  category: {
    width: 78,
    alignItems: "center",
    gap: 6,
  },
  categoryRing: {
    padding: 3,
    borderRadius: 26,
    borderCurve: "continuous",
    borderWidth: 2,
  },
  categoryImage: {
    width: 68,
    height: 68,
    borderRadius: 21,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  categoryLabel: {
    ...Typography.caption1,
    textAlign: "center",
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    ...Typography.headline,
  },
  rowSubtitle: {
    ...Typography.subheadline,
  },
  rowMeta: {
    ...Typography.footnote,
  },
  bookPill: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bookPillText: {
    ...Typography.subheadline,
    fontWeight: "600",
  },
  state: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 6,
  },
  stateTitle: {
    ...Typography.headline,
    marginTop: 6,
  },
  stateText: {
    ...Typography.subheadline,
    textAlign: "center",
  },
});
