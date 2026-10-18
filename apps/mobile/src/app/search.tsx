import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import type { BusinessDTO, SearchResultDTO, SearchSortBy } from "@slotix/types";
import { formatDistance } from "@slotix/types";

import { DistanceChips } from "@/components/DistanceChips";
import { useIOSColors } from "@/components/ios";
import { AuroraBackdrop } from "@/components/ios/AuroraBackdrop";
import { Typography } from "@/constants/theme";
import { placeText } from "@/components/SpaceCards";
import { listBusinesses } from "../services/businesses";
import { search } from "../services/search";
import { useFavorites } from "../contexts/FavoritesContext";
import { useSelectedLocation } from "../contexts/LocationContext";
import { useT } from "@/i18n";

type Filter = "recommended" | "nearest" | "topRated" | "bestPrice";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "recommended", label: "Todos" },
  { value: "nearest", label: "Perto" },
  { value: "topRated", label: "Avaliação" },
  { value: "bestPrice", label: "Preço" },
];

const SUGGESTIONS: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
  { label: "Corte de cabelo", icon: "cut-outline" },
  { label: "Manicure", icon: "hand-left-outline" },
  { label: "Barbearia", icon: "man-outline" },
  { label: "Maquilhagem", icon: "color-palette-outline" },
  { label: "Massagem", icon: "leaf-outline" },
  { label: "Tranças", icon: "sparkles-outline" },
];

function formatPrice(value: number): string {
  return `${value.toLocaleString("pt-AO")} Kz`;
}

/* ------------------------------------------------------------------------ */
/* Controlo segmentado do iOS — a "pílula" branca desliza até à opção        */
/* ------------------------------------------------------------------------ */

function SegmentedControl({ value, onChange }: { value: Filter; onChange: (next: Filter) => void }) {
  const t = useT();
  const colors = useIOSColors();
  const [width, setWidth] = useState(0);
  const index = FILTERS.findIndex((filter) => filter.value === value);
  const position = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.spring(position, { toValue: index, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
  }, [index, position]);

  const segmentWidth = width > 0 ? (width - 4) / FILTERS.length : 0;

  return (
    <View
      style={[styles.segmented, { backgroundColor: colors.input }]}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.segmentThumb,
            {
              width: segmentWidth,
              backgroundColor: colors.surfaceElevated,
              transform: [{ translateX: Animated.multiply(position, segmentWidth) }],
            },
          ]}
        />
      ) : null}
      {FILTERS.map((filter) => {
        const active = filter.value === value;
        return (
          <Pressable
            key={filter.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(filter.value)}
            style={styles.segment}
          >
            <Text style={[styles.segmentLabel, { color: colors.text, fontWeight: active ? "600" : "500" }]}>
              {t(filter.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Linha de resultado — como uma linha de lista agrupada do iOS             */
/* ------------------------------------------------------------------------ */

function ResultRow({
  result,
  favorite,
  onFavorite,
  onPress,
}: {
  result: SearchResultDTO;
  favorite: boolean;
  onFavorite: () => void;
  onPress: () => void;
}) {
  const t = useT();
  const colors = useIOSColors();
  const { business, matchedService } = result;

  const details = [
    business.ratingAvg !== null ? `★ ${business.ratingAvg.toFixed(1)}` : t("Novo"),
    business.distanceKm !== null ? formatDistance(business.distanceKm) : null,
    t(business.category),
  ].filter(Boolean);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={business.name}>
      {({ pressed }) => (
        <View style={[styles.resultRow, pressed && { backgroundColor: colors.backgroundSelected }]}>
          {business.logoUrl || business.imageUrl ? (
            <Image source={{ uri: business.logoUrl ?? business.imageUrl ?? undefined }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailEmpty, { backgroundColor: colors.input }]}>
              <Ionicons name="storefront-outline" size={22} color={colors.textSecondary} />
            </View>
          )}

          <View style={styles.resultText}>
            <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>
              {business.name}
            </Text>
            <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {matchedService ? matchedService.name : (placeText(business) ?? t("Sem morada"))}
            </Text>
            <Text style={[styles.resultMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {details.join("  ·  ")}
              {matchedService ? t("  ·  desde {0}", [formatPrice(matchedService.price)]) : ""}
            </Text>
          </View>

          <Pressable
            onPress={onFavorite}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={favorite ? t("Remover dos favoritos") : t("Adicionar aos favoritos")}
          >
            <Ionicons
              name={favorite ? "heart" : "heart-outline"}
              size={22}
              color={favorite ? colors.error : colors.textTertiary}
            />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

function GroupedList({ children }: { children: React.ReactNode[] }) {
  const colors = useIOSColors();
  return (
    <View style={[styles.group, { backgroundColor: colors.card }]}>
      {children.map((child, index) => (
        <View key={index}>
          {child}
          {index < children.length - 1 ? (
            <View style={[styles.separator, { backgroundColor: colors.divider }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Ecrã                                                                     */
/* ------------------------------------------------------------------------ */

export default function SearchScreen() {
  const t = useT();
  const router = useRouter();
  const colors = useIOSColors();
  const inputRef = useRef<TextInput>(null);
  const { isFavorite, toggleFavorite } = useFavorites();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("recommended");
  // null = qualquer distância; senão só os espaços até esses km de onde a pessoa está.
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [allResults, setResults] = useState<SearchResultDTO[]>([]);
  const { coordinates: myPosition, requestPosition } = useSelectedLocation();

  // A pesquisa procura à volta da pessoa, não numa província: com distância escolhida,
  // ficam só os espaços com o ponto marcado dentro desse raio.
  const results = useMemo(
    () =>
      radiusKm === null
        ? allResults
        : allResults.filter((result) => result.business.distanceKm !== null && result.business.distanceKm <= radiusKm),
    [allResults, radiusKm],
  );
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // A localização só é pedida quando é precisa: em "Perto" ou ao escolher uma distância.
  const needPosition = useCallback(async () => {
    if (myPosition ?? (await requestPosition())) return true;
    Alert.alert(t("Sem acesso à localização"), t("Autorize a localização para procurar espaços perto de si."));
    return false;
  }, [myPosition, requestPosition]);

  const selectFilter = useCallback(
    async (next: Filter) => {
      if (next === "nearest" && !(await needPosition())) return;
      setFilter(next);
    },
    [needPosition],
  );

  const selectRadius = useCallback(
    async (next: number | null) => {
      if (next !== null && !(await needPosition())) return;
      setRadiusKm(next);
    },
    [needPosition],
  );

  const hasQuery = debouncedQuery.length > 0;
  // Sem texto mas com distância, a pesquisa lista tudo o que há nesse raio.
  const browsing = !hasQuery && radiusKm !== null && myPosition !== null;
  const latitude = myPosition?.latitude;
  const longitude = myPosition?.longitude;

  useEffect(() => {
    if (!hasQuery && !browsing) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const request = hasQuery
      ? search({ q: debouncedQuery, sortBy: filter as SearchSortBy, latitude, longitude, limit: 100 })
      : listBusinesses({
          latitude,
          longitude,
          radiusKm: radiusKm ?? undefined,
          // "Preço" depende de um serviço procurado; sem texto, vale a ordem por distância.
          sortBy: filter === "topRated" ? "topRated" : filter === "recommended" ? "recommended" : "nearest",
          limit: 100,
        }).then((response) => ({ data: response.data.map((business) => ({ business, matchedService: null })) }));

    request
      .then((response) => {
        if (!cancelled) setResults(response.data);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, filter, hasQuery, browsing, radiusKm, latitude, longitude]);

  const openSpace = (business: BusinessDTO) => {
    Keyboard.dismiss();
    router.push({ pathname: "/space", params: { businessId: business.id } } as never);
  };

  const cancel = () => {
    setQuery("");
    Keyboard.dismiss();
    inputRef.current?.blur();
  };

  // Sair da pesquisa: volta ao ecrã anterior, ou ao Início se a pesquisa foi aberta diretamente.
  const exit = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <AuroraBackdrop />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.titleRow}>
            <Text style={[styles.largeTitle, { color: colors.text }]}>{t("Pesquisar")}</Text>
            <Pressable onPress={exit} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Fechar pesquisa")}>
              {({ pressed }) => (
                <View style={[styles.closeButton, { backgroundColor: colors.input, opacity: pressed ? 0.6 : 1 }]}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </View>
              )}
            </Pressable>
          </View>

          {/* Barra de pesquisa do iOS */}
          <View style={styles.searchRow}>
            <View style={[styles.searchField, { backgroundColor: colors.input }]}>
              <Ionicons name="search" size={17} color={colors.textSecondary} />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={t("Espaços, serviços e mais")}
                placeholderTextColor={colors.textSecondary}
                selectionColor={colors.primary}
                returnKeyType="search"
                autoCorrect={false}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {query.length > 0 ? (
                <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityLabel={t("Limpar pesquisa")}>
                  <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            {focused || query.length > 0 ? (
              <Pressable onPress={cancel} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.cancel, { color: colors.primary }]}>{t("Cancelar")}</Text>
              </Pressable>
            ) : null}
          </View>

          <SegmentedControl value={filter} onChange={(next) => void selectFilter(next)} />

          {/* Distância à volta da pessoa e o mapa com os espaços */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.distanceRow}
            contentContainerStyle={styles.distanceChips}
          >
            <Pressable
              onPress={() => {
                Keyboard.dismiss();
                router.push({ pathname: "/mapa", params: radiusKm !== null ? { radiusKm: String(radiusKm) } : {} } as never);
              }}
              accessibilityRole="button"
              accessibilityLabel={t("Ver os espaços no mapa")}
            >
              {({ pressed }) => (
                <View style={[styles.mapButton, { borderColor: colors.primary, opacity: pressed ? 0.6 : 1 }]}>
                  <Ionicons name="map-outline" size={15} color={colors.primary} />
                  <Text style={[styles.mapButtonText, { color: colors.primary }]}>{t("Mapa")}</Text>
                </View>
              )}
            </Pressable>
            <DistanceChips value={radiusKm} onChange={(next) => void selectRadius(next)} />
          </ScrollView>

          {!hasQuery && !browsing ? (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t("SUGESTÕES")}</Text>
              <GroupedList>
                {SUGGESTIONS.map((suggestion) => (
                  <Pressable
                    key={suggestion.label}
                    onPress={() => setQuery(suggestion.label)}
                    accessibilityRole="button"
                  >
                    {({ pressed }) => (
                      <View style={[styles.suggestionRow, pressed && { backgroundColor: colors.backgroundSelected }]}>
                        <Ionicons name={suggestion.icon} size={20} color={colors.primary} />
                        <Text style={[styles.suggestionText, { color: colors.text }]}>{t(suggestion.label)}</Text>
                        <Ionicons
                          name="arrow-up-outline"
                          size={16}
                          color={colors.textTertiary}
                          style={styles.suggestionArrow}
                        />
                      </View>
                    )}
                  </Pressable>
                ))}
              </GroupedList>
            </>
          ) : loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : results.length === 0 ? (
            <View style={styles.state}>
              <Ionicons name="search" size={44} color={colors.textTertiary} />
              <Text style={[styles.stateTitle, { color: colors.text }]}>{t("Sem resultados")}</Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                {hasQuery
                  ? t("Não encontrámos nada para “{0}”{1}. Tente outra palavra{2}.", [debouncedQuery, radiusKm !== null ? t(" a menos de {0} km de si", [radiusKm]) : "", radiusKm !== null ? t(" ou aumente a distância") : ""])
                  : t("Não há espaços a menos de {0} km de si. Aumente a distância.", [radiusKm])}
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
                {results.length === 1 ? t("1 RESULTADO") : t("{0} RESULTADOS", [results.length])}
              </Text>
              <GroupedList>
                {results.map((result) => (
                  <ResultRow
                    key={result.business.id}
                    result={result}
                    favorite={isFavorite(result.business.id)}
                    onFavorite={() => void toggleFavorite(result.business.id)}
                    onPress={() => openSpace(result.business)}
                  />
                ))}
              </GroupedList>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    marginTop: 8,
    marginBottom: 10,
  },
  largeTitle: {
    ...Typography.largeTitle,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  searchField: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderCurve: "continuous",
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: 0,
  },
  cancel: {
    ...Typography.body,
  },
  segmented: {
    height: 32,
    borderRadius: 9,
    borderCurve: "continuous",
    padding: 2,
    flexDirection: "row",
    marginBottom: 12,
  },
  distanceRow: {
    marginHorizontal: -16,
    marginBottom: 24,
  },
  distanceChips: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  mapButtonText: {
    ...Typography.footnote,
    fontWeight: "600",
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
  sectionHeader: {
    ...Typography.footnote,
    marginHorizontal: 16,
    marginBottom: 7,
  },
  group: {
    borderRadius: 10,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  suggestionRow: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  suggestionText: {
    ...Typography.body,
    flex: 1,
  },
  suggestionArrow: {
    transform: [{ rotate: "-45deg" }],
  },
  resultRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderCurve: "continuous",
  },
  thumbnailEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  resultText: {
    flex: 1,
    gap: 1,
  },
  resultTitle: {
    ...Typography.headline,
  },
  resultSubtitle: {
    ...Typography.subheadline,
  },
  resultMeta: {
    ...Typography.footnote,
  },
  state: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 32,
    gap: 8,
  },
  stateTitle: {
    ...Typography.title3,
    marginTop: 8,
  },
  stateText: {
    ...Typography.subheadline,
    textAlign: "center",
  },
});
