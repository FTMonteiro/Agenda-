import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { formatDistance, type BusinessDTO, type GalleryImageDTO, type ProfessionalDTO, type ReviewDTO, type ServiceDTO } from "@slotix/types";

import {
  getBusiness,
  getBusinessGallery,
  getBusinessProfessionals,
  getBusinessReviews,
  getBusinessServices,
} from "../services/businesses";

import { useFavorites } from "../contexts/FavoritesContext";
import { PhotoCarousel } from "@/components/PhotoCarousel";
import { SpaceMap } from "@/components/SpaceMap";
import { openDirections } from "../services/maps";
import { getCoordinatesIfAllowed } from "../services/location";
import { useSelectedLocation } from "../contexts/LocationContext";
import { usePreferences } from "../contexts/PreferencesContext";
import { useThemed, type ThemeRoles } from "@/theme/roles";
import { useT, dateLocale } from "@/i18n";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MAP_HEIGHT = 190;

const COLORS = {
  background: "#F5F5F2",
  white: "#FFFFFF",
  black: "#000000",
  gold: "#A2845E",
  text: "#000000",
  muted: "#636366",
  soft: "#AEAEB2",
  border: "rgba(17,17,17,0.08)",
  glass: "rgba(255,255,255,0.72)",
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace("AOA", "Kz");

const formatReviewDate = (value: string) =>
  new Intl.DateTimeFormat(dateLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));

const GlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  const { tc, styles } = useThemed(createStyles);
  return (
    <View style={[styles.glassCard, style]}>
      <BlurView intensity={32} tint={tc.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />

      <LinearGradient
        colors={tc.bgs(["rgba(255,255,255,0.86)", "rgba(255,255,255,0.60)"])}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.glassTopLine} />

      {children}
    </View>
  );
};

const SectionHeader = ({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) => {
  const { tc, styles } = useThemed(createStyles);
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{number}</Text>
      </View>

      <View style={styles.sectionHeaderContent}>
        <Text style={styles.sectionTitle}>{title}</Text>

        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
};

const ServiceRow = ({ service, last }: { service: ServiceDTO; last: boolean }) => {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const { preferences } = usePreferences();
  return (
    <View style={[styles.listRow, !last && styles.listRowDivider]}>
      <View style={styles.listRowIcon}>
        <Ionicons name="cut-outline" size={19} color={tc.fg(COLORS.black)} />
      </View>

      <View style={styles.listRowInfo}>
        <Text style={styles.listRowName} numberOfLines={1}>
          {service.name}
        </Text>

        <Text style={styles.listRowMeta}>{service.duration}{" "}{t("min")}</Text>
      </View>

      {preferences.showPrices ? <Text style={styles.listRowPrice}>{formatPrice(service.price)}</Text> : null}
    </View>
  );
};

const ProfessionalRow = ({ professional, last }: { professional: ProfessionalDTO; last: boolean }) => {
  const { tc, styles } = useThemed(createStyles);
  return (
    <View style={[styles.listRow, !last && styles.listRowDivider]}>
      {professional.imageUrl ? (
        <Image source={{ uri: professional.imageUrl }} style={styles.professionalImage} />
      ) : (
        <View style={[styles.professionalImage, styles.imageFallbackSmall]}>
          <Ionicons name="person-outline" size={20} color={tc.fg(COLORS.soft)} />
        </View>
      )}

      <View style={styles.listRowInfo}>
        <Text style={styles.listRowName} numberOfLines={1}>
          {professional.name}
        </Text>

        {professional.specialty || professional.bio ? (
          <Text style={styles.listRowMeta} numberOfLines={1}>
            {professional.specialty ?? professional.bio}
          </Text>
        ) : null}
      </View>

      {professional.ratingAvg !== null ? (
        <View style={styles.professionalRating}>
          <Ionicons name="star" size={12} color={tc.fg(COLORS.gold)} />

          <Text style={styles.professionalRatingText}>{professional.ratingAvg.toFixed(1)}</Text>
        </View>
      ) : null}
    </View>
  );
};

const ReviewRow = ({ review, last }: { review: ReviewDTO; last: boolean }) => {
  const { tc, styles } = useThemed(createStyles);
  return (
    <View style={[styles.reviewRow, !last && styles.listRowDivider]}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewName} numberOfLines={1}>
          {review.clientName}
        </Text>

        <View style={styles.reviewRating}>
          <Ionicons name="star" size={12} color={tc.fg(COLORS.gold)} />

          <Text style={styles.reviewRatingText}>{review.rating}</Text>
        </View>
      </View>

      {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}

      <Text style={styles.reviewDate}>{formatReviewDate(review.createdAt)}</Text>
    </View>
  );
};

const SpaceScreen = () => {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const router = useRouter();

  const params = useLocalSearchParams<{ businessId?: string | string[] }>();
  const businessId = Array.isArray(params.businessId) ? params.businessId[0] : params.businessId;

  const { isFavorite, toggleFavorite } = useFavorites();

  const [business, setBusiness] = useState<BusinessDTO | null>(null);
  // Se a pessoa já tinha o espaço nos favoritos quando a contagem foi pedida: é o que
  // permite acertar o número no instante em que ela põe ou tira o gosto.
  const [favoriteAtLoad, setFavoriteAtLoad] = useState(false);
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalDTO[]>([]);
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [gallery, setGallery] = useState<GalleryImageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { coordinates: knownPosition, requestPosition } = useSelectedLocation();
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    if (!businessId) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);

      try {
        // A distância só é pedida se a pessoa já autorizou a localização; senão o ecrã
        // oferece "Ver distância", que é quando a autorização é pedida.
        const viewer = knownPosition ?? (await getCoordinatesIfAllowed());
        const businessData = await getBusiness(businessId as string, viewer);
        if (cancelled) return;
        setBusiness(businessData);
        setFavoriteAtLoad(isFavorite(businessData.id));

        const [servicesData, professionalsData, reviewsData, galleryData] = await Promise.all([
          getBusinessServices(businessId as string).catch(() => []),
          getBusinessProfessionals(businessId as string).catch(() => []),
          getBusinessReviews(businessId as string).catch(() => []),
          getBusinessGallery(businessId as string).catch(() => []),
        ]);

        if (cancelled) return;

        setServices(servicesData);
        setProfessionals(professionalsData);
        setReviews(reviewsData);
        setGallery(galleryData);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [businessId]);

  // Fotos postas na galeria pelo painel aparecem logo: a galeria é lida outra vez
  // sempre que se volta a este ecrã, não só na primeira abertura.
  useFocusEffect(
    useCallback(() => {
      if (!businessId) return;

      let cancelled = false;
      getBusinessGallery(businessId as string)
        .then((images) => {
          if (!cancelled) setGallery(images);
        })
        .catch(() => undefined);

      return () => {
        cancelled = true;
      };
    }, [businessId]),
  );

  const photos = useMemo(() => {
    if (gallery.length > 0) {
      return [...gallery].sort((a, b) => a.position - b.position).map((image) => image.url);
    }

    return business?.imageUrl ? [business.imageUrl] : [];
  }, [gallery, business]);

  const handleReserve = () => {
    if (!businessId) return;

    router.push({
      pathname: "/booking/service",
      params: { businessId },
    });
  };

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle={tc.dark ? "light-content" : "dark-content"} backgroundColor={tc.bg(COLORS.background)} />

        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.centerState}>
            <ActivityIndicator color={tc.fg(COLORS.black)} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error || !business || !businessId) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle={tc.dark ? "light-content" : "dark-content"} backgroundColor={tc.bg(COLORS.background)} />

        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.centerState}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle-outline" size={28} color={tc.fg(COLORS.muted)} />
            </View>

            <Text style={styles.errorTitle}>{t("Não foi possível carregar este espaço")}</Text>

            <Pressable onPress={() => router.back()} style={styles.errorButton}>
              <Text style={styles.errorButtonText}>{t("Voltar")}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // O mapa, a distância e o caminho só existem quando o dono marcou o ponto do espaço
  // no painel; sem ele o ecrã diz "Localização não disponível".
  const coordinates =
    business.latitude !== null && business.longitude !== null
      ? { latitude: business.latitude, longitude: business.longitude }
      : null;

  const handleDirections = async () => {
    if (!coordinates) return;
    const opened = await openDirections(coordinates, business.name);
    if (!opened) Alert.alert(t("Não foi possível abrir o mapa"), t("Não encontrámos uma aplicação de mapas neste telemóvel."));
  };

  // Pede a localização ao telemóvel e volta a ler o espaço, agora com a distância.
  const handleDistance = async () => {
    if (locating) return;
    setLocating(true);
    setLocationDenied(false);

    const position = await requestPosition();
    if (!position) {
      setLocationDenied(true);
    } else {
      try {
        setBusiness(await getBusiness(business.id, position));
        setFavoriteAtLoad(isFavorite(business.id));
      } catch {
        // sem ligação: fica sem distância, o resto do ecrã continua igual
      }
    }
    setLocating(false);
  };

  let sectionIndex = 0;
  const nextNumber = () => String(++sectionIndex).padStart(2, "0");

  // A contagem veio da API; o gosto da própria pessoa pode ter mudado entretanto.
  const likes = Math.max(0, business.favoriteCount + (isFavorite(business.id) ? 1 : 0) - (favoriteAtLoad ? 1 : 0));

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={tc.dark ? "light-content" : "dark-content"} backgroundColor={tc.bg(COLORS.background)} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <PhotoCarousel
            photos={photos}
            name={business.name}
            location={business.address ?? t(business.category)}
            ratingAvg={business.ratingAvg}
            ratingCount={business.ratingCount}
            favorite={isFavorite(businessId)}
            onFavorite={() => void toggleFavorite(businessId)}
          />

          {/* Quantas pessoas avaliaram o espaço e quantas o têm nos favoritos. */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <View style={styles.statValueRow}>
                <Ionicons name="star" size={16} color="#FFCC00" />
                <Text style={styles.statValue}>{business.ratingAvg !== null ? business.ratingAvg.toFixed(1) : "—"}</Text>
              </View>
              <Text style={styles.statLabel}>
                {business.ratingCount === 0
                  ? t("Sem avaliações")
                  : `${business.ratingCount} ${business.ratingCount === 1 ? t("avaliação") : t("avaliações")}`}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.stat}>
              <View style={styles.statValueRow}>
                <Ionicons name="heart" size={16} color="#FF3B30" />
                <Text style={styles.statValue}>{likes}</Text>
              </View>
              <Text style={styles.statLabel}>{likes === 1 ? t("pessoa tem nos favoritos") : t("pessoas têm nos favoritos")}</Text>
            </View>
          </View>

          {business.description ? (
            <View style={styles.section}>
              <SectionHeader number={nextNumber()} title={t("Sobre o espaço")} />

              <GlassCard style={styles.aboutCard}>
                <Text style={styles.aboutText}>{t(business.description)}</Text>
              </GlassCard>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeader
              number={nextNumber()}
              title={t("Localização")}
              subtitle={
                coordinates && business.distanceKm !== null ? t("{0} de distância", [formatDistance(business.distanceKm)]) : undefined
              }
            />

            <GlassCard>
              {coordinates ? (
                <SpaceMap
                  coordinates={coordinates}
                  title={business.name}
                  height={MAP_HEIGHT}
                  dark={tc.dark}
                  onPress={handleDirections}
                />
              ) : null}

              <View style={styles.locationRow}>
                <View style={styles.locationText}>
                  <Text style={styles.locationAddress}>
                    {coordinates ? (business.address ?? business.name) : t("Localização não disponível")}
                  </Text>

                  {!coordinates && business.address ? <Text style={styles.locationNote}>{business.address}</Text> : null}

                  {coordinates && business.distanceKm === null ? (
                    <Pressable onPress={handleDistance} disabled={locating} hitSlop={8} accessibilityRole="button">
                      <Text style={styles.locationLink}>{locating ? t("A obter a sua localização...") : t("Ver distância")}</Text>
                    </Pressable>
                  ) : null}

                  {locationDenied ? (
                    <Text style={styles.locationNote}>
                      {t("Sem acesso à sua localização. Autorize-a nas definições do telemóvel para ver a distância.")}
                    </Text>
                  ) : null}
                </View>

                {coordinates ? (
                  <Pressable
                    onPress={handleDirections}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.directionsButton, pressed && styles.reserveButtonPressed]}
                  >
                    <Ionicons name="navigate" size={15} color={tc.fg(COLORS.white)} />
                    <Text style={styles.directionsText}>{t("Como chegar")}</Text>
                  </Pressable>
                ) : null}
              </View>
            </GlassCard>
          </View>

          <View style={styles.section}>
            <SectionHeader
              number={nextNumber()}
              title={t("Serviços")}
              subtitle={
                services.length > 0
                  ? `${services.length} ${services.length === 1 ? t("serviço disponível") : t("serviços disponíveis")}`
                  : undefined
              }
            />

            {services.length > 0 ? (
              <GlassCard>
                {services.map((service, index) => (
                  <ServiceRow key={service.id} service={service} last={index === services.length - 1} />
                ))}
              </GlassCard>
            ) : (
              <Text style={styles.emptyText}>{t("Sem serviços disponíveis neste espaço.")}</Text>
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader
              number={nextNumber()}
              title={t("Profissionais")}
              subtitle={
                professionals.length > 0
                  ? `${professionals.length} ${professionals.length === 1 ? "profissional" : "profissionais"}`
                  : undefined
              }
            />

            {professionals.length > 0 ? (
              <GlassCard>
                {professionals.map((professional, index) => (
                  <ProfessionalRow
                    key={professional.id}
                    professional={professional}
                    last={index === professionals.length - 1}
                  />
                ))}
              </GlassCard>
            ) : (
              <Text style={styles.emptyText}>{t("Sem profissionais disponíveis neste espaço.")}</Text>
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader
              number={nextNumber()}
              title={t("Avaliações")}
              subtitle={
                reviews.length > 0
                  ? `${reviews.length} ${reviews.length === 1 ? t("avaliação") : t("avaliações")}`
                  : undefined
              }
            />

            {reviews.length > 0 ? (
              <GlassCard>
                {reviews.map((review, index) => (
                  <ReviewRow key={review.id} review={review} last={index === reviews.length - 1} />
                ))}
              </GlassCard>
            ) : (
              <Text style={styles.emptyText}>{t("Sem avaliações ainda.")}</Text>
            )}
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </SafeAreaView>

      <View style={styles.reserveBar}>
        <BlurView intensity={88} tint={tc.dark ? "dark" : "light"} style={styles.reserveBlur}>
          <Pressable
            onPress={handleReserve}
            style={({ pressed }) => [styles.reserveButton, pressed && styles.reserveButtonPressed]}
          >
            <Text style={styles.reserveButtonText}>{t("Reservar")}</Text>

            <View style={styles.reserveArrow}>
              <Ionicons name="arrow-forward" size={19} color={tc.fg(COLORS.white)} />
            </View>
          </Pressable>
        </BlurView>
      </View>
    </View>
  );
};

export default SpaceScreen;

const createStyles = (tc: ThemeRoles) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: tc.bg(COLORS.background),
    },

    safeArea: {
      flex: 1,
    },

    content: {
      paddingBottom: 36,
    },

    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
    },

    errorIcon: {
      width: 58,
      height: 58,
      borderRadius: 29,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(17,17,17,0.06)"),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },

    errorTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
      textAlign: "center",
    },

    errorButton: {
      marginTop: 18,
      height: 44,
      paddingHorizontal: 20,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.black),
      alignItems: "center",
      justifyContent: "center",
    },

    errorButtonText: {
      color: tc.fg(COLORS.white),
      fontSize: 12,
      fontWeight: "700",
    },

    carouselWrapper: {
      width: SCREEN_WIDTH,
      height: 410,
      position: "relative",
    },

    carouselImageWrapper: {
      width: SCREEN_WIDTH,
      height: 410,
      position: "relative",
      overflow: "hidden",
    },

    carouselImage: {
      width: "100%",
      height: "100%",
    },

    imageFallback: {
      backgroundColor: tc.bg("#2C2C2E"),
      alignItems: "center",
      justifyContent: "center",
    },

    imageFallbackSmall: {
      backgroundColor: tc.bg("rgba(17,17,17,0.06)"),
      alignItems: "center",
      justifyContent: "center",
    },

    favoriteButton: {
      position: "absolute",
      top: 20,
      right: 20,
      width: 46,
      height: 46,
      borderRadius: 23,
      borderCurve: "continuous",
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tc.border("rgba(255,255,255,0.20)"),
    },

    carouselBottom: {
      position: "absolute",
      left: 22,
      right: 22,
      bottom: 38,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },

    carouselBottomText: {
      flex: 1,
      minWidth: 0,
      marginRight: 12,
    },

    spaceLocation: {
      color: tc.fg("rgba(255,255,255,0.76)"),
      fontSize: 11,
      fontWeight: "500",
      marginBottom: 5,
    },

    spaceName: {
      color: tc.fg(COLORS.white),
      fontSize: 25,
      fontWeight: "700",
      letterSpacing: 0.2,
    },

    ratingContainer: {
      height: 35,
      paddingHorizontal: 11,
      borderRadius: 18,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(17,17,17,0.55)"),
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    ratingText: {
      color: tc.fg(COLORS.white),
      fontSize: 12,
      fontWeight: "700",
    },

    carouselIndicators: {
      position: "absolute",
      left: 22,
      right: 22,
      bottom: 16,
      height: 3,
      flexDirection: "row",
      gap: 5,
    },

    carouselIndicator: {
      flex: 1,
      height: 2,
      borderRadius: 2,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(255,255,255,0.30)"),
    },

    carouselIndicatorActive: {
      backgroundColor: tc.bg(COLORS.white),
    },

    section: {
      marginTop: 28,
      paddingHorizontal: 20,
    },

    stats: {
      marginTop: 16,
      marginHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 18,
      borderCurve: "continuous",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: tc.bg(COLORS.white),
    },

    stat: {
      flex: 1,
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 8,
    },

    statValueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    statValue: {
      fontSize: 20,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    statLabel: {
      fontSize: 12,
      textAlign: "center",
      color: tc.fg(COLORS.muted),
    },

    statDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: "stretch",
      backgroundColor: tc.border(COLORS.border),
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 13,
    },

    sectionNumber: {
      width: 29,
      height: 29,
      borderRadius: 15,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.black),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    sectionNumberText: {
      color: tc.fg(COLORS.white),
      fontSize: 9,
      fontWeight: "700",
    },

    sectionHeaderContent: {
      flex: 1,
    },

    sectionTitle: {
      color: tc.fg(COLORS.black),
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: -0.3,
    },

    sectionSubtitle: {
      marginTop: 3,
      color: tc.fg(COLORS.muted),
      fontSize: 11,
      lineHeight: 16,
    },

    glassCard: {
      borderRadius: 25,
      borderCurve: "continuous",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: tc.border("rgba(255,255,255,0.95)"),
      backgroundColor: tc.bg(COLORS.glass),
      position: "relative",
    },

    glassTopLine: {
      position: "absolute",
      top: 0,
      left: 18,
      right: 18,
      height: 1,
      backgroundColor: tc.bg("rgba(255,255,255,0.95)"),
      zIndex: 5,
    },

    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
    },

    locationText: {
      flex: 1,
    },

    locationNote: {
      marginTop: 4,
      color: tc.fg(COLORS.muted),
      fontSize: 12,
      lineHeight: 17,
    },

    locationLink: {
      marginTop: 6,
      color: tc.fg("#007AFF"),
      fontSize: 13,
      fontWeight: "600",
    },

    locationAddress: {
      color: tc.fg(COLORS.black),
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "500",
    },

    directionsButton: {
      height: 38,
      borderRadius: 19,
      paddingHorizontal: 14,
      backgroundColor: tc.bg(COLORS.black),
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    directionsText: {
      color: tc.fg(COLORS.white),
      fontSize: 13,
      fontWeight: "600",
    },

    aboutCard: {
      padding: 18,
    },

    aboutText: {
      fontSize: 13,
      lineHeight: 20,
      color: tc.fg(COLORS.text),
    },

    emptyText: {
      fontSize: 12,
      color: tc.fg(COLORS.muted),
      paddingHorizontal: 2,
    },

    listRow: {
      minHeight: 76,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
    },

    listRowDivider: {
      borderBottomWidth: 1,
      borderBottomColor: tc.border(COLORS.border),
    },

    listRowIcon: {
      width: 45,
      height: 45,
      borderRadius: 15,
      borderCurve: "continuous",
      marginRight: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("rgba(17,17,17,0.055)"),
    },

    professionalImage: {
      width: 45,
      height: 45,
      borderRadius: 15,
      borderCurve: "continuous",
      marginRight: 12,
    },

    listRowInfo: {
      flex: 1,
      minWidth: 0,
    },

    listRowName: {
      color: tc.fg(COLORS.black),
      fontSize: 13,
      fontWeight: "700",
    },

    listRowMeta: {
      marginTop: 4,
      color: tc.fg(COLORS.muted),
      fontSize: 11,
    },

    listRowPrice: {
      color: tc.fg(COLORS.black),
      fontSize: 12,
      fontWeight: "700",
      marginLeft: 8,
    },

    professionalRating: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginLeft: 8,
    },

    professionalRatingText: {
      color: tc.fg(COLORS.text),
      fontSize: 11,
      fontWeight: "700",
    },

    reviewRow: {
      paddingHorizontal: 16,
      paddingVertical: 14,
    },

    reviewHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    reviewName: {
      flex: 1,
      marginRight: 8,
      color: tc.fg(COLORS.black),
      fontSize: 13,
      fontWeight: "700",
    },

    reviewRating: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    reviewRatingText: {
      color: tc.fg(COLORS.text),
      fontSize: 11,
      fontWeight: "700",
    },

    reviewComment: {
      marginTop: 6,
      color: tc.fg(COLORS.text),
      fontSize: 12,
      lineHeight: 18,
    },

    reviewDate: {
      marginTop: 8,
      color: tc.fg(COLORS.soft),
      fontSize: 10,
      fontWeight: "600",
    },

    bottomSpace: {
      height: 100,
    },

    reserveBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      overflow: "hidden",
      borderTopWidth: 1,
      borderTopColor: tc.border("rgba(0,0,0,0.07)"),
    },

    reserveBlur: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 18,
    },

    reserveButton: {
      height: 58,
      borderRadius: 22,
      borderCurve: "continuous",
      paddingLeft: 24,
      paddingRight: 8,
      backgroundColor: tc.bg(COLORS.black),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    reserveButtonPressed: {
      opacity: 0.9,
    },

    reserveButtonText: {
      color: tc.fg(COLORS.white),
      fontSize: 14,
      fontWeight: "700",
    },

    reserveArrow: {
      width: 42,
      height: 42,
      borderRadius: 15,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.gold),
      alignItems: "center",
      justifyContent: "center",
    },
  });
