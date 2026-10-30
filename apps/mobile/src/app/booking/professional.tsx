import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActivityIndicator, Animated, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { ProfessionalDTO, ServiceDTO } from "@slotix/types";
import { getBusinessProfessionals, getBusinessServices } from "../../services/businesses";
import { useThemed, type ThemeRoles } from "@/theme/roles";
import { useT } from "@/i18n";

const COLORS = {
  background: "#F5F5F2",
  white: "#FFFFFF",
  black: "#000000",
  text: "#1C1C1E",
  secondary: "#636366",
  muted: "#AEAEB2",
  blue: "#1451D6",
  blueSoft: "rgba(29, 99, 255, 0.07)",
  blueBorder: "rgba(29, 99, 255, 0.28)",
  gold: "#A2845E",
  border: "rgba(0, 0, 0, 0.07)",
};

// O valor que segue para o passo da data quando a pessoa não escolhe ninguém.
const ANY_PROFESSIONAL = "any";

const formatPrice = (value: number) => `${value.toLocaleString("pt-AO")} Kz`;

export default function BookingProfessionalScreen() {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const router = useRouter();

  const params = useLocalSearchParams<{
    businessId?: string | string[];
    serviceId?: string | string[];
  }>();

  const businessId = Array.isArray(params.businessId) ? params.businessId[0] : params.businessId;

  const serviceId = Array.isArray(params.serviceId) ? params.serviceId[0] : params.serviceId;

  const [professionals, setProfessionals] = useState<ProfessionalDTO[]>([]);
  const [services, setServices] = useState<ServiceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Por omissão fica "qualquer profissional": a pessoa não é obrigada a escolher, e o
  // passo seguinte mostra os horários de toda a equipa.
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>(ANY_PROFESSIONAL);

  const continueScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!businessId || !serviceId) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);

      try {
        const [professionalsData, servicesData] = await Promise.all([
          getBusinessProfessionals(businessId as string),
          getBusinessServices(businessId as string).catch(() => []),
        ]);

        if (cancelled) return;
        setProfessionals(professionalsData);
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
  }, [businessId, serviceId]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? null,
    [services, serviceId],
  );

  const selectedProfessional = useMemo(
    () => professionals.find((professional) => professional.id === selectedProfessionalId) ?? null,
    [professionals, selectedProfessionalId],
  );

  const canContinue = professionals.length > 0;

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSelect = useCallback((professional: ProfessionalDTO) => {
    setSelectedProfessionalId(professional.id);
  }, []);

  const handleContinue = useCallback(() => {
    if (!businessId || !serviceId || professionals.length === 0) {
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
      pathname: "/booking/date",
      params: {
        businessId,
        serviceId,
        professionalId: selectedProfessionalId,
      },
    });
  }, [businessId, continueScale, professionals.length, router, selectedProfessionalId, serviceId]);

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

  if (error) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.centerState}>
            <Text style={styles.errorTitle}>{t("Não foi possível carregar os profissionais")}</Text>

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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} bounces>
          {/* HEADER */}
          <View style={styles.header}>
            <Pressable onPress={handleBack} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
              <BlurView intensity={70} tint={tc.dark ? "dark" : "light"} style={styles.headerButtonBlur}>
                <Ionicons name="arrow-back" size={20} color={tc.fg(COLORS.black)} />
              </BlurView>
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerEyebrow}>{t("AGENDAMENTO")}</Text>
              <Text style={styles.headerTitle}>{t("Escolha o profissional")}</Text>
            </View>

            <View style={styles.stepBadge}>
              <Text style={styles.stepCurrent}>2</Text>
              <Text style={styles.stepDivider}>/</Text>
              <Text style={styles.stepTotal}>4</Text>
            </View>
          </View>

          {/* PROGRESSO */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={tc.bgs(["#1451D6", "#1451D6"])}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressActive}
              />
            </View>

            <View style={styles.progressLabels}>
              <Text style={styles.progressDone}>{t("Serviço")}</Text>
              <Text style={styles.progressActiveText}>{t("Profissional")}</Text>
              <Text style={styles.progressText}>{t("Data")}</Text>
              <Text style={styles.progressText}>{t("Confirmar")}</Text>
            </View>
          </View>

          {/* SERVIÇO ESCOLHIDO */}
          {selectedService ? (
            <View style={styles.serviceSummary}>
              <View style={styles.serviceSummaryIcon}>
                <Ionicons name="cut-outline" size={19} color={tc.fg(COLORS.blue)} />
              </View>

              <View style={styles.serviceSummaryInfo}>
                <Text style={styles.serviceSummaryLabel}>{t("SERVIÇO ESCOLHIDO")}</Text>

                <Text style={styles.serviceSummaryName} numberOfLines={1}>
                  {selectedService.name}
                </Text>

                <View style={styles.serviceMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={tc.fg(COLORS.muted)} />

                    <Text style={styles.metaText}>{selectedService.duration}{" "}{t("min")}</Text>
                  </View>

                  <View style={styles.metaSeparator} />

                  <Text style={styles.metaText}>{formatPrice(selectedService.price)}</Text>
                </View>
              </View>

              <View style={styles.serviceCheck}>
                <Ionicons name="checkmark-circle" size={20} color={tc.fg(COLORS.blue)} />
              </View>
            </View>
          ) : null}

          {/* INTRO */}
          <View style={styles.intro}>
            <Text style={styles.title}>{t("Quem prefere?")}</Text>

            <Text style={styles.subtitle}>{t("Pode escolher alguém da equipa ou deixar que seja quem estiver livre primeiro.")}</Text>
          </View>

          {/* LIST HEADER */}
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.sectionTitle}>{t("Profissionais")}</Text>

              <Text style={styles.sectionSubtitle}>
                {professionals.length} {professionals.length === 1 ? t("disponível") : t("disponíveis")}{" "}{t("neste espaço")}
              </Text>
            </View>
          </View>

          {/* PROFISSIONAIS */}
          <View style={styles.professionalsList}>
            {professionals.length > 0 ? (
              <ProfessionalRow
                name={t("Qualquer profissional")}
                detail={t("Quem estiver livre primeiro — mais horários à escolha.")}
                badge={t("Recomendado")}
                icon="people"
                selected={selectedProfessionalId === ANY_PROFESSIONAL}
                onPress={() => setSelectedProfessionalId(ANY_PROFESSIONAL)}
              />
            ) : null}

            {professionals.map((professional) => (
              <ProfessionalRow
                key={professional.id}
                name={professional.name}
                detail={professional.specialty ?? professional.bio ?? t("Profissional do espaço")}
                imageUrl={professional.imageUrl}
                rating={professional.ratingAvg}
                ratingCount={professional.ratingCount}
                selected={selectedProfessionalId === professional.id}
                onPress={() => handleSelect(professional)}
              />
            ))}
          </View>

          {professionals.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={21} color={tc.fg(COLORS.blue)} />
              </View>

              <View style={styles.emptyContent}>
                <Text style={styles.emptyTitle}>{t("Nenhum profissional disponível")}</Text>

                <Text style={styles.emptyText}>{t("Este espaço ainda não tem profissionais cadastrados.")}</Text>
              </View>
            </View>
          ) : null}

          {/* SEGURANÇA */}
          <View style={styles.trustCard}>
            <View style={styles.trustIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={tc.fg(COLORS.blue)} />
            </View>

            <View style={styles.trustContent}>
              <Text style={styles.trustTitle}>{t("Profissionais verificados")}</Text>

              <Text style={styles.trustText}>{t("Todos os profissionais apresentados fazem parte da equipa do espaço.")}</Text>
            </View>
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </SafeAreaView>

      {/* CTA FIXO */}
      <View style={styles.bottomContainer}>
        <BlurView intensity={88} tint={tc.dark ? "dark" : "light"} style={styles.bottomBlur}>
          <View style={styles.bottomContent}>
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>
                {selectedProfessional ? t("Profissional escolhido") : t("Profissional")}
              </Text>

              <Text style={styles.summaryValue} numberOfLines={1}>
                {selectedProfessional ? selectedProfessional.name : t("Qualquer profissional")}
              </Text>
            </View>

            <Animated.View style={{ transform: [{ scale: continueScale }] }}>
              <Pressable
                onPress={handleContinue}
                disabled={!canContinue}
                style={({ pressed }) => [
                  styles.continueButton,
                  !canContinue && styles.continueButtonDisabled,
                  pressed && canContinue && styles.continueButtonPressed,
                ]}
              >
                <Text style={[styles.continueText, !canContinue && styles.continueTextDisabled]}>{t("Continuar")}</Text>

                <Ionicons name="arrow-forward" size={18} color={tc.fg(canContinue ? "#FFFFFF" : "#AEAEB2")} />
              </Pressable>
            </Animated.View>
          </View>
        </BlurView>
      </View>
    </View>
  );
}

/* Uma linha da equipa: fotografia (ou ícone), nome, detalhe e a marca de escolhido. */
function ProfessionalRow({
  name,
  detail,
  badge,
  icon = "person",
  imageUrl,
  rating,
  ratingCount,
  selected,
  onPress,
}: {
  name: string;
  detail: string;
  badge?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  imageUrl?: string | null;
  rating?: number | null;
  ratingCount?: number;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) => Animated.spring(scale, { toValue, damping: 18, stiffness: 280, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => spring(0.98)}
        onPressOut={() => spring(1)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={[styles.personRow, selected && styles.personRowSelected]}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.personPhoto} />
        ) : (
          <View style={[styles.personPhoto, styles.personPhotoEmpty, selected && styles.personPhotoEmptySelected]}>
            <Ionicons name={icon} size={24} color={tc.fg(selected ? COLORS.white : COLORS.blue)} />
          </View>
        )}

        <View style={styles.personInfo}>
          <View style={styles.personNameRow}>
            <Text style={styles.personName} numberOfLines={1}>
              {name}
            </Text>
            {badge ? <Text style={styles.personBadge}>{badge}</Text> : null}
          </View>

          <Text style={styles.personDetail} numberOfLines={2}>
            {detail}
          </Text>

          {typeof rating === "number" ? (
            <View style={styles.personRating}>
              <Ionicons name="star" size={12} color={tc.fg(COLORS.gold)} />
              <Text style={styles.personRatingText}>
                {rating.toFixed(1)}
                {ratingCount ? `  ·  ${ratingCount} ${t("avaliações")}` : ""}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.personCheck, selected && styles.personCheckSelected]}>
          {selected ? <Ionicons name="checkmark" size={15} color={tc.fg(COLORS.white)} /> : null}
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

    scrollContent: {
      paddingBottom: 30,
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
      marginHorizontal: 8,
    },

    headerEyebrow: {
      fontSize: 9,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: tc.fg(COLORS.blue),
    },

    headerTitle: {
      marginTop: 3,
      fontSize: 16,
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
      width: "50%" as const,
      height: "100%" as const,
      borderRadius: 2,
      borderCurve: "continuous",
    },

    progressLabels: {
      marginTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
    },

    progressDone: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg(COLORS.secondary),
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

    serviceSummary: {
      marginTop: 23,
      marginHorizontal: 16,
      padding: 13,
      minHeight: 74,
      borderRadius: 22,
      borderCurve: "continuous",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
    },

    serviceSummaryIcon: {
      width: 44,
      height: 44,
      borderRadius: 15,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg(COLORS.blueSoft),
    },

    serviceSummaryInfo: {
      flex: 1,
      minWidth: 0,
      marginLeft: 11,
    },

    serviceSummaryLabel: {
      fontSize: 8,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: tc.fg(COLORS.muted),
    },

    serviceSummaryName: {
      marginTop: 3,
      fontSize: 14,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    serviceMeta: {
      marginTop: 4,
      flexDirection: "row",
      alignItems: "center",
    },

    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },

    metaText: {
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

    serviceCheck: {
      width: 32,
      alignItems: "flex-end",
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

    listHeader: {
      marginTop: 29,
      marginHorizontal: 20,
      marginBottom: 13,
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

    personRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 14,
      borderRadius: 22,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1.5,
      borderColor: tc.border("transparent"),
    },

    personRowSelected: {
      borderColor: tc.border(COLORS.blue),
      backgroundColor: tc.bg(COLORS.blueSoft),
    },

    personPhoto: {
      width: 58,
      height: 58,
      borderRadius: 29,
    },

    personPhotoEmpty: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg(COLORS.blueSoft),
    },

    personPhotoEmptySelected: {
      backgroundColor: tc.bg(COLORS.blue),
    },

    personInfo: {
      flex: 1,
      gap: 3,
    },

    personNameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    personName: {
      flexShrink: 1,
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    personBadge: {
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.blue),
      backgroundColor: tc.bg(COLORS.blueSoft),
    },

    personDetail: {
      fontSize: 13,
      lineHeight: 18,
      color: tc.fg(COLORS.secondary),
    },

    personRating: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 2,
    },

    personRatingText: {
      fontSize: 12,
      fontWeight: "600",
      color: tc.fg(COLORS.secondary),
    },

    personCheck: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: tc.border(COLORS.muted),
    },

    personCheckSelected: {
      borderColor: tc.border(COLORS.blue),
      backgroundColor: tc.bg(COLORS.blue),
    },

    professionalsList: {
      marginTop: 12,
      paddingHorizontal: 14,
      gap: 12,
    },

    professionalWrapper: {
      width: "100%",
    },

    professionalCard: {
      overflow: "hidden",
      borderRadius: 27,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border("transparent"),
    },

    professionalCardSelected: {
      borderColor: tc.border(COLORS.blueBorder),
      backgroundColor: tc.bg(COLORS.blueSoft),
    },

    professionalPressed: {
      opacity: 0.92,
    },

    imageContainer: {
      height: 260,
      position: "relative",
      overflow: "hidden",
    },

    professionalImage: {
      width: "100%",
      height: "100%",
    },

    imageFallback: {
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
    },

    imageGradient: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },

    ratingBadge: {
      position: "absolute",
      left: 12,
      bottom: 12,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 11,
      borderCurve: "continuous",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: tc.bg("rgba(255,255,255,0.94)"),
    },

    ratingText: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    selectedBadge: {
      position: "absolute",
      top: 13,
      right: 13,
      width: 35,
      height: 35,
      borderRadius: 18,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg(COLORS.blue),
    },

    numberBadge: {
      position: "absolute",
      top: 13,
      left: 13,
      width: 34,
      height: 34,
      borderRadius: 12,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("rgba(255,255,255,0.88)"),
    },

    numberText: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    cardContent: {
      padding: 15,
    },

    nameRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    nameArea: {
      flex: 1,
      minWidth: 0,
    },

    professionalName: {
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    specialty: {
      marginTop: 3,
      fontSize: 11,
      fontWeight: "600",
      color: tc.fg(COLORS.blue),
    },

    about: {
      marginTop: 9,
      fontSize: 11,
      lineHeight: 17,
      color: tc.fg(COLORS.secondary),
    },

    cardFooter: {
      marginTop: 13,
      paddingTop: 11,
      borderTopWidth: 1,
      borderTopColor: tc.border(COLORS.border),
      flexDirection: "row",
      alignItems: "center",
    },

    footerItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    footerText: {
      fontSize: 9,
      fontWeight: "600",
      color: tc.fg(COLORS.muted),
    },

    emptyCard: {
      marginTop: 12,
      marginHorizontal: 14,
      padding: 15,
      borderRadius: 21,
      borderCurve: "continuous",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
    },

    emptyIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg(COLORS.blueSoft),
    },

    emptyContent: {
      flex: 1,
      marginLeft: 11,
    },

    emptyTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    emptyText: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
      color: tc.fg(COLORS.secondary),
    },

    trustCard: {
      marginTop: 22,
      marginHorizontal: 16,
      padding: 15,
      borderRadius: 21,
      borderCurve: "continuous",
      flexDirection: "row",
      backgroundColor: tc.bg(COLORS.blueSoft),
      borderWidth: 1,
      borderColor: tc.border("rgba(29,99,255,0.10)"),
    },

    trustIcon: {
      width: 35,
      height: 35,
      borderRadius: 12,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg(COLORS.white),
    },

    trustContent: {
      flex: 1,
      marginLeft: 10,
    },

    trustTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    trustText: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 16,
      color: tc.fg(COLORS.secondary),
    },

    bottomSpace: {
      height: 155,
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
      paddingRight: 10,
    },

    summaryLabel: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg(COLORS.muted),
    },

    summaryValue: {
      marginTop: 3,
      fontSize: 14,
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
