import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Image,
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { BusinessDTO, ServiceDTO } from "@slotix/types";
import { getBusiness, getBusinessServices } from "../../services/businesses";
import { useThemed, type ThemeRoles } from "@/theme/roles";
import { usePreferences } from "@/contexts/PreferencesContext";
import { useT } from "@/i18n";

const COLORS = {
  background: "#F5F5F2",
  white: "#FFFFFF",
  black: "#000000",
  text: "#1C1C1E",
  secondary: "#636366",
  muted: "#AEAEB2",
  blue: "#007AFF",
  blueSoft: "rgba(29, 99, 255, 0.07)",
  blueBorder: "rgba(29, 99, 255, 0.28)",
  gold: "#A2845E",
  border: "rgba(0, 0, 0, 0.07)",
};

const formatPrice = (value: number) => `${value.toLocaleString("pt-AO")} Kz`;

export default function BookingServiceScreen() {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const { preferences } = usePreferences();
  const router = useRouter();

  const params = useLocalSearchParams<{ businessId?: string | string[] }>();
  const businessId = Array.isArray(params.businessId) ? params.businessId[0] : params.businessId;

  const [business, setBusiness] = useState<BusinessDTO | null>(null);
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const continueScale = useRef(new Animated.Value(1)).current;
  const selectionOpacity = useRef(new Animated.Value(0)).current;
  const selectionTranslate = useRef(new Animated.Value(15)).current;

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
        const [businessData, servicesData] = await Promise.all([
          getBusiness(businessId as string),
          getBusinessServices(businessId as string),
        ]);

        if (cancelled) return;
        setBusiness(businessData);
        setServices(servicesData);
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

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(services.map((service) => service.category).filter((category): category is string => Boolean(category))),
    );

    return ["Todos", ...unique];
  }, [services]);

  const filteredServices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return services.filter((service) => {
      const matchesCategory = selectedCategory === "Todos" || service.category === selectedCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      return service.name.toLowerCase().includes(query) || (service.category?.toLowerCase().includes(query) ?? false);
    });
  }, [searchQuery, selectedCategory, services]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSelectService = useCallback(
    (service: ServiceDTO) => {
      setSelectedServiceId(service.id);

      selectionOpacity.setValue(0);
      selectionTranslate.setValue(15);

      Animated.parallel([
        Animated.timing(selectionOpacity, {
          toValue: 1,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.spring(selectionTranslate, {
          toValue: 0,
          damping: 18,
          stiffness: 180,
          mass: 0.7,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [selectionOpacity, selectionTranslate],
  );

  const handleContinuePress = useCallback(() => {
    if (!selectedService || !businessId) {
      return;
    }

    Animated.sequence([
      Animated.timing(continueScale, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),

      Animated.spring(continueScale, {
        toValue: 1,
        damping: 14,
        stiffness: 250,
        useNativeDriver: true,
      }),
    ]).start();

    router.push({
      pathname: "/booking/professional",
      params: {
        businessId,
        serviceId: selectedService.id,
      },
    });
  }, [businessId, continueScale, router, selectedService]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.centerState}>
            <ActivityIndicator color={tc.fg(COLORS.black)} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error || !business || !businessId) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.centerState}>
            <Text style={styles.errorTitle}>{t("Não foi possível carregar os serviços")}</Text>

            <Pressable onPress={handleBack} style={styles.errorButton}>
              <Text style={styles.errorButtonText}>{t("Voltar")}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          nestedScrollEnabled={false}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Pressable
              onPress={handleBack}
              hitSlop={8}
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
            >
              <BlurView intensity={70} tint={tc.dark ? "dark" : "light"} style={styles.headerButtonBlur}>
                <Ionicons name="arrow-back" size={20} color={tc.fg(COLORS.black)} />
              </BlurView>
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerEyebrow}>{t("AGENDAMENTO")}</Text>
              <Text style={styles.headerTitle}>{t("Escolha o serviço")}</Text>
            </View>

            <View style={styles.stepBadge}>
              <Text style={styles.stepCurrent}>1</Text>
              <Text style={styles.stepDivider}>/</Text>
              <Text style={styles.stepTotal}>4</Text>
            </View>
          </View>

          {/* PROGRESSO */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={styles.progressActive} />
            </View>

            <View style={styles.progressLabels}>
              <Text style={styles.progressActiveText}>{t("Serviço")}</Text>
              <Text style={styles.progressText}>{t("Profissional")}</Text>
              <Text style={styles.progressText}>{t("Data")}</Text>
              <Text style={styles.progressText}>{t("Confirmar")}</Text>
            </View>
          </View>

          {/* ESPAÇO */}
          <View style={styles.spaceCard}>
            <LinearGradient
              colors={tc.bgs(["rgba(255,255,255,0.96)", "rgba(248,248,245,0.92)"])}
              style={styles.spaceGradient}
            >
              {/* O logótipo do espaço onde se está a marcar */}
              {business.imageUrl ? (
                <Image source={{ uri: business.imageUrl }} style={styles.spaceLogo} />
              ) : (
                <View style={styles.spaceIcon}>
                  <Ionicons name="storefront" size={18} color={tc.fg(COLORS.gold)} />
                </View>
              )}

              <View style={styles.spaceInfo}>
                <Text style={styles.spaceLabel}>{t("ESPAÇO SELECIONADO")}</Text>

                <Text style={styles.spaceName} numberOfLines={1}>
                  {business.name}
                </Text>

                {business.address || business.category ? (
                  <View style={styles.spaceLocation}>
                    <Ionicons name="location-outline" size={13} color={tc.fg(COLORS.muted)} />

                    <Text style={styles.spaceLocationText} numberOfLines={1}>
                      {business.address ?? t(business.category)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {business.favoriteCount > 0 ? (
                <View style={styles.spaceRating}>
                  <Ionicons name="heart" size={12} color={tc.fg("#FF375F")} />

                  <Text style={styles.spaceRatingText}>{business.favoriteCount}</Text>
                </View>
              ) : null}
            </LinearGradient>
          </View>

          {/* INTRO */}
          <View style={styles.intro}>
            <Text style={styles.title}>{t("O que deseja fazer?")}</Text>

            <Text style={styles.subtitle}>{t("Escolha o serviço que melhor combina com a experiência que procura.")}</Text>
          </View>

          {/* PESQUISA */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Ionicons
                name="search-outline"
                size={19}
                color={tc.fg(searchQuery.length > 0 ? COLORS.blue : COLORS.muted)}
              />

              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t("Pesquisar serviço")}
                placeholderTextColor={tc.fg(COLORS.muted)}
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                keyboardType="default"
                clearButtonMode="never"
                selectionColor={COLORS.blue}
              />

              {searchQuery.length > 0 && (
                <Pressable onPress={handleClearSearch} hitSlop={10} style={styles.searchClearButton}>
                  <View style={styles.searchClearIcon}>
                    <Ionicons name="close" size={13} color={tc.fg(COLORS.secondary)} />
                  </View>
                </Pressable>
              )}
            </View>
          </View>

          {/* CATEGORIAS */}
          <View style={styles.categoryContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categories}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {categories.map((category) => {
                const active = selectedCategory === category;

                return (
                  <Pressable
                    key={category}
                    onPress={() => setSelectedCategory(category)}
                    style={({ pressed }) => [
                      styles.category,
                      active && styles.categoryActive,
                      pressed && styles.categoryPressed,
                    ]}
                  >
                    {active && <View style={styles.categoryDot} />}

                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>{t(category)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* RESULTADOS */}
          <View style={styles.servicesSection}>
            <View style={styles.servicesHeader}>
              <View>
                <Text style={styles.sectionTitle}>{t("Serviços disponíveis")}</Text>

                <Text style={styles.sectionSubtitle}>
                  {filteredServices.length} {filteredServices.length === 1 ? t("opção") : t("opções")}
                </Text>
              </View>
            </View>

            <View style={styles.servicesList}>
              {filteredServices.length > 0 ? (
                filteredServices.map((service, index) => {
                  const selected = selectedServiceId === service.id;

                  return (
                    <ServiceItem
                      key={service.id}
                      service={service}
                      selected={selected}
                      index={index}
                      onPress={() => handleSelectService(service)}
                    />
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIcon}>
                    <Ionicons name="search-outline" size={22} color={tc.fg(COLORS.muted)} />
                  </View>

                  <Text style={styles.emptyTitle}>{t("Nenhum serviço encontrado")}</Text>

                  <Text style={styles.emptyText}>
                    {t("Tente pesquisar outro termo ou selecione uma categoria diferente.")}
                  </Text>

                  {searchQuery.length > 0 && (
                    <Pressable onPress={handleClearSearch} style={styles.emptyButton}>
                      <Text style={styles.emptyButtonText}>{t("Limpar pesquisa")}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </SafeAreaView>

      {/* BARRA INFERIOR */}
      <View style={styles.bottomContainer}>
        <BlurView intensity={88} tint={tc.dark ? "dark" : "light"} style={styles.bottomBlur}>
          <Animated.View
            style={[
              styles.bottomContent,
              {
                opacity: selectedService
                  ? selectionOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.72, 1],
                    })
                  : 1,

                transform: [
                  {
                    translateY: selectedService ? selectionTranslate : 0,
                  },
                ],
              },
            ]}
          >
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>
                {selectedService ? t("Serviço selecionado") : t("Selecione um serviço")}
              </Text>

              <Text style={styles.summaryValue}>
                {!selectedService ? "—" : preferences.showPrices ? formatPrice(selectedService.price) : selectedService.name}
              </Text>
            </View>

            <Animated.View
              style={{
                transform: [{ scale: continueScale }],
              }}
            >
              <Pressable
                onPress={handleContinuePress}
                disabled={!selectedService}
                style={({ pressed }) => [
                  styles.continueButton,
                  !selectedService && styles.continueButtonDisabled,
                  pressed && selectedService && styles.continueButtonPressed,
                ]}
              >
                <Text style={[styles.continueText, !selectedService && styles.continueTextDisabled]}>{t("Continuar")}</Text>

                <Ionicons name="arrow-forward" size={18} color={tc.fg(selectedService ? "#FFFFFF" : "#AEAEB2")} />
              </Pressable>
            </Animated.View>
          </Animated.View>
        </BlurView>
      </View>
    </View>
  );
}

function ServiceItem({
  service,
  selected,
  index,
  onPress,
}: {
  service: ServiceDTO;
  selected: boolean;
  index: number;
  onPress: () => void;
}) {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const { preferences } = usePreferences();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.985,
      damping: 18,
      stiffness: 280,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      damping: 16,
      stiffness: 260,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.serviceWrapper, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.serviceCard,
          selected && styles.serviceCardSelected,
          pressed && styles.serviceCardPressed,
        ]}
      >
        <View style={[styles.serviceNumber, selected && styles.serviceNumberSelected]}>
          {selected ? (
            <Ionicons name="checkmark" size={17} color={tc.fg("#FFFFFF")} />
          ) : (
            <Text style={styles.serviceNumberText}>{String(index + 1).padStart(2, "0")}</Text>
          )}
        </View>

        <View style={[styles.serviceIcon, selected && styles.serviceIconSelected]}>
          <Ionicons name="cut-outline" size={21} color={tc.fg(selected ? COLORS.blue : COLORS.black)} />
        </View>

        <View style={styles.serviceInfo}>
          <View style={styles.serviceTitleRow}>
            <Text style={styles.serviceName} numberOfLines={1}>
              {service.name}
            </Text>
          </View>

          {service.description ? (
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {t(service.description)}
            </Text>
          ) : null}

          <View style={styles.serviceMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color={tc.fg(COLORS.muted)} />

              <Text style={styles.metaText}>{service.duration}{" "}{t("min")}</Text>
            </View>

            {service.category ? (
              <>
                <View style={styles.metaSeparator} />

                <Text style={styles.serviceCategory}>{service.category}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.priceArea}>
          {preferences.showPrices ? <Text style={styles.price}>{formatPrice(service.price)}</Text> : null}

          <View style={[styles.radio, selected && styles.radioSelected]}>
            {selected && <View style={styles.radioInner} />}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (tc: ThemeRoles) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tc.bg(COLORS.background),
    },

    safeArea: {
      flex: 1,
    },

    centerState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
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
      color: tc.fg("#FFFFFF"),
      fontSize: 12,
      fontWeight: "700",
    },

    mainScroll: {
      flex: 1,
    },

    scrollContent: {
      paddingBottom: 150,
    },

    header: {
      minHeight: 72,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    headerButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      borderCurve: "continuous",
      overflow: "hidden",
    },

    headerButtonBlur: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("rgba(255,255,255,0.60)"),
    },

    headerCenter: {
      flex: 1,
      alignItems: "center",
      marginHorizontal: 10,
    },

    headerEyebrow: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: tc.fg(COLORS.blue),
    },

    headerTitle: {
      marginTop: 3,
      fontSize: 17,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    stepBadge: {
      width: 46,
      height: 46,
      borderRadius: 16,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
    },

    stepCurrent: {
      fontSize: 14,
      fontWeight: "700",
      color: tc.fg(COLORS.blue),
    },

    stepDivider: {
      marginHorizontal: 2,
      fontSize: 11,
      color: tc.fg(COLORS.muted),
    },

    stepTotal: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.muted),
    },

    progressContainer: {
      marginTop: 3,
      paddingHorizontal: 20,
    },

    progressTrack: {
      height: 4,
      borderRadius: 2,
      borderCurve: "continuous",
      overflow: "hidden",
      backgroundColor: tc.bg("rgba(0,0,0,0.07)"),
    },

    progressActive: {
      width: "25%",
      height: "100%",
      borderRadius: 2,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blue),
    },

    progressLabels: {
      marginTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
    },

    progressActiveText: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg(COLORS.blue),
    },

    progressText: {
      fontSize: 9,
      fontWeight: "600",
      color: tc.fg(COLORS.muted),
    },

    spaceCard: {
      marginTop: 24,
      marginHorizontal: 16,
      borderRadius: 24,
      borderCurve: "continuous",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
    },

    spaceGradient: {
      minHeight: 82,
      paddingHorizontal: 14,
      paddingVertical: 13,
      flexDirection: "row",
      alignItems: "center",
    },

    spaceLogo: {
      width: 52,
      height: 52,
      borderRadius: 16,
      borderCurve: "continuous",
    },

    spaceIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("#FFF4E5"),
    },

    spaceInfo: {
      flex: 1,
      marginLeft: 12,
    },

    spaceLabel: {
      fontSize: 8,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg(COLORS.muted),
    },

    spaceName: {
      marginTop: 3,
      fontSize: 15,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    spaceLocation: {
      marginTop: 3,
      flexDirection: "row",
      alignItems: "center",
    },

    spaceLocationText: {
      marginLeft: 3,
      fontSize: 10,
      color: tc.fg(COLORS.muted),
    },

    spaceRating: {
      paddingHorizontal: 9,
      paddingVertical: 7,
      borderRadius: 12,
      borderCurve: "continuous",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: tc.bg("#FFF4E5"),
    },

    spaceRatingText: {
      marginLeft: 4,
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    intro: {
      marginTop: 28,
      marginHorizontal: 20,
    },

    title: {
      fontSize: 28,
      lineHeight: 33,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    subtitle: {
      maxWidth: 350,
      marginTop: 7,
      fontSize: 13,
      lineHeight: 20,
      color: tc.fg(COLORS.secondary),
    },

    searchContainer: {
      marginTop: 18,
      marginHorizontal: 16,
    },

    searchBox: {
      height: 52,
      paddingHorizontal: 15,
      borderRadius: 18,
      borderCurve: "continuous",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: tc.bg("rgba(255,255,255,0.92)"),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.035,
      shadowRadius: 12,
      elevation: 2,
    },

    searchInput: {
      flex: 1,
      minWidth: 0,
      marginLeft: 10,
      paddingVertical: 0,
      fontSize: 13,
      fontWeight: "600",
      color: tc.fg(COLORS.text),
    },

    searchClearButton: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
    },

    searchClearIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("#F2F2F7"),
    },

    categoryContainer: {
      height: 48,
      marginTop: 6,
    },

    categories: {
      paddingLeft: 18,
      paddingRight: 18,
      paddingVertical: 5,
    },

    category: {
      height: 38,
      marginRight: 8,
      paddingHorizontal: 15,
      borderRadius: 19,
      borderCurve: "continuous",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("rgba(255,255,255,0.78)"),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
    },

    categoryActive: {
      backgroundColor: tc.bg(COLORS.black),
      borderColor: tc.border(COLORS.black),
    },

    categoryDot: {
      width: 5,
      height: 5,
      marginRight: 6,
      borderRadius: 3,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#FFFFFF"),
    },

    categoryText: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.secondary),
    },

    categoryTextActive: {
      color: tc.fg("#FFFFFF"),
    },

    categoryPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.97 }],
    },

    servicesSection: {
      marginTop: 8,
    },

    servicesHeader: {
      marginHorizontal: 20,
      marginBottom: 11,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    sectionSubtitle: {
      marginTop: 3,
      fontSize: 11,
      color: tc.fg(COLORS.muted),
    },

    servicesList: {
      paddingHorizontal: 14,
    },

    serviceWrapper: {
      width: "100%",
      marginBottom: 10,
    },

    serviceCard: {
      minHeight: 112,
      padding: 11,
      borderRadius: 24,
      borderCurve: "continuous",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border("transparent"),
    },

    serviceCardSelected: {
      backgroundColor: tc.bg(COLORS.blueSoft),
      borderColor: tc.border(COLORS.blueBorder),
    },

    serviceCardPressed: {
      opacity: 0.9,
    },

    serviceNumber: {
      width: 27,
      height: 27,
      borderRadius: 9,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("#F2F2F7"),
    },

    serviceNumberSelected: {
      backgroundColor: tc.bg(COLORS.blue),
    },

    serviceNumberText: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg(COLORS.muted),
    },

    serviceIcon: {
      width: 46,
      height: 46,
      marginLeft: 8,
      borderRadius: 15,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("#F2F2F7"),
    },

    serviceIconSelected: {
      backgroundColor: tc.bg("#FFFFFF"),
    },

    serviceInfo: {
      flex: 1,
      minWidth: 0,
      marginLeft: 10,
    },

    serviceTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingRight: 5,
    },

    serviceName: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    serviceDescription: {
      marginTop: 4,
      paddingRight: 4,
      fontSize: 10,
      lineHeight: 15,
      color: tc.fg(COLORS.muted),
    },

    serviceMeta: {
      marginTop: 7,
      flexDirection: "row",
      alignItems: "center",
    },

    metaItem: {
      flexDirection: "row",
      alignItems: "center",
    },

    metaText: {
      marginLeft: 3,
      fontSize: 9,
      fontWeight: "600",
      color: tc.fg(COLORS.muted),
    },

    metaSeparator: {
      width: 3,
      height: 3,
      marginHorizontal: 7,
      borderRadius: 2,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#C7C7CC"),
    },

    serviceCategory: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg(COLORS.secondary),
    },

    priceArea: {
      minWidth: 69,
      marginLeft: 6,
      alignItems: "flex-end",
      justifyContent: "space-between",
      alignSelf: "stretch",
      paddingVertical: 4,
    },

    price: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
      textAlign: "right",
    },

    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: tc.border("#D1D1D6"),
    },

    radioSelected: {
      borderColor: tc.border(COLORS.blue),
    },

    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blue),
    },

    emptyState: {
      minHeight: 190,
      paddingHorizontal: 25,
      paddingVertical: 28,
      borderRadius: 24,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("rgba(255,255,255,0.70)"),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
    },

    emptyIcon: {
      width: 48,
      height: 48,
      borderRadius: 17,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("#E5E5EA"),
    },

    emptyTitle: {
      marginTop: 13,
      fontSize: 14,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
      textAlign: "center",
    },

    emptyText: {
      maxWidth: 280,
      marginTop: 5,
      fontSize: 10,
      lineHeight: 16,
      color: tc.fg(COLORS.muted),
      textAlign: "center",
    },

    emptyButton: {
      marginTop: 14,
      paddingHorizontal: 15,
      paddingVertical: 9,
      borderRadius: 13,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.black),
    },

    emptyButtonText: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg("#FFFFFF"),
    },

    bottomSpace: {
      height: 150,
    },

    bottomContainer: {
      position: "absolute",
      right: 0,
      bottom: 0,
      left: 0,
      overflow: "hidden",
      borderTopWidth: 1,
      borderTopColor: tc.border("rgba(0,0,0,0.07)"),
    },

    bottomBlur: {
      paddingHorizontal: 15,
      paddingTop: 11,
      paddingBottom: 12,
    },

    bottomContent: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
    },

    summary: {
      flex: 1,
      minWidth: 0,
    },

    summaryLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg(COLORS.muted),
    },

    summaryValue: {
      marginTop: 3,
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    continueButton: {
      minWidth: 132,
      height: 50,
      paddingHorizontal: 17,
      borderRadius: 18,
      borderCurve: "continuous",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      backgroundColor: tc.bg(COLORS.black),
    },

    continueButtonDisabled: {
      backgroundColor: tc.bg("#E5E5EA"),
    },

    continueButtonPressed: {
      opacity: 0.82,
    },

    continueText: {
      fontSize: 12,
      fontWeight: "700",
      color: tc.fg("#FFFFFF"),
    },

    continueTextDisabled: {
      color: tc.fg("#AEAEB2"),
    },

    pressed: {
      opacity: 0.78,
      transform: [{ scale: 0.97 }],
    },
  });
