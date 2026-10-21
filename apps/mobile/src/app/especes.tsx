import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Image } from "expo-image";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";

import type { BusinessDTO, BusinessSortBy } from "@slotix/types";
import { formatDistance } from "@slotix/types";
import { listBusinesses } from "../services/businesses";
import { getCurrentCoordinates, type Coordinates } from "../services/location";
import { useFavorites } from "../contexts/FavoritesContext";
import { CATEGORY_FILTERS } from "@/constants/categories";
import { useThemed, type ThemeRoles } from "@/theme/roles";

type IconName = keyof typeof Ionicons.glyphMap;

type CategoryOption = {
  label: string;
  icon: IconName;
};

// `category` is one of the shared space types (@slotix/types), sent as-is to ?category=.
// "Todos" is a client-only sentinel meaning "no category filter".
type Filters = {
  category: string;
  radiusKm: number | null;
  maxPrice: number | null;
  minRating: number | null;
};

type SortMode = Extract<BusinessSortBy, "recommended" | "nearest"> | "topRated";

const COLORS = {
  background: "#F5F5F2",
  white: "#FFFFFF",
  black: "#000000",
  text: "#1C1C1E",
  muted: "#8E8E93",
  softMuted: "#AEAEB2",
  line: "#E5E5EA",
  blue: "#2E67B3",
  blueSoft: "#E2EEFF",
  success: "#34C759",
  gold: "#A2845E",
  goldSoft: "#FFFAE5",
};

const CATEGORIES: CategoryOption[] = CATEGORY_FILTERS.map((category) => ({
  label: category.name,
  icon: category.icon,
}));

const SORT_MODES: { mode: SortMode; label: string }[] = [
  {
    mode: "recommended",
    label: "Recomendado",
  },
  {
    mode: "topRated",
    label: "Melhor avaliado",
  },
  {
    mode: "nearest",
    label: "Mais próximo",
  },
];

type SpaceCardProps = {
  space: BusinessDTO;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onPress: (id: string) => void;
};

const SpaceCard = memo(({ space, favorite, onToggleFavorite, onPress }: SpaceCardProps) => {
  const { tc, styles } = useThemed(createStyles);
  const scale = useRef(new Animated.Value(1)).current;
  const favoriteScale = useRef(new Animated.Value(1)).current;

  const animatePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 25,
      bounciness: 0,
    }).start();
  }, [scale]);

  const animatePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start();
  }, [scale]);

  const handleFavorite = useCallback(() => {
    Animated.sequence([
      Animated.spring(favoriteScale, {
        toValue: 0.78,
        useNativeDriver: true,
        speed: 35,
        bounciness: 0,
      }),
      Animated.spring(favoriteScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }),
    ]).start();

    onToggleFavorite(space.id);
  }, [favoriteScale, onToggleFavorite, space.id]);

  const handlePress = useCallback(() => {
    onPress(space.id);
  }, [onPress, space.id]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          transform: [{ scale }],
        },
      ]}
    >
      <Pressable onPressIn={animatePressIn} onPressOut={animatePressOut} onPress={handlePress}>
        <View style={styles.imageContainer}>
          {space.logoUrl || space.imageUrl ? (
            <Image source={{ uri: space.logoUrl ?? space.imageUrl ?? undefined }} style={styles.cardImage} contentFit="cover" transition={250} />
          ) : (
            <View style={[styles.cardImage, styles.imageFallback]}>
              <Ionicons name="storefront-outline" size={26} color={tc.fg("rgba(0,0,0,0.20)")} />
            </View>
          )}

          <LinearGradient
            colors={tc.bgs(["rgba(0,0,0,0.04)", "rgba(0,0,0,0.08)", "rgba(0,0,0,0.68)"])}
            style={styles.imageGradient}
          />

          <Animated.View
            style={[
              styles.favoriteButtonWrapper,
              {
                transform: [{ scale: favoriteScale }],
              },
            ]}
          >
            <Pressable onPress={handleFavorite} style={styles.favoriteButton} hitSlop={8}>
              <BlurView intensity={55} tint={tc.dark ? "dark" : "light"} style={styles.favoriteBlur}>
                <Ionicons
                  name={favorite ? "heart" : "heart-outline"}
                  size={18}
                  color={tc.fg(favorite ? "#FF3B30" : COLORS.black)}
                />
              </BlurView>
            </Pressable>
          </Animated.View>

          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color={tc.fg("#FF9500")} />

            <Text style={styles.ratingText}>{space.ratingAvg !== null ? space.ratingAvg.toFixed(1) : "Novo"}</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {space.name}
            </Text>

            <Ionicons name="arrow-forward" size={16} color={tc.fg(COLORS.softMuted)} />
          </View>

          {space.category ? (
            <Text style={styles.serviceText} numberOfLines={1}>
              {space.category}
            </Text>
          ) : null}

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={tc.fg(COLORS.muted)} />

            <Text style={styles.locationText} numberOfLines={1}>
              {space.address ?? "—"}
            </Text>
          </View>

          <View style={styles.cardBottomRow}>
            <Text style={styles.priceText}>
              {space.ratingCount > 0 ? `${space.ratingCount} avaliações` : "Sem avaliações"}
            </Text>

            {space.distanceKm !== null ? (
              <Text style={styles.reviewsText}>{formatDistance(space.distanceKm)}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

SpaceCard.displayName = "SpaceCard";

export default function SpacesScreen() {
  const { tc, styles } = useThemed(createStyles);
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);

  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  const [results, setResults] = useState<BusinessDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    category: "Todos",
    radiusKm: null,
    maxPrice: null,
    minRating: null,
  });

  const [draftFilters, setDraftFilters] = useState<Filters>(filters);

  const [sortMode, setSortMode] = useState<SortMode>("recommended");

  const [filterVisible, setFilterVisible] = useState(false);

  // Debounce search text so every keystroke doesn't fire a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // "nearest" only means something with the device's location — requested lazily, the
  // first time it's actually needed, rather than on screen mount.
  const ensureCoordinates = useCallback(async () => {
    if (coordinates) return coordinates;
    const current = await getCurrentCoordinates();
    setCoordinates(current);
    return current;
  }, [coordinates]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const data = await listBusinesses({
          category: filters.category !== "Todos" ? filters.category : undefined,
          search: debouncedSearch || undefined,
          maxPrice: filters.maxPrice ?? undefined,
          minRating: filters.minRating ?? undefined,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
          radiusKm: filters.radiusKm ?? undefined,
          sortBy: sortMode,
          limit: 30,
        });
        if (!cancelled) setResults(data.data);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [filters, debouncedSearch, sortMode, coordinates]);

  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (filters.category !== "Todos") count += 1;
    if (filters.radiusKm !== null) count += 1;
    if (filters.maxPrice !== null) count += 1;
    if (filters.minRating !== null) count += 1;

    return count;
  }, [filters]);

  const navigateToSpace = useCallback(
    (businessId: string) => {
      router.push({ pathname: "/space", params: { businessId } } as any);
    },
    [router],
  );

  const openFilters = useCallback(() => {
    setDraftFilters(filters);
    setFilterVisible(true);
  }, [filters]);

  const closeFilters = useCallback(() => {
    setFilterVisible(false);
  }, []);

  const applyFilters = useCallback(() => {
    setFilters(draftFilters);
    closeFilters();
  }, [draftFilters, closeFilters]);

  const clearFilters = useCallback(() => {
    const emptyFilters: Filters = {
      category: "Todos",
      radiusKm: null,
      maxPrice: null,
      minRating: null,
    };

    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  }, []);

  const resetEverything = useCallback(() => {
    setSearch("");
    clearFilters();
    setSortMode("recommended");
  }, [clearFilters]);

  const selectQuickCategory = useCallback((category: string) => {
    setFilters((current) => ({
      ...current,
      category,
    }));
  }, []);

  const selectSortMode = useCallback(
    async (mode: SortMode) => {
      if (mode === "nearest") {
        const current = await ensureCoordinates();
        if (!current) return; // permission denied — stay on the current mode
      }
      setSortMode(mode);
    },
    [ensureCoordinates],
  );

  const renderSpace = useCallback(
    ({ item }: { item: BusinessDTO }) => (
      <SpaceCard
        space={item}
        favorite={isFavorite(item.id)}
        onToggleFavorite={toggleFavorite}
        onPress={navigateToSpace}
      />
    ),
    [isFavorite, toggleFavorite, navigateToSpace],
  );

  const keyExtractor = useCallback((item: BusinessDTO) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={tc.dark ? "light-content" : "dark-content"} backgroundColor={tc.bg(COLORS.background)} />

      <View style={styles.container}>
        {/* HEADER — SOMENTE PESQUISA */}
        <View style={styles.topBar}>
          <Pressable onPress={() => setSearchVisible(true)} style={styles.searchHeaderButton} hitSlop={10}>
            <Ionicons name="search-outline" size={22} color={tc.fg(COLORS.black)} />
          </Pressable>
        </View>

        <FlatList
          data={results}
          keyExtractor={keyExtractor}
          renderItem={renderSpace}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          ListHeaderComponent={
            <>
              {/* LOCATION */}
              <Pressable style={styles.locationSelector} onPress={() => void ensureCoordinates()}>
                <View style={styles.locationIconBox}>
                  <Ionicons name="location" size={17} color={tc.fg(COLORS.black)} />
                </View>

                <View style={styles.locationInfo}>
                  <Text style={styles.locationCaption}>LOCALIZAÇÃO</Text>

                  <Text style={styles.locationValue}>{coordinates ? "Perto de si" : "Ativar localização"}</Text>
                </View>

                {!coordinates && <Ionicons name="chevron-forward" size={17} color={tc.fg(COLORS.muted)} />}
              </Pressable>

              {/* CATEGORIES */}
              <View style={styles.categorySection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScroll}
                >
                  {CATEGORIES.map((category) => {
                    const active = filters.category === category.label;

                    return (
                      <Pressable
                        key={category.label}
                        onPress={() => selectQuickCategory(category.label)}
                        style={[styles.categoryItem, active && styles.categoryItemActive]}
                      >
                        <Ionicons name={category.icon} size={16} color={tc.fg(active ? COLORS.white : COLORS.text)} />

                        <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{category.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* CONTROLS */}
              <View style={styles.controlsRow}>
                <Pressable
                  style={[styles.controlButton, activeFilterCount > 0 && styles.controlButtonActive]}
                  onPress={openFilters}
                >
                  <Ionicons
                    name="funnel-outline"
                    size={15}
                    color={tc.fg(activeFilterCount > 0 ? COLORS.white : COLORS.text)}
                  />

                  <Text style={[styles.controlText, activeFilterCount > 0 && styles.controlTextActive]}>Filtros</Text>

                  {activeFilterCount > 0 && (
                    <View style={styles.filterCount}>
                      <Text style={styles.filterCountText}>{activeFilterCount}</Text>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* RESULT HEADER */}
              <View style={styles.resultHeader}>
                <View>
                  <Text style={styles.resultTitle}>Espaços</Text>

                  <Text style={styles.resultSubtitle}>
                    {loading ? "A carregar…" : `${results.length} disponíve${results.length === 1 ? "l" : "is"}`}
                  </Text>
                </View>

                {(search.length > 0 || activeFilterCount > 0) && (
                  <Pressable onPress={resetEverything} style={styles.resetButton}>
                    <Text style={styles.resetButtonText}>Limpar</Text>
                  </Pressable>
                )}
              </View>

              {/* SORT */}
              <View style={styles.sortRow}>
                {SORT_MODES.map((option) => {
                  const active = sortMode === option.mode;

                  return (
                    <Pressable
                      key={option.mode}
                      onPress={() => void selectSortMode(option.mode)}
                      style={[styles.sortChip, active && styles.sortChipActive]}
                    >
                      <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>A carregar espaços…</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={25} color={tc.fg(COLORS.muted)} />
                </View>

                <Text style={styles.emptyTitle}>Nenhum espaço encontrado</Text>

                <Text style={styles.emptyText}>Tente alterar a pesquisa ou os filtros.</Text>

                <Pressable style={styles.emptyButton} onPress={resetEverything}>
                  <Text style={styles.emptyButtonText}>Limpar filtros</Text>
                </Pressable>
              </View>
            )
          }
        />

        {/* SEARCH MODAL */}
        <Modal
          visible={searchVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setSearchVisible(false)}
        >
          <View style={styles.searchModalRoot}>
            <Pressable style={styles.searchModalBackdrop} onPress={() => setSearchVisible(false)} />

            <View style={styles.searchPanel}>
              <BlurView intensity={80} tint="systemChromeMaterialLight" style={StyleSheet.absoluteFill} />
              <View style={styles.searchPanelRow}>
                <View style={styles.searchPanelInputWrap}>
                  <Ionicons name="search" size={17} color={tc.fg("#8E8E93")} />

                  <TextInput
                    autoFocus
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Pesquisar espaços ou serviços"
                    placeholderTextColor={tc.fg("#8E8E93")}
                    style={styles.searchPanelInput}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />

                  {search.length > 0 && (
                    <Pressable onPress={() => setSearch("")} hitSlop={8}>
                      <Ionicons name="close-circle" size={17} color={tc.fg("#8E8E93")} />
                    </Pressable>
                  )}
                </View>

                <Pressable onPress={() => setSearchVisible(false)} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.searchDoneText}>OK</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* FILTER MODAL */}
        <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={closeFilters}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalBackdrop} onPress={closeFilters} />

            <View style={styles.bottomSheet}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Filtros</Text>

                  <Text style={styles.sheetSubtitle}>Personalize a sua descoberta</Text>
                </View>

                <Pressable onPress={closeFilters} style={styles.sheetClose}>
                  <Ionicons name="close" size={19} color={tc.fg(COLORS.text)} />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                {/* RATING */}
                <Text style={styles.filterLabel}>Avaliação mínima</Text>

                <View style={styles.filterOptions}>
                  {[4, 4.5, 4.8].map((rating) => {
                    const active = draftFilters.minRating === rating;

                    return (
                      <Pressable
                        key={rating}
                        onPress={() =>
                          setDraftFilters((current) => ({
                            ...current,
                            minRating: active ? null : rating,
                          }))
                        }
                        style={[styles.filterChip, active && styles.filterChipActive]}
                      >
                        <Ionicons name="star" size={13} color={tc.fg(active ? COLORS.white : "#FF9500")} />

                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                          {rating.toFixed(1)}+
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* PRICE */}
                <Text style={[styles.filterLabel, styles.filterLabelSpacing]}>Preço máximo</Text>

                <View style={styles.filterOptions}>
                  {[5000, 10000, 15000, 20000].map((price) => {
                    const active = draftFilters.maxPrice === price;

                    return (
                      <Pressable
                        key={price}
                        onPress={() =>
                          setDraftFilters((current) => ({
                            ...current,
                            maxPrice: active ? null : price,
                          }))
                        }
                        style={[styles.filterChip, active && styles.filterChipActive]}
                      >
                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                          {new Intl.NumberFormat("pt-AO").format(price)} Kz
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* DISTANCE */}
                <Text style={[styles.filterLabel, styles.filterLabelSpacing]}>Distância máxima</Text>

                <View style={styles.filterOptions}>
                  {[2, 5, 10, 20].map((distance) => {
                    const active = draftFilters.radiusKm === distance;

                    return (
                      <Pressable
                        key={distance}
                        onPress={() =>
                          setDraftFilters((current) => ({
                            ...current,
                            radiusKm: active ? null : distance,
                          }))
                        }
                        style={[styles.filterChip, active && styles.filterChipActive]}
                      >
                        <Ionicons
                          name="location-outline"
                          size={13}
                          color={tc.fg(active ? COLORS.white : COLORS.text)}
                        />

                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                          {distance} km
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View style={styles.filterActions}>
                <Pressable onPress={clearFilters} style={styles.clearButton}>
                  <Text style={styles.clearButtonText}>Limpar</Text>
                </Pressable>

                <Pressable onPress={applyFilters} style={styles.applyButton}>
                  <Text style={styles.applyButtonText}>Aplicar filtros</Text>

                  <Ionicons name="arrow-forward" size={17} color={tc.fg(COLORS.white)} />
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (tc: ThemeRoles) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: tc.bg(COLORS.background),
    },

    container: {
      flex: 1,
      backgroundColor: tc.bg(COLORS.background),
    },

    /* HEADER */

    topBar: {
      height: 58,
      paddingHorizontal: 18,
      alignItems: "flex-end",
      justifyContent: "center",
      backgroundColor: tc.bg(COLORS.background),
    },

    searchHeaderButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.line),
    },

    /* LIST */

    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 40,
    },

    columnWrapper: {
      justifyContent: "space-between",
      marginBottom: 14,
    },

    /* LOCATION */

    locationSelector: {
      minHeight: 68,
      borderRadius: 20,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.line),
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },

    locationIconBox: {
      width: 42,
      height: 42,
      borderRadius: 15,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
    },

    locationInfo: {
      flex: 1,
      marginLeft: 11,
    },

    locationCaption: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: tc.fg(COLORS.softMuted),
      marginBottom: 3,
    },

    locationValue: {
      fontSize: 14,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    /* CATEGORIES */

    categorySection: {
      marginBottom: 14,
    },

    categoryScroll: {
      paddingRight: 8,
      gap: 8,
    },

    categoryItem: {
      height: 39,
      paddingHorizontal: 13,
      borderRadius: 20,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.line),
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    categoryItemActive: {
      backgroundColor: tc.bg(COLORS.black),
      borderColor: tc.border(COLORS.black),
    },

    categoryText: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    categoryTextActive: {
      color: tc.fg(COLORS.white),
    },

    /* CONTROLS */

    controlsRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 18,
    },

    controlButton: {
      minHeight: 39,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.line),
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },

    controlButtonActive: {
      backgroundColor: tc.bg(COLORS.black),
      borderColor: tc.border(COLORS.black),
    },

    controlText: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    controlTextActive: {
      color: tc.fg(COLORS.white),
    },

    filterCount: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      alignItems: "center",
      justifyContent: "center",
    },

    filterCountText: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg(COLORS.black),
    },

    /* RESULT HEADER */

    resultHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 13,
    },

    resultTitle: {
      fontSize: 22,
      fontWeight: "700",
      letterSpacing: -0.5,
      color: tc.fg(COLORS.text),
    },

    resultSubtitle: {
      marginTop: 2,
      fontSize: 11,
      fontWeight: "500",
      color: tc.fg(COLORS.muted),
    },

    resetButton: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 10,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.line),
    },

    resetButtonText: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    /* SORT */

    sortRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 18,
    },

    sortChip: {
      paddingHorizontal: 13,
      paddingVertical: 9,
      borderRadius: 13,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.line),
    },

    sortChipActive: {
      backgroundColor: tc.bg(COLORS.black),
      borderColor: tc.border(COLORS.black),
    },

    sortChipText: {
      fontSize: 10.5,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    sortChipTextActive: {
      color: tc.fg(COLORS.white),
    },

    /* CARD */

    card: {
      width: "48.5%",
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      overflow: "hidden",
      borderWidth: 1,
      borderColor: tc.border(COLORS.line),
    },

    imageContainer: {
      width: "100%",
      height: 166,
      position: "relative",
      overflow: "hidden",
    },

    cardImage: {
      width: "100%",
      height: "100%",
    },

    imageFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("#F2F2F7"),
    },

    imageGradient: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },

    favoriteButtonWrapper: {
      position: "absolute",
      top: 9,
      right: 9,
    },

    favoriteButton: {
      width: 37,
      height: 37,
      borderRadius: 14,
      borderCurve: "continuous",
      overflow: "hidden",
    },

    favoriteBlur: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    ratingBadge: {
      position: "absolute",
      right: 10,
      bottom: 10,
      height: 24,
      paddingHorizontal: 8,
      borderRadius: 9,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(0,0,0,0.72)"),
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    ratingText: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg(COLORS.white),
    },

    cardContent: {
      padding: 11,
      paddingBottom: 13,
    },

    cardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    cardTitle: {
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    serviceText: {
      marginTop: 4,
      fontSize: 10,
      fontWeight: "600",
      color: tc.fg(COLORS.muted),
    },

    locationRow: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    locationText: {
      flex: 1,
      fontSize: 9,
      fontWeight: "500",
      color: tc.fg(COLORS.muted),
    },

    cardBottomRow: {
      marginTop: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    priceText: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    reviewsText: {
      fontSize: 8,
      fontWeight: "500",
      color: tc.fg(COLORS.softMuted),
    },

    /* SEARCH MODAL */

    searchModalRoot: {
      flex: 1,
      backgroundColor: tc.bg("transparent"),
    },

    searchModalBackdrop: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: tc.bg("rgba(0,0,0,0.25)"),
    },

    searchPanel: {
      // Barra de pesquisa do iOS presa ao topo, em material translúcido.
      paddingTop: 58,
      paddingBottom: 10,
      paddingHorizontal: 16,
      overflow: "hidden",
      backgroundColor: tc.bg("rgba(249,249,249,0.72)"),
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: tc.border("rgba(0,0,0,0.3)"),
    },

    searchPanelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    searchPanelInputWrap: {
      flex: 1,
      height: 36,
      borderRadius: 10,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(118,118,128,0.12)"),
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
    },

    searchPanelInput: {
      flex: 1,
      marginLeft: 6,
      paddingVertical: 0,
      fontSize: 17,
      letterSpacing: -0.41,
      color: tc.fg(COLORS.text),
    },

    searchDoneText: {
      fontSize: 17,
      fontWeight: "600",
      letterSpacing: -0.41,
      color: tc.fg("#2E67B3"),
    },
    searchCloseButton: {
      paddingHorizontal: 4,
    },

    /* MODALS */

    modalRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },

    modalBackdrop: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: tc.bg("rgba(0,0,0,0.42)"),
    },

    bottomSheet: {
      maxHeight: "88%",
      backgroundColor: tc.bg(COLORS.white),
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingTop: 10,
      paddingHorizontal: 18,
      paddingBottom: 18,
    },

    sheetHandle: {
      alignSelf: "center",
      width: 38,
      height: 4,
      borderRadius: 3,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#D1D1D6"),
      marginBottom: 18,
    },

    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },

    sheetTitle: {
      fontSize: 21,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
      letterSpacing: -0.4,
    },

    sheetSubtitle: {
      marginTop: 4,
      fontSize: 11,
      fontWeight: "500",
      color: tc.fg(COLORS.muted),
    },

    sheetClose: {
      width: 38,
      height: 38,
      borderRadius: 13,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
    },

    /* FILTER */

    filterContent: {
      paddingBottom: 15,
    },

    filterLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
      marginBottom: 10,
    },

    filterLabelSpacing: {
      marginTop: 20,
    },

    filterOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },

    filterChip: {
      minHeight: 38,
      paddingHorizontal: 12,
      borderRadius: 13,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      borderWidth: 1,
      borderColor: tc.border(COLORS.line),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },

    filterChipActive: {
      backgroundColor: tc.bg(COLORS.black),
      borderColor: tc.border(COLORS.black),
    },

    filterChipText: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    filterChipTextActive: {
      color: tc.fg(COLORS.white),
    },

    filterActions: {
      flexDirection: "row",
      gap: 9,
      paddingTop: 13,
    },

    clearButton: {
      width: 90,
      height: 51,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
    },

    clearButtonText: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    applyButton: {
      flex: 1,
      height: 51,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.black),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    applyButtonText: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.white),
    },

    /* EMPTY */

    emptyState: {
      minHeight: 300,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
    },

    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 20,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.line),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },

    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
      textAlign: "center",
    },

    emptyText: {
      marginTop: 6,
      fontSize: 11,
      fontWeight: "500",
      color: tc.fg(COLORS.muted),
      textAlign: "center",
    },

    emptyButton: {
      marginTop: 18,
      height: 43,
      paddingHorizontal: 17,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.black),
      alignItems: "center",
      justifyContent: "center",
    },

    emptyButtonText: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.white),
    },
  });
