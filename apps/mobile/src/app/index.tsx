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
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BusinessDTO } from "@slotix/types";

import { useIOSColors } from "@/components/ios";
import {
  Skeleton,
  UpcomingAppointmentCard,
  useReduceMotion,
  useUnreadCount,
  useUpcomingAppointment,
} from "@/components/HomeWidgets";
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

// "Bom dia", "Boa tarde" ou "Boa noite", conforme a hora do telemóvel.
function greeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 19) return "Boa tarde";
  return "Boa noite";
}

// Entrada em cascata: cada secção sobe e aparece um pouco depois da anterior.
function Reveal({ index, children }: { index: number; children: React.ReactNode }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      delay: 80 * index,
      useNativeDriver: true,
      speed: 10,
      bounciness: 4,
    }).start();
  }, [index, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
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
  const { user, isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { coordinates: myPosition, place: myPlace, requestPosition, chooseNearMe } = useSelectedLocation();
  const reduceMotion = useReduceMotion();
  const unread = useUnreadCount(isAuthenticated);
  const { upcoming, reload: reloadUpcoming } = useUpcomingAppointment(isAuthenticated);
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";

  const [featured, setFeatured] = useState<BusinessDTO[]>([]);
  const [topRated, setTopRated] = useState<BusinessDTO[]>([]);
  const [nearby, setNearby] = useState<BusinessDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slide, setSlide] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const heroScrollX = useRef(new Animated.Value(0)).current;
  const heroRef = useRef<ScrollView>(null);
  const heroDragging = useRef(false);

  const heroWidth = Math.min(width - 32, 560);
  const heroGap = 12;

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
        // "Mais bem avaliados" são os espaços que muitas pessoas puseram nos favoritos: só
        // entram os que têm gostos de uma boa parte de quem usa a app (a API faz a conta).
        listBusinesses({ sortBy: "mostFavorited", popular: true, limit: 12, ...around }),
      ]);
      setFeatured(featuredResult.data);
      setTopRated(topResult.data);
    } catch {
      // Cada secção mostra o que conseguiu carregar; uma secção vazia simplesmente não aparece.
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        heroRef.current?.scrollTo({ x: next * (heroWidth + heroGap), animated: true });
        return next;
      });
    }, 5000);

    return () => clearInterval(timer);
  }, [heroSpaces.length, heroWidth, reduceMotion]);

  const onHeroEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / (heroWidth + heroGap));
    // Um toque leve só quando é a pessoa a mudar de cartão, não no avanço automático.
    if (heroDragging.current && next !== slide) tapFeedback();
    heroDragging.current = false;
    setSlide(next);
  };

  const openSpace = (space: BusinessDTO) =>
    router.push({ pathname: "/space", params: { businessId: space.id } } as never);

  // Barra de topo translúcida que aparece quando a página sobe, como no iOS; o cabeçalho
  // grande sobe e desvanece ao mesmo tempo, e o título passa para a barra.
  const headerOpacity = scrollY.interpolate({ inputRange: [40, 90], outputRange: [0, 1], extrapolate: "clamp" });
  const greetingOpacity = scrollY.interpolate({ inputRange: [0, 60], outputRange: [1, 0], extrapolate: "clamp" });
  const greetingShift = scrollY.interpolate({ inputRange: [-80, 0, 60], outputRange: [12, 0, -10], extrapolate: "clamp" });

  const step = heroWidth + heroGap;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textSecondary} />}
      >
        {/* Cabeçalho: saudação, onde a pessoa está, avisos e perfil */}
        <Animated.View style={[styles.header, { opacity: greetingOpacity, transform: [{ translateY: greetingShift }] }]}>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{t(greeting())}</Text>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {firstName || t("Início")}
            </Text>
            <Pressable
              onPress={myPosition ? undefined : () => void requestPosition()}
              disabled={!!myPosition}
              hitSlop={6}
              accessibilityRole={myPosition ? "text" : "button"}
            >
              {({ pressed }) => (
                <View style={[styles.place, { opacity: pressed ? 0.5 : 1 }]}>
                  <Ionicons
                    name={myPosition ? "location" : "location-outline"}
                    size={13}
                    color={myPosition ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.placeText, { color: myPosition ? colors.text : colors.primary }]} numberOfLines={1}>
                    {myPosition ? (myPlace ?? t("Perto de ti")) : t("Ativar localização")}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push("/perfil/notifications")}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={unread > 0 ? t("Notificações, {0} por ler", [unread]) : t("Notificações")}
          >
            {({ pressed }) => (
              <View style={[styles.circleButton, { backgroundColor: colors.card, opacity: pressed ? 0.6 : 1 }]}>
                <Ionicons name={unread > 0 ? "notifications" : "notifications-outline"} size={20} color={colors.text} />
                {unread > 0 ? (
                  <View style={[styles.badge, { borderColor: colors.background }]}>
                    <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => router.replace("/profile" as never)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t("Perfil")}
          >
            {({ pressed }) => (
              <View style={{ opacity: pressed ? 0.6 : 1 }}>
                <UserAvatar size={40} />
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* Pesquisa e atalho para o mapa */}
        <Reveal index={0}>
          <View style={styles.searchRow}>
            <Pressable onPress={() => router.push("/search")} style={styles.flex} accessibilityRole="search">
              {({ pressed }) => (
                <View style={[styles.searchBar, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}>
                  <Ionicons name="search" size={18} color={colors.textSecondary} />
                  <Text style={[styles.searchPlaceholder, { color: colors.textSecondary }]} numberOfLines={1}>
                    {t("Serviços, espaços, zonas…")}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable onPress={() => router.push("/mapa" as never)} accessibilityLabel={t("Ver os espaços no mapa")} hitSlop={6}>
              {({ pressed }) => (
                <View style={[styles.mapButton, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}>
                  <Ionicons name="map" size={19} color={colors.primary} />
                </View>
              )}
            </Pressable>
          </View>
        </Reveal>

        {upcoming ? (
          <Reveal index={1}>
            <View style={styles.upcoming}>
              <UpcomingAppointmentCard item={upcoming} onPress={() => router.push("/appointments" as never)} />
            </View>
          </Reveal>
        ) : null}

        {loading && heroSpaces.length === 0 ? (
          <View style={styles.heroSpacing}>
            <Skeleton width={heroWidth} height={heroWidth * 1.08} radius={22} />
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
                // Os cartões laterais ficam ligeiramente mais pequenos: profundidade ao deslizar.
                const scale = heroScrollX.interpolate({
                  inputRange: [(index - 1) * step, index * step, (index + 1) * step],
                  outputRange: [0.94, 1, 0.94],
                  extrapolate: "clamp",
                });
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
                          width: heroScrollX.interpolate({ inputRange, outputRange: [7, 20, 7], extrapolate: "clamp" }),
                          opacity: heroScrollX.interpolate({ inputRange, outputRange: [0.25, 1, 0.25], extrapolate: "clamp" }),
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
              {CATEGORIES.map((category, index) => (
                <PopIn key={category.name} index={index}>
                <Pressable
                  onPress={() => {
                    tapFeedback();
                    router.replace({ pathname: "/explore", params: { category: category.name } } as never);
                  }}
                  accessibilityRole="button"
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
          // Lugar guardado para "Perto de ti" e "Mais bem avaliados" enquanto os dados chegam.
          <View style={styles.section}>
            <Skeleton width={140} height={24} radius={8} />
            <View style={[styles.tiles, styles.skeletonRow]}>
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiles}>
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
                  <Ionicons name={myPosition ? "location-outline" : "navigate-outline"} size={22} color={colors.textSecondary} />
                  <Text style={[styles.nearbyNoteText, { color: colors.textSecondary }]}>
                    {myPosition
                      ? t("Ainda não há espaços a menos de {0} km de ti.", [NEARBY_RADIUS_KM])
                      : t("Ativa a localização para veres os espaços perto de ti.")}
                  </Text>
                  {!myPosition ? (
                    <Pressable onPress={() => void requestPosition()} hitSlop={8} accessibilityRole="button">
                      {({ pressed }) => (
                        <Text style={[styles.nearbyNoteAction, { color: colors.primary, opacity: pressed ? 0.4 : 1 }]}>{t("Ativar")}</Text>
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
                {bestSpaces.map((space) => (
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
          </Reveal>
        ) : null}

        {!loading && heroSpaces.length === 0 && bestSpaces.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="storefront-outline" size={44} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("Ainda sem espaços registados")}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t("Volte mais tarde para descobrir novos espaços.")}
            </Text>
          </View>
        ) : null}
      </Animated.ScrollView>

      {/* Barra translúcida no topo ao fazer scroll */}
      <Animated.View pointerEvents="none" style={[styles.topBar, { height: insets.top + 44, opacity: headerOpacity }]}>
        <BlurView intensity={80} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
        <Text style={[styles.topBarTitle, { color: colors.text, marginTop: insets.top }]}>{t("Início")}</Text>
        <View style={[styles.topBarBorder, { backgroundColor: colors.divider }]} />
      </Animated.View>

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
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    ...Typography.subheadline,
    fontWeight: "500",
  },
  name: {
    ...Typography.largeTitle,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  place: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  placeText: {
    ...Typography.footnote,
    fontWeight: "600",
    flexShrink: 1,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 18,
  },
  searchBar: {
    height: 46,
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchPlaceholder: {
    ...Typography.body,
    flex: 1,
  },
  mapButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  upcoming: {
    marginTop: 20,
  },
  heroSpacing: {
    marginTop: 24,
  },
  skeletonRow: {
    flexDirection: "row",
    marginTop: 12,
    overflow: "hidden",
  },
  skeletonTile: {
    gap: 8,
  },
  heroList: {
    paddingRight: 4,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  section: {
    marginTop: 32,
  },
  categories: {
    gap: 18,
    paddingRight: 16,
  },
  category: {
    alignItems: "center",
    gap: 8,
    width: 84,
  },
  categoryIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
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
    paddingRight: 16,
  },
  nearbyNote: {
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nearbyNoteText: {
    ...Typography.subheadline,
    flex: 1,
  },
  nearbyNoteAction: {
    ...Typography.subheadline,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    ...Typography.title3,
    textAlign: "center",
    marginTop: 8,
  },
  emptyText: {
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
