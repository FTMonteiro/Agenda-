import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { FavoriteDTO } from "@slotix/types";

import { useIOSColors } from "@/components/ios";
import { ratingText } from "@/components/SpaceCards";
import { Typography } from "@/constants/theme";
import { normalizeText } from "@slotix/types";
import { useFavorites } from "../contexts/FavoritesContext";
import { useT } from "@/i18n";

if (Platform.OS === "android") UIManager.setLayoutAnimationEnabledExperimental?.(true);

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

  return (
    <Pressable
      onPress={onOpen}
      onPressIn={() => spring(0.96)}
      onPressOut={() => spring(1)}
      accessibilityRole="button"
      accessibilityLabel={space.name}
    >
      <Animated.View style={{ width, transform: [{ scale }] }}>
        <View style={[styles.cardImage, { height: width * 1.15, backgroundColor: colors.backgroundSelected }]}>
          {space.imageUrl ? (
            <Image
              source={{ uri: space.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={250}
            />
          ) : (
            <View style={styles.cardPlaceholder}>
              <Ionicons name="storefront-outline" size={32} color={colors.textTertiary} />
            </View>
          )}
          <Pressable
            onPress={onRemove}
            hitSlop={10}
            style={styles.heartButton}
            accessibilityLabel={t("Remover dos favoritos")}
          >
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="heart" size={17} color="#FF3B30" />
          </Pressable>
          <View style={styles.ratingBadge}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="star" size={11} color="#FFCC00" />
            <Text style={styles.ratingText}>{ratingText(space)}</Text>
          </View>
        </View>
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {space.name}
        </Text>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {t(space.category) ?? space.address ?? t("Espaço")}
        </Text>
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
  const [removed, setRemoved] = useState<FavoriteDTO | null>(null);
  const toast = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const columns = width >= 700 ? 3 : 2;
  const cardWidth = (Math.min(width, 900) - 32 - 14 * (columns - 1)) / columns;

  // As categorias vêm dos próprios favoritos, não de uma lista fixa.
  const categories = useMemo(() => {
    const names = new Set(
      favorites.map((item) => item.business.category).filter((name): name is string => Boolean(name)),
    );
    return ["Todos", ...[...names].sort((a, b) => a.localeCompare(b, "pt"))];
  }, [favorites]);

  useEffect(() => {
    if (!categories.includes(category)) setCategory("Todos");
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void toggleFavorite(item.businessId);
    showToast(item);
  };

  const undo = () => {
    if (!removed) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    void toggleFavorite(removed.businessId);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    Animated.timing(toast, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setRemoved(null));
  };

  const open = (item: FavoriteDTO) =>
    router.push({ pathname: "/space", params: { businessId: item.businessId } } as never);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {favorites.length === 0
            ? t("Os espaços que guardar aparecem aqui.")
            : `${favorites.length} ${favorites.length === 1 ? t("espaço guardado") : t("espaços guardados")}`}
        </Text>

        {favorites.length > 0 ? (
          <>
            <View style={[styles.searchField, { backgroundColor: colors.input }]}>
              <Ionicons name="search" size={17} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("Pesquisar nos favoritos")}
                placeholderTextColor={colors.textSecondary}
                selectionColor={colors.primary}
                autoCorrect={false}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {query ? (
                <Pressable onPress={() => setQuery("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
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
                {categories.map((name) => {
                  const active = name === category;
                  return (
                    <Pressable key={name} onPress={() => setCategory(name)}>
                      <View style={[styles.chip, { backgroundColor: active ? colors.text : colors.card }]}>
                        <Text style={[styles.chipText, { color: active ? colors.background : colors.text }]}>
                          {t(name)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </>
        ) : null}

        {loading && favorites.length === 0 ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.textSecondary} />
          </View>
        ) : favorites.length === 0 ? (
          <View style={styles.state}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.errorBackground }]}>
              <Ionicons name="heart" size={38} color={colors.error} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.text }]}>{t("Ainda sem favoritos")}</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              {t("Toque no coração de um espaço para o guardar e voltar a ele mais tarde.")}
            </Text>
            <Pressable onPress={() => router.replace("/explore" as never)} accessibilityRole="button">
              {({ pressed }) => (
                <View style={[styles.exploreButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}>
                  <Text style={styles.exploreButtonText}>{t("Explorar espaços")}</Text>
                </View>
              )}
            </Pressable>
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.state}>
            <Ionicons name="search" size={40} color={colors.textTertiary} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>{t("Sem resultados")}</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>
              {t("Nenhum favorito corresponde à pesquisa.")}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {visible.map((item) => (
              <FavoriteCard
                key={item.id}
                item={item}
                width={cardWidth}
                onOpen={() => open(item)}
                onRemove={() => remove(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {removed ? (
        <Animated.View
          style={[
            styles.toast,
            {
              bottom: insets.bottom + 100,
              opacity: toast,
              transform: [{ translateY: toast.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <Text style={styles.toastText} numberOfLines={1}>
            {removed.business.name}{" "}{t("removido")}
          </Text>
          <Pressable onPress={undo} hitSlop={10}>
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
  largeTitle: {
    ...Typography.largeTitle,
  },
  subtitle: {
    ...Typography.subheadline,
    marginTop: 2,
    marginBottom: 16,
  },
  searchField: {
    height: 40,
    borderRadius: 12,
    borderCurve: "continuous",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  searchInput: {
    ...Typography.body,
    flex: 1,
    paddingVertical: 0,
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
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  chipText: {
    ...Typography.subheadline,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 14,
    rowGap: 20,
    marginTop: 4,
  },
  cardImage: {
    borderRadius: 18,
    borderCurve: "continuous",
    overflow: "hidden",
    marginBottom: 8,
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
  heartButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  ratingBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  ratingText: {
    ...Typography.caption1,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cardTitle: {
    ...Typography.headline,
  },
  cardMeta: {
    ...Typography.footnote,
    marginTop: 1,
  },
  state: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  stateTitle: {
    ...Typography.title3,
    textAlign: "center",
  },
  stateText: {
    ...Typography.subheadline,
    textAlign: "center",
    marginBottom: 12,
  },
  exploreButton: {
    height: 50,
    paddingHorizontal: 28,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  exploreButtonText: {
    ...Typography.headline,
    color: "#FFFFFF",
  },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 52,
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(30,30,30,0.6)",
  },
  toastText: {
    ...Typography.subheadline,
    color: "#FFFFFF",
    flex: 1,
  },
  toastAction: {
    ...Typography.headline,
    color: "#0A84FF",
  },
});
