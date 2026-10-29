import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BusinessDTO } from "@slotix/types";

import { useIOSColors } from "@/components/ios";
import {
  NotificationBell,
  Skeleton,
  UpcomingAppointmentCard,
  useReduceMotion,
  useUpcomingAppointment,
} from "@/components/HomeWidgets";
import { CollapsingTopBar, Reveal } from "@/components/ScreenChrome";
import { HeroSpaceCard, RowGroup, SectionTitle, SpaceRow, SpaceTile } from "@/components/SpaceCards";
import { UserAvatar } from "@/components/UserAvatar";
import { CATEGORIES } from "@/constants/categories";
import { Typography } from "@/constants/theme";
import { tapFeedback } from "@/services/haptics";
import { useAuth } from "../contexts/AuthContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { NEAR_ME_RADIUS_KM, useSelectedLocation } from "../contexts/LocationContext";
import { listBusinesses } from "../services/businesses";
import { useT } from "@/i18n";

import type { ScrollViewInstance } from "react-native";
// A secção "Perto de ti" mostra só os espaços até esta distância de onde a pessoa está agora.
const NEARBY_RADIUS_KM = NEAR_ME_RADIUS_KM;

// Cada categoria "salta" para o lugar, uma a seguir à outra. Só na entrada: depois fica
// quieta, para não competir com o conteúdo nem gastar bateria.
function PopIn({ index, children }: { index: number; children: React.ReactNode }) {
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, delay: 250 + index * 60, speed: 12, bounciness: 8, useNativeDriver: true }).start();
  }, [enter, index]);

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function HomeScreen() {
  const t = useT();
  const router = useRouter();
  const colors = useIOSColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { coordinates: myPosition, requestPosition, chooseNearMe } = useSelectedLocation();
  const reduceMotion = useReduceMotion();
  const { upcoming, reload: reloadUpcoming } = useUpcomingAppointment(isAuthenticated);

  const [featured, setFeatured] = useState<BusinessDTO[]>([]);
  const [topRated, setTopRated] = useState<BusinessDTO[]>([]);
  const [nearby, setNearby] = useState<BusinessDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slide, setSlide] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const heroScrollX = useRef(new Animated.Value(0)).current;
  const heroRef = useRef<ScrollViewInstance>(null);
  const heroDragging = useRef(false);

  const heroWidth = Math.min(width - 32, 560);
  const heroGap = 12;
  const step = heroWidth + heroGap;

  // A posição arredondada (~1 km para as outras secções, ~100 m para "Perto de ti"): evita
  // repetir pedidos a cada pequena leitura do GPS.
  const aroundLatitude = myPosition ? Number(myPosition.latitude.toFixed(2)) : null;
  const aroundLongitude = myPosition ? Number(myPosition.longitude.toFixed(2)) : null;
  const nearLatitude = myPosition ? Number(myPosition.latitude.toFixed(3)) : null;
  const nearLongitude = myPosition ? Number(myPosition.longitude.toFixed(3)) : null;

  const load = useCallback(async () => {
    try {
      // Com a posição da pessoa, cada espaço vem com a distância até lá.
      const around =
        aroundLatitude !== null && aroundLongitude !== null ? { latitude: aroundLatitude, longitude: aroundLongitude } : {};
      const [featuredResult, topResult] = await Promise.all([
        listBusinesses({ sortBy: "recommended", limit: 12, ...around }),
        // "Mais bem avaliados" é pelas estrelas: só entram espaços com pelo menos uma
        // avaliação, ordenados pela média ponderada (a API não deixa uma única nota 5
        // passar à frente de um espaço com muitas notas altas).
        listBusinesses({ sortBy: "topRated", minRating: 1, limit: 12, ...around }),
      ]);
      setFeatured(featuredResult.data);
      setTopRated(topResult.data);
    } catch {
      // Cada secção mostra o que conseguiu carregar; uma secção vazia simplesmente não aparece.
    } finally {
      setLoading(false);
    }
  }, [aroundLatitude, aroundLongitude]);

  useEffect(() => {
    void load();
  }, [load]);

  // Pede a localização ao telemóvel (uma vez); depois o contexto segue a pessoa e é com essa
  // posição que os outros ecrãs calculam distâncias. Recusar não impede nada: só não há "perto".
  useEffect(() => {
    if (!myPosition) void requestPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Perto de ti" volta a ser pedido sempre que a pessoa se desloca (~100 m).
  const loadNearby = useCallback(async () => {
    if (nearLatitude === null || nearLongitude === null) {
      setNearby([]);
      return;
    }
    try {
      const nearbyResult = await listBusinesses({
        latitude: nearLatitude,
        longitude: nearLongitude,
        radiusKm: NEARBY_RADIUS_KM,
        sortBy: "nearest",
        limit: 12,
      });
      setNearby(nearbyResult.data);
    } catch {
      // fica a lista anterior
    }
  }, [nearLatitude, nearLongitude]);

  useEffect(() => {
    void loadNearby();
  }, [loadNearby]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), loadNearby(), isAuthenticated ? reloadUpcoming() : null]);
    setRefreshing(false);
  };

  // "Em destaque"/"Recomendado": só os espaços com favoritos, os mais favoritos primeiro.
  const heroSpaces = useMemo(() => featured.filter((space) => space.favoriteCount > 0).slice(0, 5), [featured]);
  // "Perto de ti" é sempre à volta da pessoa, seja qual for a província escolhida no topo;
  // só entram espaços com o ponto marcado (sem ele não há distância para comparar).
  const nearbySpaces = useMemo(
    () => nearby.filter((space) => space.distanceKm !== null && space.distanceKm <= NEARBY_RADIUS_KM),
    [nearby],
  );
  const bestSpaces = useMemo(() => topRated.slice(0, 5), [topRated]);

  // O carrossel avança sozinho a cada 5 s, exceto enquanto a pessoa o está a arrastar
  // ou com "Reduzir movimento" ligado.
  useEffect(() => {
    if (heroSpaces.length < 2 || reduceMotion) return;

    const timer = setInterval(() => {
      if (heroDragging.current) return;
      setSlide((current) => {
        const next = (current + 1) % heroSpaces.length;
        heroRef.current?.scrollTo({ x: next * step, animated: true });
        return next;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [heroSpaces.length, step, reduceMotion]);

  const onHeroEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / step);
    // Um toque leve só quando é a pessoa a mudar de cartão, não no avanço automático.
    if (heroDragging.current && next !== slide) tapFeedback();
    heroDragging.current = false;
    setSlide(next);
  };

  const openSpace = (space: BusinessDTO) =>
    router.push({ pathname: "/space", params: { businessId: space.id } } as never);

  // O cabeçalho sobe e desvanece com a página; o título passa para a barra de topo.
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 50], outputRange: [1, 0], extrapolate: "clamp" });
  const headerShift = scrollY.interpolate({ inputRange: [-80, 0, 50], outputRange: [10, 0, -8], extrapolate: "clamp" });

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 6 }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textSecondary} />}
      >
        {/* Cabeçalho: só os avisos e o perfil, à direita */}
        <Animated.View style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerShift }] }]}>
          <View style={styles.headerActions}>
            <NotificationBell />
            <Pressable
              onPress={() => router.replace("/profile" as never)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t("Perfil")}
            >
              {({ pressed }) => (
                <View style={[styles.avatarRing, { borderColor: colors.card, opacity: pressed ? 0.6 : 1 }]}>
                  <UserAvatar size={36} />
                </View>
              )}
            </Pressable>
          </View>
        </Animated.View>

        {upcoming ? (
          <Reveal index={1}>
            <View style={styles.upcoming}>
              <UpcomingAppointmentCard item={upcoming} onPress={() => router.push("/appointments" as never)} />
            </View>
          </Reveal>
        ) : null}

        {loading && heroSpaces.length === 0 ? (
          <View style={styles.heroSkeleton}>
            <Skeleton width={heroWidth} height={heroWidth * 1.08} radius={24} />
          </View>
        ) : heroSpaces.length > 0 ? (
          <Reveal index={2}>
            <ScrollView
              ref={heroRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={step}
              decelerationRate="fast"
              style={styles.heroSpacing}
              contentContainerStyle={styles.heroList}
              onScrollBeginDrag={() => (heroDragging.current = true)}
              onMomentumScrollEnd={onHeroEnd}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: heroScrollX } } }], {
                useNativeDriver: false,
              })}
              scrollEventThrottle={16}
            >
              {heroSpaces.map((space, index) => {
                const inputRange = [(index - 1) * step, index * step, (index + 1) * step];
                // Os cartões laterais ficam ligeiramente mais pequenos e a fotografia desliza
                // mais devagar do que o cartão: profundidade ao deslizar.
                const scale = heroScrollX.interpolate({ inputRange, outputRange: [0.93, 1, 0.93], extrapolate: "clamp" });
                const parallax = heroScrollX.interpolate({ inputRange, outputRange: [-36, 0, 36], extrapolate: "clamp" });
                return (
                  <Animated.View key={space.id} style={{ marginRight: heroGap, transform: [{ scale }] }}>
                    <HeroSpaceCard
                      space={space}
                      width={heroWidth}
                      height={heroWidth * 1.08}
                      eyebrow={index === 0 ? t("Em destaque") : t("Recomendado")}
                      favorite={isFavorite(space.id)}
                      onFavorite={() => void toggleFavorite(space.id)}
                      onPress={() => openSpace(space)}
                      parallax={parallax}
                    />
                  </Animated.View>
                );
              })}
            </ScrollView>
            {heroSpaces.length > 1 ? (
              <View style={styles.dots}>
                {/* O indicador acompanha o dedo: estica e acende à medida que o cartão entra. */}
                {heroSpaces.map((space, index) => {
                  const inputRange = [(index - 1) * step, index * step, (index + 1) * step];
                  return (
                    <Animated.View
                      key={space.id}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: colors.text,
                          width: heroScrollX.interpolate({ inputRange, outputRange: [7, 22, 7], extrapolate: "clamp" }),
                          opacity: heroScrollX.interpolate({ inputRange, outputRange: [0.22, 1, 0.22], extrapolate: "clamp" }),
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ) : null}
          </Reveal>
        ) : null}

        <Reveal index={3}>
          <View style={styles.section}>
            <SectionTitle title={t("Categorias")} action={t("Ver tudo")} onAction={() => router.replace("/explore" as never)} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.bleed}
              contentContainerStyle={styles.categories}
            >
              {CATEGORIES.map((category, index) => (
                <PopIn key={category.name} index={index}>
                  <Pressable
                    onPress={() => {
                      tapFeedback();
                      router.replace({ pathname: "/explore", params: { category: category.name } } as never);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t(category.name)}
                  >
                    {({ pressed }) => (
                      <View style={[styles.category, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
                        <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                          <Image source={category.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                        </View>
                        <Text style={[styles.categoryLabel, { color: colors.text }]} numberOfLines={2}>
                          {t(category.name)}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </PopIn>
              ))}
            </ScrollView>
          </View>
        </Reveal>

        {loading ? (
          // Lugar guardado para "Perto de ti" enquanto os dados chegam.
          <View style={styles.section}>
            <Skeleton width={140} height={24} radius={8} />
            <View style={styles.skeletonRow}>
              {[0, 1].map((key) => (
                <View key={key} style={styles.skeletonTile}>
                  <Skeleton width={220} height={158} radius={16} />
                  <Skeleton width={150} height={16} radius={6} />
                  <Skeleton width={110} height={13} radius={6} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Reveal index={4}>
            <View style={styles.section}>
              <SectionTitle
                title={t("Perto de ti")}
                action={nearbySpaces.length > 0 ? t("Ver tudo") : undefined}
                onAction={async () => {
                  // "Ver tudo" abre o Explorar já em "Perto": só os espaços à volta da pessoa.
                  await chooseNearMe();
                  router.replace({ pathname: "/explore", params: { sort: "nearest" } } as never);
                }}
              />
              {nearbySpaces.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.bleed}
                  contentContainerStyle={styles.tiles}
                  snapToInterval={234}
                  decelerationRate="fast"
                >
                  {nearbySpaces.map((space) => (
                    <SpaceTile
                      key={space.id}
                      space={space}
                      favorite={isFavorite(space.id)}
                      onFavorite={() => void toggleFavorite(space.id)}
                      onPress={() => openSpace(space)}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={[styles.nearbyNote, { backgroundColor: colors.card }]}>
                  <View style={[styles.nearbyIcon, { backgroundColor: colors.infoBackground }]}>
                    <Ionicons name={myPosition ? "location" : "navigate"} size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.nearbyNoteText, { color: colors.textSecondary }]}>
                    {myPosition
                      ? t("Ainda não há espaços a menos de {0} km de ti.", [NEARBY_RADIUS_KM])
                      : t("Ativa a localização para veres os espaços perto de ti.")}
                  </Text>
                  {!myPosition ? (
                    <Pressable onPress={() => void requestPosition()} hitSlop={8} accessibilityRole="button">
                      {({ pressed }) => (
                        <View style={[styles.nearbyAction, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
                          <Text style={styles.nearbyActionText}>{t("Ativar")}</Text>
                        </View>
                      )}
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>
          </Reveal>
        )}

        {bestSpaces.length > 0 ? (
          <Reveal index={5}>
            <View style={styles.section}>
              <SectionTitle title={t("Mais bem avaliados")} />
              <RowGroup>
                {bestSpaces.map((space, index) => (
                  <SpaceRow
                    key={space.id}
                    space={space}
                    rank={index + 1}
                    favorite={isFavorite(space.id)}
                    onFavorite={() => void toggleFavorite(space.id)}
                    onPress={() => openSpace(space)}
                  />
                ))}
              </RowGroup>
            </View>
          </Reveal>
        ) : null}

        {!loading && heroSpaces.length === 0 && bestSpaces.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
              <Ionicons name="storefront" size={34} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("Ainda sem espaços registados")}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("Volte mais tarde para descobrir novos espaços.")}
            </Text>
          </View>
        ) : null}
      </Animated.ScrollView>

      {/* Barra translúcida no topo ao fazer scroll */}
      <CollapsingTopBar scrollY={scrollY} title="" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 140,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarRing: {
    borderRadius: 22,
    borderWidth: 2,
  },
  upcoming: {
    marginTop: 14,
  },
  heroSkeleton: {
    marginTop: 18,
  },
  // O carrossel vai até à borda do ecrã; o primeiro cartão alinha com o resto da página.
  heroSpacing: {
    marginTop: 18,
    marginHorizontal: -16,
  },
  heroList: {
    paddingHorizontal: 16,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  section: {
    marginTop: 34,
  },
  // As filas horizontais vão até à borda do ecrã, como na App Store.
  bleed: {
    marginHorizontal: -16,
  },
  categories: {
    gap: 16,
    paddingHorizontal: 16,
  },
  category: {
    alignItems: "center",
    gap: 8,
    width: 80,
  },
  categoryIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderCurve: "continuous",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    ...Typography.footnote,
    fontWeight: "500",
    textAlign: "center",
  },
  tiles: {
    gap: 14,
    paddingHorizontal: 16,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 14,
    overflow: "hidden",
  },
  skeletonTile: {
    gap: 8,
  },
  nearbyNote: {
    borderRadius: 18,
    borderCurve: "continuous",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nearbyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyNoteText: {
    ...Typography.subheadline,
    flex: 1,
  },
  nearbyAction: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nearbyActionText: {
    ...Typography.subheadline,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  empty: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    ...Typography.title3,
    textAlign: "center",
  },
  emptyText: {
    ...Typography.subheadline,
    textAlign: "center",
  },
});
