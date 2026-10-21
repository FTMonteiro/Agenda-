import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BusinessDTO, BusinessSortBy } from "@slotix/types";

import { NotificationBell } from "@/components/HomeWidgets";
import { useIOSColors } from "@/components/ios";
import { HeroSpaceCard, RowGroup, SectionTitle, SpaceRow, SpaceTile } from "@/components/SpaceCards";
import { CATEGORY_FILTERS as CATEGORIES } from "@/constants/categories";
import { Typography } from "@/constants/theme";
import { useFavorites } from "../contexts/FavoritesContext";
import { NEAR_ME_RADIUS_KM, useSelectedLocation } from "../contexts/LocationContext";
import { listBusinesses } from "../services/businesses";
import { useT } from "@/i18n";

type SortMode = Extract<BusinessSortBy, "recommended" | "nearest" | "mostFavorited">;

const SORTS: { value: SortMode; label: string }[] = [
  { value: "recommended", label: "Recomendados" },
  { value: "nearest", label: "Perto" },
  // Os melhores são os que mais pessoas puseram nos favoritos; a nota desempata.
  { value: "mostFavorited", label: "Avaliação" },
];

/* Controlo segmentado do iOS, com a pílula a deslizar até à opção escolhida. */
function Segmented({ value, onChange }: { value: SortMode; onChange: (next: SortMode) => void }) {
  const t = useT();
  const colors = useIOSColors();
  const [width, setWidth] = useState(0);
  const index = SORTS.findIndex((sort) => sort.value === value);
  const position = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.spring(position, { toValue: index, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
  }, [index, position]);

  const segment = width > 0 ? (width - 4) / SORTS.length : 0;

  return (
    <View
      style={[styles.segmented, { backgroundColor: colors.input }]}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
    >
      {segment > 0 ? (
        <Animated.View
          style={[
            styles.segmentThumb,
            {
              width: segment,
              backgroundColor: colors.surfaceElevated,
              transform: [{ translateX: Animated.multiply(position, segment) }],
            },
          ]}
        />
      ) : null}
      {SORTS.map((sort) => (
        <Pressable
          key={sort.value}
          onPress={() => onChange(sort.value)}
          style={styles.segment}
          accessibilityRole="tab"
          accessibilityState={{ selected: sort.value === value }}
        >
          <Text style={[styles.segmentLabel, { color: colors.text, fontWeight: sort.value === value ? "600" : "500" }]}>
            {t(sort.label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ExploreScreen() {
  const t = useT();
  const router = useRouter();
  const colors = useIOSColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ category?: string; sort?: string }>();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { coordinates: myPosition, requestPosition } = useSelectedLocation();

  // Uma categoria escolhida na Home chega como parâmetro, e já conta no primeiro pedido.
  const [category, setCategory] = useState(() =>
    params.category && CATEGORIES.some((item) => item.name === params.category) ? params.category : "Todos",
  );
  const [sortMode, setSortMode] = useState<SortMode>(() => (params.sort === "nearest" ? "nearest" : "recommended"));
  const [results, setResults] = useState<BusinessDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  // Só a resposta do pedido mais recente conta: uma mais lenta, de outra categoria, não
  // pode vir depois pôr espaços que não são da categoria escolhida.
  const latestRequest = useRef(0);

  // O ecrã pode já estar aberto quando se escolhe outra categoria na Home.
  useEffect(() => {
    if (params.category && CATEGORIES.some((item) => item.name === params.category)) setCategory(params.category);
  }, [params.category]);

  useEffect(() => {
    if (params.sort === "nearest") setSortMode("nearest");
  }, [params.sort]);

  // A posição vem do contexto, que segue a pessoa enquanto se desloca. Arredondada (~100 m)
  // para não repetir o pedido a cada pequena leitura do GPS.
  const latitude = myPosition ? Number(myPosition.latitude.toFixed(3)) : null;
  const longitude = myPosition ? Number(myPosition.longitude.toFixed(3)) : null;
  const nearest = sortMode === "nearest";

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    // "Perto" sem posição não tem espaços para mostrar.
    if (nearest && (latitude === null || longitude === null)) {
      setResults([]);
      setLoading(false);
      return;
    }
    try {
      // A posição da pessoa dá a distância até cada espaço em qualquer filtro; em "Perto"
      // ficam só os espaços até NEAR_ME_RADIUS_KM de onde ela está, dos mais próximos primeiro.
      const data = await listBusinesses({
        category: category !== "Todos" ? category : undefined,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        radiusKm: nearest ? NEAR_ME_RADIUS_KM : undefined,
        sortBy: sortMode,
        limit: 50,
      });
      if (request === latestRequest.current) setResults(data.data);
    } catch {
      if (request === latestRequest.current) setResults([]);
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }, [category, latitude, longitude, nearest, sortMode]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const selectSort = async (mode: SortMode) => {
    if (mode === "nearest" && !myPosition && !(await requestPosition())) return;
    setSortMode(mode);
  };

  // Um espaço sem ponto marcado no mapa não tem distância: não entra em "Perto".
  const spaces = nearest
    ? results.filter((space) => space.distanceKm !== null && space.distanceKm <= NEAR_ME_RADIUS_KM)
    : results;
  const browsing = category === "Todos" && sortMode === "recommended";
  // "Escolha do dia" e "Em alta" são só espaços que alguém pôs nos favoritos — a API já os
  // devolve primeiro, dos mais favoritos para os menos. Sem favoritos, ficam só na lista.
  const favorited = browsing ? spaces.filter((space) => space.favoriteCount > 0) : [];
  const featured = favorited[0];
  const trending = favorited.slice(1, 7);
  const list = browsing ? spaces.filter((space) => space !== featured && !trending.includes(space)) : spaces;

  const openSpace = (space: BusinessDTO) =>
    router.push({ pathname: "/space", params: { businessId: space.id } } as never);
  const headerOpacity = scrollY.interpolate({ inputRange: [30, 70], outputRange: [0, 1], extrapolate: "clamp" });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textSecondary} />}
      >
        <View style={styles.titleRow}>
          <View />
          {/* O mesmo sino do Início, com o número real de avisos por ler */}
          <NotificationBell />
        </View>

        <View style={styles.searchRow}>
          <Pressable onPress={() => router.push("/search")} style={styles.flex} accessibilityRole="search">
            {({ pressed }) => (
              <View style={[styles.searchBar, { backgroundColor: colors.input, opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="search" size={17} color={colors.textSecondary} />
                <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]}>{t("Pesquisar")}</Text>
              </View>
            )}
          </Pressable>
          {/* Abre o mapa com todos os espaços registados */}
          <Pressable onPress={() => router.push("/mapa" as never)} accessibilityLabel={t("Ver os espaços no mapa")} hitSlop={6}>
            {({ pressed }) => (
              <View style={[styles.filterButton, { backgroundColor: colors.input, opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="map-outline" size={20} color={colors.primary} />
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsScroll}
        >
          {CATEGORIES.map((item) => {
            const active = item.name === category;
            return (
              <Pressable
                key={item.name}
                onPress={() => setCategory(item.name)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.text : colors.card,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                  >
                    <Image source={item.image} style={styles.chipImage} contentFit="cover" />
                    <Text style={[styles.chipText, { color: active ? colors.background : colors.text }]}>
                      {t(item.name)}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <Segmented value={sortMode} onChange={(mode) => void selectSort(mode)} />

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.textSecondary} />
          </View>
        ) : spaces.length === 0 ? (
          <View style={styles.state}>
            <Ionicons name="compass-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>{t("Nenhum espaço encontrado")}</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              {nearest
                ? myPosition
                  ? t("Ainda não há espaços a menos de {0} km de si.", [NEAR_ME_RADIUS_KM])
                  : t("Ative a localização para ver os espaços perto de si.")
                : t("Experimente outra categoria.")}
            </Text>
          </View>
        ) : (
          <>
            {featured ? (
              <View style={styles.section}>
                <HeroSpaceCard
                  space={featured}
                  width={width - 32}
                  height={(width - 32) * 0.78}
                  eyebrow={t("Escolha do dia")}
                  favorite={isFavorite(featured.id)}
                  onFavorite={() => void toggleFavorite(featured.id)}
                  onPress={() => openSpace(featured)}
                />
              </View>
            ) : null}

            {trending.length > 0 ? (
              <View style={styles.section}>
                <SectionTitle title={t("Em alta")} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiles}>
                  {trending.map((space) => (
                    <SpaceTile
                      key={space.id}
                      space={space}
                      width={180}
                      favorite={isFavorite(space.id)}
                      onFavorite={() => void toggleFavorite(space.id)}
                      onPress={() => openSpace(space)}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {list.length > 0 ? (
              <View style={styles.section}>
                <SectionTitle
                  title={
                    browsing ? t("Todos os espaços") : `${spaces.length} ${spaces.length === 1 ? t("espaço") : t("espaços")}`
                  }
                />
                <RowGroup>
                  {list.map((space) => (
                    <SpaceRow
                      key={space.id}
                      space={space}
                      favorite={isFavorite(space.id)}
                      onFavorite={() => void toggleFavorite(space.id)}
                      onPress={() => openSpace(space)}
                    />
                  ))}
                </RowGroup>
              </View>
            ) : null}
          </>
        )}
      </Animated.ScrollView>

      <Animated.View pointerEvents="none" style={[styles.topBar, { height: insets.top + 44, opacity: headerOpacity }]}>
        <BlurView intensity={80} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
        <View style={[styles.topBarBorder, { backgroundColor: colors.divider }]} />
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  largeTitle: {
    ...Typography.largeTitle,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  searchBar: {
    height: 40,
    borderRadius: 12,
    borderCurve: "continuous",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  searchPlaceholder: {
    ...Typography.body,
  },
  filterButton: {
    height: 40,
    minWidth: 40,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  chipsScroll: {
    marginHorizontal: -16,
    marginBottom: 16,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    height: 40,
    borderRadius: 20,
    paddingLeft: 5,
    paddingRight: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  chipText: {
    ...Typography.subheadline,
    fontWeight: "600",
  },
  segmented: {
    height: 32,
    borderRadius: 9,
    borderCurve: "continuous",
    padding: 2,
    flexDirection: "row",
  },
  segmentThumb: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 7,
    borderCurve: "continuous",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLabel: {
    ...Typography.footnote,
  },
  section: {
    marginTop: 24,
  },
  tiles: {
    gap: 14,
    paddingRight: 16,
  },
  state: {
    alignItems: "center",
    paddingTop: 72,
    paddingHorizontal: 32,
    gap: 8,
  },
  stateTitle: {
    ...Typography.title3,
    marginTop: 8,
    textAlign: "center",
  },
  stateText: {
    ...Typography.subheadline,
    textAlign: "center",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  topBarBorder: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  topBarTitle: {
    ...Typography.headline,
  },
});
