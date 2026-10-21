import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  useWindowDimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FavoriteDTO } from "@slotix/types";
import { normalizeText } from "@slotix/types";

import { Skeleton } from "@/components/HomeWidgets";
import { useIOSColors } from "@/components/ios";
import { CircleButton, CollapsingTopBar, Reveal } from "@/components/ScreenChrome";
import { RowGroup, SpaceRow, placeText, ratingText } from "@/components/SpaceCards";
import { Typography } from "@/constants/theme";
import { tapFeedback } from "@/services/haptics";
import { useFavorites } from "../contexts/FavoritesContext";
import { useT } from "@/i18n";

if (Platform.OS === "android") UIManager.setLayoutAnimationEnabledExperimental?.(true);

type Layout = "grid" | "list";

/* Cartão da grelha: fotografia alta com o nome por cima, como uma coleção da App Store. */
function FavoriteCard({
  item,
  width,
  onOpen,
  onRemove,
}: {
  item: FavoriteDTO;
  width: number;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const colors = useIOSColors();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue === 1 ? 6 : 0 }).start();
  const space = item.business;
  const photo = space.imageUrl ?? space.logoUrl;
  const place = placeText(space);

  return (
    <Pressable
      onPress={onOpen}
      onPressIn={() => spring(0.96)}
      onPressOut={() => spring(1)}
      accessibilityRole="button"
      accessibilityLabel={space.name}
    >
      <Animated.View
        style={[styles.card, { width, height: width * 1.32, backgroundColor: colors.backgroundSelected, transform: [{ scale }] }]}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
        ) : (
          <View style={styles.cardPlaceholder}>
            <Ionicons name="storefront-outline" size={32} color={colors.textTertiary} />
          </View>
        )}
        <LinearGradient
          colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0)", "rgba(0,0,0,0.05)", "rgba(0,0,0,0.8)"]}
          locations={[0, 0.25, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.cardTop}>
          <View style={styles.glassPill}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="star" size={11} color="#FFCC00" />
            <Text style={styles.glassPillText}>{ratingText(space)}</Text>
          </View>
          <Pressable
            onPress={onRemove}
            hitSlop={10}
            style={styles.heartButton}
            accessibilityRole="button"
            accessibilityLabel={t("Remover dos favoritos")}
          >
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="heart" size={17} color="#FF3B30" />
          </Pressable>
        </View>

        <View style={styles.cardBottom}>
          {space.category ? <Text style={styles.cardCategory}>{t(space.category).toUpperCase()}</Text> : null}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {space.name}
          </Text>
          {place ? (
            <View style={styles.cardPlace}>
              <Ionicons name="location" size={11} color="rgba(255,255,255,0.8)" />
              <Text style={styles.cardPlaceText} numberOfLines={1}>
                {place}
              </Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export default function FavoritesScreen() {
  const t = useT();
  const router = useRouter();
  const colors = useIOSColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { favorites, loading, toggleFavorite } = useFavorites();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [layout, setLayout] = useState<Layout>("grid");
  const [removed, setRemoved] = useState<FavoriteDTO | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const toast = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const columns = width >= 700 ? 3 : 2;
  const gap = 12;
  const cardWidth = (Math.min(width, 900) - 32 - gap * (columns - 1)) / columns;

  // As categorias vêm dos próprios favoritos, não de uma lista fixa, cada uma com quantos tem.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of favorites) {
      const name = item.business.category;
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const named = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b, "pt"));
    return [{ name: "Todos", count: favorites.length }, ...named.map(([name, count]) => ({ name, count }))];
  }, [favorites]);

  useEffect(() => {
    if (!categories.some((item) => item.name === category)) setCategory("Todos");
  }, [categories, category]);

  const visible = useMemo(() => {
    const target = normalizeText(query);
    return favorites.filter((item) => {
      if (category !== "Todos" && item.business.category !== category) return false;
      if (!target) return true;
      return normalizeText(
        `${item.business.name} ${item.business.address ?? ""} ${item.business.category ?? ""}`,
      ).includes(target);
    });
  }, [favorites, query, category]);

  const showToast = (item: FavoriteDTO) => {
    setRemoved(item);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.spring(toast, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toast, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setRemoved(null));
    }, 3500);
  };

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const remove = (item: FavoriteDTO) => {
    tapFeedback();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void toggleFavorite(item.businessId);
    showToast(item);
  };

  const undo = () => {
    if (!removed) return;
    tapFeedback();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void toggleFavorite(removed.businessId);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.timing(toast, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setRemoved(null));
  };

  const switchLayout = () => {
    tapFeedback();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLayout((current) => (current === "grid" ? "list" : "grid"));
  };

  const selectCategory = (name: string) => {
    if (name === category) return;
    tapFeedback();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCategory(name);
  };

  const open = (item: FavoriteDTO) =>
    router.push({ pathname: "/space", params: { businessId: item.businessId } } as never);

  const layoutButton =
    favorites.length > 0 ? (
      <CircleButton
        icon={layout === "grid" ? "list" : "grid"}
        label={layout === "grid" ? t("Ver em lista") : t("Ver em grelha")}
        onPress={switchLayout}
      />
    ) : null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + (favorites.length > 0 ? 52 : 6) }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        {favorites.length > 0 ? (
          <>
            <View style={[styles.searchField, { backgroundColor: colors.card }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("Pesquisar nos favoritos")}
                placeholderTextColor={colors.textSecondary}
                selectionColor={colors.primary}
                autoCorrect={false}
                returnKeyType="search"
                style={[styles.searchInput, { color: colors.text }]}
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityLabel={t("Limpar")}>
                  <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                </Pressable>
              ) : null}
            </View>

            {categories.length > 2 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chips}
              >
                {categories.map(({ name, count }) => {
                  const active = name === category;
                  return (
                    <Pressable
                      key={name}
                      onPress={() => selectCategory(name)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      {({ pressed }) => (
                        <View
                          style={[
                            styles.chip,
                            { backgroundColor: active ? colors.text : colors.card, transform: [{ scale: pressed ? 0.95 : 1 }] },
                          ]}
                        >
                          <Text style={[styles.chipText, { color: active ? colors.background : colors.text }]}>{t(name)}</Text>
                          <View
                            style={[
                              styles.chipCount,
                              { backgroundColor: active ? "rgba(127,127,127,0.35)" : colors.backgroundSelected },
                            ]}
                          >
                            <Text style={[styles.chipCountText, { color: active ? colors.background : colors.textSecondary }]}>
                              {count}
                            </Text>
                          </View>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </>
        ) : null}

        {loading && favorites.length === 0 ? (
          <View style={[styles.grid, { columnGap: gap }]}>
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} width={cardWidth} height={cardWidth * 1.32} radius={22} />
            ))}
          </View>
        ) : favorites.length === 0 ? (
          <Reveal index={1}>
            <View style={styles.state}>
              <LinearGradient colors={["#FF6B6B", "#FF2D55"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyIcon}>
                <Ionicons name="heart" size={40} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.stateTitle, { color: colors.text }]}>{t("Ainda sem favoritos")}</Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>
                {t("Toque no coração de um espaço para o guardar e voltar a ele mais tarde.")}
              </Text>
              <Pressable onPress={() => router.replace("/explore" as never)} accessibilityRole="button">
                {({ pressed }) => (
                  <View style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}>
                    <Ionicons name="compass" size={18} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>{t("Explorar espaços")}</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </Reveal>
        ) : visible.length === 0 ? (
          <View style={styles.state}>
            <View style={[styles.emptyIconMuted, { backgroundColor: colors.card }]}>
              <Ionicons name="search" size={30} color={colors.textTertiary} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.text }]}>{t("Sem resultados")}</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>{t("Nenhum favorito corresponde à pesquisa.")}</Text>
          </View>
        ) : layout === "grid" ? (
          <View style={[styles.grid, { columnGap: gap }]}>
            {visible.map((item, index) => (
              <Reveal key={item.id} index={index}>
                <FavoriteCard item={item} width={cardWidth} onOpen={() => open(item)} onRemove={() => remove(item)} />
              </Reveal>
            ))}
          </View>
        ) : (
          <Reveal index={0}>
            <RowGroup>
              {visible.map((item) => (
                <SpaceRow
                  key={item.id}
                  space={item.business}
                  favorite
                  onFavorite={() => remove(item)}
                  onPress={() => open(item)}
                />
              ))}
            </RowGroup>
          </Reveal>
        )}
      </Animated.ScrollView>

      {/* O botão de grelha/lista vive na barra de topo: continua à mão depois de a página subir. */}
      <CollapsingTopBar scrollY={scrollY} title="" right={layoutButton} />

      {removed ? (
        <Animated.View
          style={[
            styles.toast,
            {
              bottom: insets.bottom + 100,
              opacity: toast,
              transform: [
                { translateY: toast.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                { scale: toast.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
              ],
            },
          ]}
        >
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          {removed.business.imageUrl || removed.business.logoUrl ? (
            <Image
              source={{ uri: removed.business.imageUrl ?? removed.business.logoUrl ?? undefined }}
              style={styles.toastImage}
              contentFit="cover"
            />
          ) : (
            <Ionicons name="heart-dislike" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.toastText} numberOfLines={1}>
            {removed.business.name} {t("removido")}
          </Text>
          <Pressable onPress={undo} hitSlop={10} accessibilityRole="button">
            <Text style={styles.toastAction}>{t("Anular")}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
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
    maxWidth: 900,
    alignSelf: "center",
  },
  searchField: {
    height: 46,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: 0,
  },
  chipsScroll: {
    marginHorizontal: -16,
    marginTop: 12,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    height: 34,
    borderRadius: 17,
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chipText: {
    ...Typography.subheadline,
    fontWeight: "600",
  },
  chipCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  chipCountText: {
    ...Typography.caption2,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 12,
    marginTop: 18,
  },
  card: {
    borderRadius: 22,
    borderCurve: "continuous",
    overflow: "hidden",
    justifyContent: "space-between",
  },
  cardPlaceholder: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
  },
  glassPill: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  glassPillText: {
    ...Typography.caption1,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heartButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  cardBottom: {
    padding: 12,
    gap: 2,
  },
  cardCategory: {
    ...Typography.caption2,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: "rgba(255,255,255,0.75)",
  },
  cardTitle: {
    ...Typography.headline,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardPlace: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  cardPlaceText: {
    ...Typography.caption1,
    color: "rgba(255,255,255,0.8)",
    flexShrink: 1,
  },
  state: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 30,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#FF2D55",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  emptyIconMuted: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  stateTitle: {
    ...Typography.title3,
    fontWeight: "700",
    textAlign: "center",
  },
  stateText: {
    ...Typography.subheadline,
    textAlign: "center",
    marginBottom: 14,
  },
  primaryButton: {
    height: 50,
    paddingHorizontal: 26,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: {
    ...Typography.headline,
    color: "#FFFFFF",
  },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 56,
    borderRadius: 18,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(30,30,30,0.6)",
  },
  toastImage: {
    width: 34,
    height: 34,
    borderRadius: 9,
  },
  toastText: {
    ...Typography.subheadline,
    fontWeight: "500",
    color: "#FFFFFF",
    flex: 1,
  },
  toastAction: {
    ...Typography.headline,
    color: "#0A84FF",
  },
});
