import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import type { BusinessDTO, ProfessionalDTO, ServiceDTO } from "@slotix/types";
import { getBusiness, getBusinessProfessionals, getBusinessServices, getMembership } from "../../services/businesses";
import { ClientCheckSheet } from "@/components/ClientCheckSheet";
import { createAppointment } from "../../services/appointments";
import { syncReminders } from "../../services/reminders";
import { usePreferences } from "../../contexts/PreferencesContext";
import { ApiRequestError } from "../../services/api-client";
import { useThemed, type ThemeRoles } from "@/theme/roles";
import { useT, dateLocale } from "@/i18n";
import { STAR_COLOR } from "@/components/SpaceCards";

const formatPrice = (value: number) => `${value.toLocaleString("pt-AO")} Kz`;

const capitalize = (value: string) => (value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value);

export default function BookingConfirmationScreen() {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const { preferences } = usePreferences();
  const router = useRouter();

  const params = useLocalSearchParams<{
    businessId?: string | string[];
    serviceId?: string | string[];
    professionalId?: string | string[];
    scheduledAt?: string | string[];
  }>();

  const businessId = Array.isArray(params.businessId) ? params.businessId[0] : params.businessId;

  const serviceId = Array.isArray(params.serviceId) ? params.serviceId[0] : params.serviceId;

  const professionalId = Array.isArray(params.professionalId) ? params.professionalId[0] : params.professionalId;

  const scheduledAt = Array.isArray(params.scheduledAt) ? params.scheduledAt[0] : params.scheduledAt;

  const [business, setBusiness] = useState<BusinessDTO | null>(null);
  // Se a pessoa se tornou cliente do espaço nesta marcação (para o dizer no fim).
  const [joinedNow, setJoinedNow] = useState(false);
  const [service, setService] = useState<ServiceDTO | null>(null);
  const [professional, setProfessional] = useState<ProfessionalDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitErrorCode, setSubmitErrorCode] = useState<string | null>(null);
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0.82)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const hasRequiredParams = Boolean(businessId && serviceId && professionalId && scheduledAt);

  useEffect(() => {
    if (!hasRequiredParams) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);

      try {
        const [businessData, services, professionals] = await Promise.all([
          getBusiness(businessId as string),
          getBusinessServices(businessId as string),
          getBusinessProfessionals(businessId as string),
        ]);

        if (cancelled) return;

        setBusiness(businessData);
        setService(services.find((item) => item.id === serviceId) ?? null);
        setProfessional(professionals.find((item) => item.id === professionalId) ?? null);
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
  }, [hasRequiredParams, businessId, serviceId, professionalId]);

  const scheduledDate = useMemo(() => (scheduledAt ? new Date(scheduledAt) : null), [scheduledAt]);

  const formattedDate = scheduledDate
    ? capitalize(
        new Intl.DateTimeFormat(dateLocale(), {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(scheduledDate),
      )
    : "—";

  const formattedTime = scheduledDate
    ? new Intl.DateTimeFormat(dateLocale(), {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(scheduledDate)
    : "—";

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.96,
        duration: 80,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Quem não é reconhecido como cliente do espaço passa pela tela "Cliente do espaço"
  // (ClientCheckSheet) antes de a marcação ser criada.
  const [clientCheckOpen, setClientCheckOpen] = useState(false);

  const handleConfirm = async () => {
    if (submitting || confirmed || !businessId || !serviceId || !professionalId || !scheduledAt) {
      return;
    }

    animateButton();
    setSubmitErrorCode(null);
    setSubmitErrorMessage(null);
    setSubmitting(true);

    // Se a verificação falhar (sem ligação, servidor em baixo), a pessoa é perguntada na
    // mesma — nunca se salta a pergunta em silêncio.
    const membership = await getMembership(businessId).catch(() => null);
    if (!membership?.isClient) {
      setClientCheckOpen(true);
      return;
    }

    await book();
  };

  const finishClientCheck = (joined: boolean) => {
    setClientCheckOpen(false);
    setJoinedNow(joined);
    void book();
  };

  const book = async () => {
    if (!businessId || !serviceId || !professionalId || !scheduledAt) return;
    setSubmitting(true);

    try {
      await createAppointment({
        businessId,
        serviceId,
        professionalId,
        scheduledAt,
      });
      // A marcação nova passa a ter os seus lembretes no telemóvel.
      void syncReminders(preferences.reminders);

      setConfirmed(true);

      successScale.setValue(0.82);
      successOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setSubmitErrorCode(err.code);
        setSubmitErrorMessage(err.message);
      } else {
        setSubmitErrorCode(null);
        setSubmitErrorMessage(t("Ocorreu um erro ao confirmar a reserva. Tente novamente."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePickAnotherTime = useCallback(() => {
    if (!businessId || !serviceId || !professionalId) return;

    router.push({
      pathname: "/booking/date",
      params: { businessId, serviceId, professionalId },
    });
  }, [router, businessId, serviceId, professionalId]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  /*
   * Depois de confirmada, a marcação está feita: não se volta pelos passos (serviço,
   * profissional, data). Só há duas saídas — o início ou as marcações — e ambas tiram
   * os passos da reserva da pilha. O gesto de deslizar (iOS) e o botão voltar (Android)
   * ficam bloqueados nesta tela.
   */
  const navigation = useNavigation();
  const leaving = useRef(false);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !confirmed });
    if (!confirmed) return;

    return navigation.addListener("beforeRemove", (event) => {
      if (!leaving.current) event.preventDefault();
    });
  }, [navigation, confirmed]);

  const leaveTo = useCallback(
    (path: "/" | "/appointments") => {
      leaving.current = true;
      if (router.canDismiss()) router.dismissAll();
      router.replace(path);
    },
    [router],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.centerState}>
            <ActivityIndicator color={tc.fg("#000000")} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error || !business || !service || !professional || !scheduledDate) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.centerState}>
            <Text style={styles.errorTitle}>{t("Não foi possível carregar esta reserva")}</Text>

            <Pressable onPress={handleBack} style={styles.errorButton}>
              <Text style={styles.errorButtonText}>{t("Voltar")}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (confirmed) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={tc.bgs(["#FFFFFF", "#F2F2F7", "#E5E5EA"])} style={styles.background} />

        <SafeAreaView style={styles.successSafeArea}>
          <Animated.View
            style={[
              styles.successContainer,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <View style={styles.successIconOuter}>
              <LinearGradient colors={tc.bgs(["#000000", "#2C2C2E"])} style={styles.successIcon}>
                <Ionicons name="checkmark" size={42} color={tc.fg("#FFFFFF")} />
              </LinearGradient>
            </View>

            <Text style={styles.successEyebrow}>{t("AGENDAMENTO CONFIRMADO")}</Text>
            <Text style={styles.successTitle}>{t("Está tudo pronto.")}</Text>

            <Text style={styles.successDescription}>
              {t("O seu horário foi reservado com sucesso. Estamos à sua espera em")}{" "}{business.name}.
            </Text>

            {joinedNow ? (
              <View style={styles.joinedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={tc.fg("#248A3D")} />
                <Text style={styles.joinedText}>{t("Agora é cliente de {0}.", [business.name])}</Text>
              </View>
            ) : null}

            <View style={styles.successBookingCard}>
              <View style={styles.successBookingHeader}>
                <View>
                  <Text style={styles.successBookingLabel}>{t("SEU AGENDAMENTO")}</Text>
                  <Text style={styles.successBookingTitle}>{business.name}</Text>
                </View>

                <View style={styles.confirmedBadge}>
                  <Ionicons name="checkmark-circle" size={15} color={tc.fg("#000000")} />
                  <Text style={styles.confirmedBadgeText}>{t("Confirmado")}</Text>
                </View>
              </View>

              <View style={styles.successDivider} />

              <View style={styles.successInfoRow}>
                <View style={styles.successInfoIcon}>
                  <Ionicons name="calendar-outline" size={17} color={tc.fg("#000000")} />
                </View>

                <View>
                  <Text style={styles.successInfoLabel}>{t("DATA")}</Text>
                  <Text style={styles.successInfoValue}>{formattedDate}</Text>
                </View>
              </View>

              <View style={styles.successInfoRow}>
                <View style={styles.successInfoIcon}>
                  <Ionicons name="time-outline" size={17} color={tc.fg("#000000")} />
                </View>

                <View>
                  <Text style={styles.successInfoLabel}>{t("HORÁRIO")}</Text>
                  <Text style={styles.successInfoValue}>
                    {formattedTime} · {service.duration}{" "}{t("min")}
                  </Text>
                </View>
              </View>

              <View style={styles.successInfoRow}>
                <View style={styles.successInfoIcon}>
                  <Ionicons name="person-outline" size={17} color={tc.fg("#000000")} />
                </View>

                <View>
                  <Text style={styles.successInfoLabel}>{t("PROFISSIONAL")}</Text>
                  <Text style={styles.successInfoValue}>{professional.name}</Text>
                </View>
              </View>
            </View>

            <Pressable
              onPress={() => leaveTo("/appointments")}
              style={({ pressed }) => [styles.successPrimaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.successPrimaryText}>{t("Ver meus agendamentos")}</Text>

              <Ionicons name="arrow-forward" size={18} color={tc.fg("#FFFFFF")} />
            </Pressable>

            <Pressable
              onPress={() => leaveTo("/")}
              style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}
            >
              <Text style={styles.homeButtonText}>{t("Voltar para o início")}</Text>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={tc.bgs(["#FFFFFF", "#F2F2F7", "#F2F2F7"])} style={styles.background} />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* HEADER */}
          <View style={styles.header}>
            <Pressable onPress={handleBack} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
              <Ionicons name="chevron-back" size={21} color={tc.fg("#000000")} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.eyebrow}>{t("AGENDAMENTO")}</Text>
              <Text style={styles.headerTitle}>{t("Confirmar")}</Text>
            </View>

            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>4/4</Text>
            </View>
          </View>

          {/* PROGRESS */}
          <View style={styles.progressArea}>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>

            <View style={styles.progressLabels}>
              <Text style={styles.progressInactive}>{t("Serviço")}</Text>
              <Text style={styles.progressInactive}>{t("Profissional")}</Text>
              <Text style={styles.progressInactive}>{t("Data")}</Text>
              <Text style={styles.progressActive}>{t("Confirmar")}</Text>
            </View>
          </View>

          {/* HERO */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <LinearGradient colors={tc.bgs(["#000000", "#2C2C2E"])} style={styles.heroIconGradient}>
                <Ionicons name="checkmark-done" size={27} color={tc.fg("#FFFFFF")} />
              </LinearGradient>
            </View>

            <Text style={styles.heroEyebrow}>{t("QUASE TERMINADO")}</Text>
            <Text style={styles.heroTitle}>{t("Revise os detalhes")}</Text>

            <Text style={styles.heroDescription}>
              {t("Confirme se todas as informações estão corretas antes de finalizar o seu agendamento.")}
            </Text>
          </View>

          {/* SPACE */}
          <View style={styles.spaceCard}>
            <View style={styles.spaceImage}>
              <LinearGradient colors={tc.bgs(["#1C1C1E", "#636366"])} style={styles.spaceImageGradient} />

              <View style={styles.spaceImageContent}>
                <Text style={styles.spaceImageBrand} numberOfLines={1}>
                  {business.name.toUpperCase()}
                </Text>
              </View>

              {business.ratingAvg !== null && business.ratingCount > 0 ? (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color={tc.fg(STAR_COLOR)} />
                  <Text style={styles.ratingText}>{business.ratingAvg.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.spaceInfo}>
              <Text style={styles.spaceLabel}>{t("ESPAÇO")}</Text>
              <Text style={styles.spaceTitle}>{business.name}</Text>

              {business.address || business.category ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={tc.fg("#636366")} />

                  <Text style={styles.locationText}>{business.address ?? t(business.category)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* MAIN SUMMARY */}
          <View style={styles.summaryCard}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardEyebrow}>{t("RESUMO")}</Text>
                <Text style={styles.cardTitle}>{t("Seu agendamento")}</Text>
              </View>

              <View style={styles.lockIcon}>
                <Ionicons name="lock-closed-outline" size={16} color={tc.fg("#3A3A3C")} />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="cut-outline" size={19} color={tc.fg("#000000")} />
              </View>

              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t("SERVIÇO")}</Text>
                <Text style={styles.detailValue}>{service.name}</Text>
                <Text style={styles.detailMeta}>{service.duration}{" "}{t("minutos")}</Text>
              </View>

              <Text style={styles.detailPrice}>{formatPrice(service.price)}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="person-outline" size={19} color={tc.fg("#000000")} />
              </View>

              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t("PROFISSIONAL")}</Text>
                <Text style={styles.detailValue}>{professional.name}</Text>

                {professional.specialty || professional.ratingAvg !== null ? (
                  <Text style={styles.detailMeta}>
                    {[
                      professional.specialty,
                      professional.ratingAvg !== null ? `★ ${professional.ratingAvg.toFixed(1)}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar-outline" size={19} color={tc.fg("#000000")} />
              </View>

              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t("DATA")}</Text>
                <Text style={styles.detailValue}>{formattedDate}</Text>
              </View>
            </View>

            <View style={styles.detailRowLast}>
              <View style={styles.detailIcon}>
                <Ionicons name="time-outline" size={19} color={tc.fg("#000000")} />
              </View>

              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>{t("HORÁRIO")}</Text>
                <Text style={styles.detailValue}>{formattedTime}</Text>
                <Text style={styles.detailMeta}>{t("Duração estimada:")}{" "}{service.duration}{" "}{t("min")}</Text>
              </View>
            </View>
          </View>

          {/* PRICE */}
          <View style={styles.priceCard}>
            <View>
              <Text style={styles.priceLabel}>{t("TOTAL DO AGENDAMENTO")}</Text>
              <Text style={styles.priceTitle}>{formatPrice(service.price)}</Text>
            </View>

            <View style={styles.priceIcon}>
              <Ionicons name="wallet-outline" size={21} color={tc.fg("#000000")} />
            </View>
          </View>

          {/* ERROR BANNER */}
          {submitErrorMessage ? (
            <View style={styles.errorBanner}>
              <View style={styles.errorBannerIcon}>
                <Ionicons name="alert-circle-outline" size={19} color={tc.fg("#FF3B30")} />
              </View>

              <View style={styles.errorBannerContent}>
                <Text style={styles.errorBannerTitle}>
                  {submitErrorCode === "APPOINTMENT_NOT_AVAILABLE"
                    ? t("Este horário já não está disponível")
                    : t("Não foi possível confirmar")}
                </Text>

                <Text style={styles.errorBannerText}>{submitErrorMessage}</Text>

                {submitErrorCode === "APPOINTMENT_NOT_AVAILABLE" ? (
                  <Pressable onPress={handlePickAnotherTime} style={styles.errorBannerButton}>
                    <Text style={styles.errorBannerButtonText}>{t("Escolher outro horário")}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* POLICY */}
          <View style={styles.policyCard}>
            <View style={styles.policyIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={tc.fg("#000000")} />
            </View>

            <View style={styles.policyContent}>
              <Text style={styles.policyTitle}>{t("Reserva segura")}</Text>

              <Text style={styles.policyText}>
                {t("Pode cancelar ou alterar o seu agendamento de acordo com a política do espaço. Recomendamos chegar pelo menos 5 minutos antes.")}
              </Text>
            </View>
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>

        {/* BOTTOM CTA */}
        <BlurView intensity={88} tint={tc.dark ? "dark" : "light"} style={styles.bottomBar}>
          <View style={styles.bottomBarInner}>
            <View style={styles.totalPreview}>
              <Text style={styles.totalPreviewLabel}>{t("TOTAL")}</Text>
              <Text style={styles.totalPreviewValue}>{formatPrice(service.price)}</Text>
            </View>

            <Animated.View style={[styles.confirmButtonWrapper, { transform: [{ scale: buttonScale }] }]}>
              <Pressable
                onPress={handleConfirm}
                disabled={submitting}
                style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
              >
                <LinearGradient colors={tc.bgs(["#000000", "#2C2C2E"])} style={styles.confirmGradient}>
                  {submitting ? (
                    <ActivityIndicator color={tc.fg("#FFFFFF")} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color={tc.fg("#FFFFFF")} />

                      <Text style={styles.confirmText}>{t("Confirmar")}</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </BlurView>
      </SafeAreaView>

      <ClientCheckSheet
        visible={clientCheckOpen}
        businessId={business.id}
        businessName={business.name}
        onDone={finishClientCheck}
      />
    </View>
  );
}

const createStyles = (tc: ThemeRoles) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: tc.bg("#F2F2F7"),
    },

    background: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
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
      color: tc.fg("#000000"),
      textAlign: "center",
    },

    errorButton: {
      marginTop: 18,
      height: 44,
      paddingHorizontal: 20,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#000000"),
      alignItems: "center",
      justifyContent: "center",
    },

    errorButtonText: {
      color: tc.fg("#FFFFFF"),
      fontSize: 12,
      fontWeight: "700",
    },

    successSafeArea: {
      flex: 1,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 135,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 22,
    },

    headerButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("rgba(255,255,255,0.82)"),
      borderWidth: 1,
      borderColor: tc.border("rgba(0,0,0,0.06)"),
    },

    headerCenter: {
      flex: 1,
      alignItems: "center",
    },

    eyebrow: {
      fontSize: 9,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 3,
    },

    headerTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: tc.fg("#000000"),
    },

    stepBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("#000000"),
    },

    stepText: {
      color: tc.fg("#FFFFFF"),
      fontSize: 12,
      fontWeight: "700",
    },

    progressArea: {
      marginBottom: 28,
    },

    progressTrack: {
      height: 4,
      borderRadius: 2,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#D1D1D6"),
      overflow: "hidden",
    },

    progressFill: {
      width: "100%",
      height: 4,
      borderRadius: 2,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#000000"),
    },

    progressLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 9,
    },

    progressActive: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg("#000000"),
    },

    progressInactive: {
      fontSize: 10,
      fontWeight: "600",
      color: tc.fg("#AEAEB2"),
    },

    hero: {
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 27,
    },

    heroIcon: {
      width: 62,
      height: 62,
      borderRadius: 22,
      borderCurve: "continuous",
      overflow: "hidden",
      marginBottom: 15,
    },

    heroIconGradient: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    heroEyebrow: {
      fontSize: 9,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 5,
    },

    heroTitle: {
      fontSize: 26,
      lineHeight: 31,
      fontWeight: "700",
      color: tc.fg("#000000"),
      letterSpacing: -0.4,
      textAlign: "center",
    },

    heroDescription: {
      marginTop: 8,
      maxWidth: 310,
      fontSize: 11,
      lineHeight: 17,
      color: tc.fg("#636366"),
      textAlign: "center",
      fontWeight: "500",
    },

    spaceCard: {
      backgroundColor: tc.bg("rgba(255,255,255,0.84)"),
      borderRadius: 23,
      borderCurve: "continuous",
      overflow: "hidden",
      borderWidth: 1,
      borderColor: tc.border("rgba(255,255,255,0.9)"),
      marginBottom: 18,
    },

    spaceImage: {
      height: 125,
      overflow: "hidden",
      position: "relative",
    },

    spaceImageGradient: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },

    spaceImageContent: {
      position: "absolute",
      left: 18,
      bottom: 17,
      right: 60,
    },

    spaceImageBrand: {
      fontSize: 17,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#FFFFFF"),
    },

    ratingBadge: {
      position: "absolute",
      right: 14,
      top: 14,
      height: 29,
      paddingHorizontal: 10,
      borderRadius: 15,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(0,0,0,0.48)"),
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    ratingText: {
      color: tc.fg("#FFFFFF"),
      fontSize: 10,
      fontWeight: "700",
    },

    spaceInfo: {
      padding: 15,
    },

    spaceLabel: {
      fontSize: 8,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 4,
    },

    spaceTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg("#000000"),
    },

    locationRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 5,
      gap: 4,
    },

    locationText: {
      fontSize: 10,
      color: tc.fg("#636366"),
      fontWeight: "600",
    },

    summaryCard: {
      padding: 16,
      borderRadius: 23,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(255,255,255,0.88)"),
      borderWidth: 1,
      borderColor: tc.border("rgba(255,255,255,0.95)"),
    },

    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    cardEyebrow: {
      fontSize: 8,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 4,
    },

    cardTitle: {
      fontSize: 19,
      fontWeight: "700",
      color: tc.fg("#000000"),
    },

    lockIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
    },

    divider: {
      height: 1,
      backgroundColor: tc.bg("#E5E5EA"),
      marginVertical: 15,
    },

    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: tc.border("#F2F2F7"),
    },

    detailRowLast: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 11,
      paddingBottom: 2,
    },

    detailIcon: {
      width: 39,
      height: 39,
      borderRadius: 13,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    detailContent: {
      flex: 1,
    },

    detailLabel: {
      fontSize: 8,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#AEAEB2"),
      marginBottom: 3,
    },

    detailValue: {
      fontSize: 12,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
    },

    detailMeta: {
      fontSize: 9,
      color: tc.fg("#8E8E93"),
      fontWeight: "600",
      marginTop: 2,
    },

    detailPrice: {
      fontSize: 12,
      fontWeight: "700",
      color: tc.fg("#000000"),
      marginLeft: 8,
    },

    priceCard: {
      marginTop: 15,
      padding: 16,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#000000"),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    priceLabel: {
      fontSize: 8,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 4,
    },

    priceTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: tc.fg("#FFFFFF"),
      letterSpacing: -0.5,
    },

    priceIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#E5E5EA"),
      alignItems: "center",
      justifyContent: "center",
    },

    errorBanner: {
      marginTop: 15,
      padding: 15,
      borderRadius: 20,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(180,35,31,0.07)"),
      borderWidth: 1,
      borderColor: tc.border("rgba(180,35,31,0.18)"),
      flexDirection: "row",
    },

    errorBannerIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#FFFFFF"),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    errorBannerContent: {
      flex: 1,
    },

    errorBannerTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg("#D70015"),
      marginBottom: 4,
    },

    errorBannerText: {
      fontSize: 10,
      lineHeight: 15,
      color: tc.fg("#D70015"),
    },

    errorBannerButton: {
      marginTop: 10,
      alignSelf: "flex-start",
      height: 34,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#000000"),
      alignItems: "center",
      justifyContent: "center",
    },

    errorBannerButtonText: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg("#FFFFFF"),
    },

    policyCard: {
      marginTop: 15,
      padding: 15,
      borderRadius: 20,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(255,255,255,0.68)"),
      borderWidth: 1,
      borderColor: tc.border("rgba(0,0,0,0.05)"),
      flexDirection: "row",
    },

    policyIcon: {
      width: 37,
      height: 37,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#E5E5EA"),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    policyContent: {
      flex: 1,
    },

    policyTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
      marginBottom: 4,
    },

    policyText: {
      fontSize: 10,
      lineHeight: 15,
      color: tc.fg("#636366"),
      fontWeight: "500",
    },

    bottomSpace: {
      height: 20,
    },

    bottomBar: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 18,
      paddingTop: 13,
      paddingBottom: 18,
      borderTopWidth: 1,
      borderTopColor: tc.border("rgba(0,0,0,0.06)"),
      overflow: "hidden",
    },

    bottomBarInner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
    },

    totalPreview: {
      flex: 1,
    },

    totalPreviewLabel: {
      fontSize: 8,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 4,
    },

    totalPreviewValue: {
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg("#000000"),
    },

    confirmButtonWrapper: {
      width: 155,
    },

    confirmButton: {
      height: 53,
      borderRadius: 17,
      borderCurve: "continuous",
      overflow: "hidden",
    },

    confirmGradient: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    confirmText: {
      color: tc.fg("#FFFFFF"),
      fontSize: 12,
      fontWeight: "700",
    },

    pressed: {
      opacity: 0.8,
    },

    successContainer: {
      flex: 1,
      paddingHorizontal: 22,
      paddingTop: 42,
      alignItems: "center",
    },

    successIconOuter: {
      width: 92,
      height: 92,
      borderRadius: 32,
      borderCurve: "continuous",
      padding: 6,
      backgroundColor: tc.bg("rgba(255,255,255,0.75)"),
      marginBottom: 22,
    },

    successIcon: {
      flex: 1,
      borderRadius: 27,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
    },

    successEyebrow: {
      fontSize: 9,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 6,
    },

    joinedBadge: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: 6,
      marginTop: 14,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: tc.bg("#EAF9EE"),
    },

    joinedText: {
      fontSize: 13,
      fontWeight: "600",
      color: tc.fg("#248A3D"),
    },

    successTitle: {
      fontSize: 31,
      lineHeight: 36,
      fontWeight: "700",
      color: tc.fg("#000000"),
      letterSpacing: -0.4,
      textAlign: "center",
    },

    successDescription: {
      maxWidth: 320,
      fontSize: 11,
      lineHeight: 17,
      color: tc.fg("#636366"),
      textAlign: "center",
      marginTop: 9,
      fontWeight: "500",
    },

    successBookingCard: {
      width: "100%",
      marginTop: 27,
      padding: 17,
      borderRadius: 23,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(255,255,255,0.88)"),
      borderWidth: 1,
      borderColor: tc.border("rgba(255,255,255,0.95)"),
    },

    successBookingHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },

    successBookingLabel: {
      fontSize: 8,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 4,
    },

    successBookingTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: tc.fg("#000000"),
    },

    confirmedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      height: 27,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#E5E5EA"),
    },

    confirmedBadgeText: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
    },

    successDivider: {
      height: 1,
      backgroundColor: tc.bg("#E5E5EA"),
      marginVertical: 15,
    },

    successInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 14,
    },

    successInfoIcon: {
      width: 37,
      height: 37,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#E5E5EA"),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    successInfoLabel: {
      fontSize: 8,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#AEAEB2"),
      marginBottom: 3,
    },

    successInfoValue: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
    },

    successPrimaryButton: {
      width: "100%",
      height: 53,
      borderRadius: 17,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#000000"),
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 9,
      marginTop: 21,
    },

    successPrimaryText: {
      color: tc.fg("#FFFFFF"),
      fontSize: 12,
      fontWeight: "700",
    },

    homeButton: {
      height: 48,
      paddingHorizontal: 20,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },

    homeButtonText: {
      color: tc.fg("#636366"),
      fontSize: 11,
      fontWeight: "700",
    },
  });
