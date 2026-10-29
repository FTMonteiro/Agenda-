import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import type { BusinessHoursEntryDTO, ProfessionalDTO, ServiceDTO } from "@slotix/types";
import { getBusinessHours, getBusinessProfessionals, getBusinessServices } from "../../services/businesses";
import { getAvailability } from "../../services/availability";
import { useThemed, type ThemeRoles } from "@/theme/roles";
import { useT, dateLocale } from "@/i18n";

import type { ScrollViewInstance } from "react-native";
// O valor que chega do passo anterior quando a pessoa não escolheu ninguém.
const ANY_PROFESSIONAL = "any";

type DateItem = {
  key: string;
  // 0 = domingo … 6 = sábado, como nos horários do espaço.
  weekday: number;
  day: string;
  number: string;
  month: string;
  fullDate: string;
};

const DAYS_TO_SHOW = 21;

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const capitalize = (value: string) => (value.length > 0 ? value.charAt(0).toUpperCase() + value.slice(1) : value);

const buildDates = (): DateItem[] => {
  const items: DateItem[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < DAYS_TO_SHOW; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    items.push({
      key: formatDateKey(date),
      weekday: date.getDay(),
      day: new Intl.DateTimeFormat(dateLocale(), { weekday: "short" })
        .format(date)
        .replace(".", "")
        .toUpperCase()
        .slice(0, 3),
      number: String(date.getDate()).padStart(2, "0"),
      month: new Intl.DateTimeFormat(dateLocale(), { month: "short" })
        .format(date)
        .replace(".", "")
        .toUpperCase()
        .slice(0, 3),
      fullDate: capitalize(
        new Intl.DateTimeFormat(dateLocale(), {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(date),
      ),
    });
  }

  return items;
};

const formatPrice = (value: number) => `${value.toLocaleString("pt-AO")} Kz`;

// Shows a slot's ISO start instant as the local clock time ("09:30").
function formatSlotTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const clock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

const WHEEL_ROW = 52;
const WHEEL_ROWS = 5;

/*
 * Seletor de hora em roda, como o relógio do telemóvel: as horas livres passam por uma
 * janela e a que fica ao centro é a escolhida. Só lá estão as horas em que o espaço
 * está aberto e há alguém livre, por isso não há horários espalhados pelo ecrã.
 */
function TimeWheel({ times, value, onChange }: { times: string[]; value: string | null; onChange: (time: string) => void }) {
  const { tc, styles } = useThemed(createStyles);
  const list = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const padding = (WHEEL_ROW * (WHEEL_ROWS - 1)) / 2;

  const settle = (offset: number) => {
    const index = Math.min(times.length - 1, Math.max(0, Math.round(offset / WHEEL_ROW)));
    if (times[index] !== value) onChange(times[index]);
  };

  const jump = (index: number) => {
    list.current?.scrollTo({ y: index * WHEEL_ROW, animated: true });
    onChange(times[index]);
  };

  return (
    <View style={styles.wheel}>
      <View pointerEvents="none" style={styles.wheelBand} />
      <Animated.ScrollView
        ref={list}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ROW}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: padding }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={(event) => settle(event.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(event) => settle(event.nativeEvent.contentOffset.y)}
      >
        {times.map((time, index) => {
          // A hora ao centro fica grande e nítida; as vizinhas encolhem e desvanecem.
          const range = [(index - 2) * WHEEL_ROW, (index - 1) * WHEEL_ROW, index * WHEEL_ROW, (index + 1) * WHEEL_ROW, (index + 2) * WHEEL_ROW];
          const scale = scrollY.interpolate({ inputRange: range, outputRange: [0.72, 0.84, 1.18, 0.84, 0.72], extrapolate: "clamp" });
          const opacity = scrollY.interpolate({ inputRange: range, outputRange: [0.22, 0.45, 1, 0.45, 0.22], extrapolate: "clamp" });

          return (
            <Pressable key={time} onPress={() => jump(index)} style={styles.wheelRow} accessibilityRole="button">
              <Animated.Text style={[styles.wheelText, { opacity, transform: [{ scale }] }]}>{formatSlotTime(time)}</Animated.Text>
            </Pressable>
          );
        })}
      </Animated.ScrollView>
      <View pointerEvents="none" style={styles.wheelIcon}>
        <Ionicons name="time" size={20} color={tc.fg("#2E67B3")} />
      </View>
    </View>
  );
}

export default function BookingDateScreen() {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const router = useRouter();

  const params = useLocalSearchParams<{
    businessId?: string | string[];
    serviceId?: string | string[];
    professionalId?: string | string[];
  }>();

  const businessId = Array.isArray(params.businessId) ? params.businessId[0] : params.businessId;

  const serviceId = Array.isArray(params.serviceId) ? params.serviceId[0] : params.serviceId;

  const professionalId = Array.isArray(params.professionalId) ? params.professionalId[0] : params.professionalId;

  const dates = useMemo(buildDates, []);

  const [selectedDateKey, setSelectedDateKey] = useState(dates[0].key);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [service, setService] = useState<ServiceDTO | null>(null);
  const [professional, setProfessional] = useState<ProfessionalDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Cada hora livre e quem a pode fazer (com "qualquer profissional" junta-se a equipa toda).
  const [slots, setSlots] = useState<{ time: string; professionalId: string }[]>([]);
  const [team, setTeam] = useState<ProfessionalDTO[]>([]);
  const [hours, setHours] = useState<BusinessHoursEntryDTO[]>([]);
  const anyProfessional = professionalId === ANY_PROFESSIONAL;
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState(false);

  const buttonScale = useRef(new Animated.Value(1)).current;
  const selectionScale = useRef(new Animated.Value(1)).current;

  const currentDate = useMemo(() => dates.find((item) => item.key === selectedDateKey), [dates, selectedDateKey]);

  useEffect(() => {
    if (!businessId || !serviceId || !professionalId) {
      setLoading(false);
      setError(true);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);

      try {
        const [services, professionals, businessHours] = await Promise.all([
          getBusinessServices(businessId as string),
          getBusinessProfessionals(businessId as string),
          getBusinessHours(businessId as string).catch(() => [] as BusinessHoursEntryDTO[]),
        ]);

        if (cancelled) return;

        setTeam(professionals);
        setHours(businessHours);

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
  }, [businessId, serviceId, professionalId]);

  // O horário do espaço no dia escolhido. Um espaço sem horário registado está sempre
  // aberto; com horário, um dia que não conste é um dia em que não trabalha.
  const dayHours = useMemo(() => {
    const day = hours.filter((entry) => entry.dayOfWeek === currentDate?.weekday);
    if (day.length === 0) return null;
    return { open: Math.min(...day.map((entry) => entry.startMinute)), close: Math.max(...day.map((entry) => entry.endMinute)) };
  }, [hours, currentDate]);
  const openDays = useMemo(() => new Set(hours.map((entry) => entry.dayOfWeek)), [hours]);
  const closedOn = (weekday: number) => hours.length > 0 && !openDays.has(weekday);
  const closedToday = currentDate ? closedOn(currentDate.weekday) : false;

  useEffect(() => {
    if (!businessId || !serviceId || !professionalId || loading) {
      return;
    }

    let cancelled = false;

    async function loadSlots() {
      setSlotsLoading(true);
      setSlotsError(false);
      setSelectedTime(null);

      // Num dia em que o espaço não trabalha não há nada para perguntar ao servidor.
      if (closedToday) {
        setSlots([]);
        setSlotsLoading(false);
        return;
      }

      try {
        const who = anyProfessional ? team.map((item) => item.id) : [professionalId as string];
        const perPerson = await Promise.all(
          who.map((id) =>
            getAvailability({ businessId: businessId as string, professionalId: id, serviceId: serviceId as string, date: selectedDateKey })
              .then((data) => data.map((slot) => ({ time: slot.time, professionalId: id })))
              // Com a equipa toda, a falha de uma pessoa não esconde os horários das outras.
              .catch((failure) => {
                if (!anyProfessional) throw failure;
                return [];
              }),
          ),
        );

        if (cancelled) return;

        // Cada hora aparece uma vez, com a primeira pessoa que a tem livre.
        const byTime = new Map<string, { time: string; professionalId: string }>();
        for (const slot of perPerson.flat()) if (!byTime.has(slot.time)) byTime.set(slot.time, slot);
        const found = [...byTime.values()].sort((a, b) => a.time.localeCompare(b.time));

        setSlots(found);
        // A roda abre na primeira hora livre, já escolhida.
        setSelectedTime(found[0]?.time ?? null);
      } catch {
        if (!cancelled) {
          setSlots([]);
          setSlotsError(true);
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }

    void loadSlots();

    return () => {
      cancelled = true;
    };
  }, [businessId, serviceId, professionalId, selectedDateKey, loading, closedToday, anyProfessional, team]);

  const animateSelection = () => {
    selectionScale.setValue(0.94);

    Animated.spring(selectionScale, {
      toValue: 1,
      friction: 7,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleDatePress = (date: DateItem) => {
    setSelectedDateKey(date.key);
    animateSelection();
  };


  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const pressButton = () => {
    // Com "qualquer profissional", a marcação fica com quem tem essa hora livre.
    const chosen = slots.find((slot) => slot.time === selectedTime)?.professionalId;
    if (!selectedTime || !businessId || !serviceId || !chosen) return;

    // Each slot from /availability is already the full start instant (ISO), so it is
    // passed on as-is rather than rebuilt from the date key and an "HH:MM" string.
    const scheduledAt = selectedTime;

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
    ]).start(() => {
      router.push({
        pathname: "/booking/confirmation",
        params: { businessId, serviceId, professionalId: chosen, scheduledAt },
      });
    });
  };

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

  if (error) {
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
              <Text style={styles.headerTitle}>{t("Data e horário")}</Text>
            </View>

            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>3/4</Text>
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
              <Text style={styles.progressActive}>{t("Data")}</Text>
              <Text style={styles.progressInactive}>{t("Confirmar")}</Text>
            </View>
          </View>

          {/* SERVICE SUMMARY */}
          {service || professional ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}>
                <Ionicons name="cut-outline" size={20} color={tc.fg("#FFFFFF")} />
              </View>

              <View style={styles.summaryInfo}>
                <Text style={styles.summaryLabel}>{t("SERVIÇO SELECIONADO")}</Text>

                <Text style={styles.summaryTitle} numberOfLines={1}>
                  {service?.name ?? "—"}
                </Text>

                {service ? (
                  <Text style={styles.summaryMeta}>
                    {service.duration}{" "}{t("min ·")}{" "}{formatPrice(service.price)}
                  </Text>
                ) : null}
              </View>

              {anyProfessional ? (
                <>
                  <View style={styles.summaryDivider} />

                  <View style={styles.professionalMini}>
                    <View style={styles.avatar}>
                      <Ionicons name="people" size={16} color={tc.fg("#FFFFFF")} />
                    </View>

                    <View>
                      <Text style={styles.summaryLabel}>{t("PROFISSIONAL")}</Text>

                      <Text style={styles.professionalName} numberOfLines={1}>
                        {team.find((item) => item.id === slots.find((slot) => slot.time === selectedTime)?.professionalId)?.name ?? t("Qualquer")}
                      </Text>
                    </View>
                  </View>
                </>
              ) : professional ? (
                <>
                  <View style={styles.summaryDivider} />

                  <View style={styles.professionalMini}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {professional.name
                          .split(" ")
                          .slice(0, 2)
                          .map((part) => part.charAt(0).toUpperCase())
                          .join("")}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.summaryLabel}>{t("PROFISSIONAL")}</Text>

                      <Text style={styles.professionalName} numberOfLines={1}>
                        {professional.name}
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          {/* DATE HEADER */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>{t("QUANDO?")}</Text>
              <Text style={styles.sectionTitle}>{t("Escolha o melhor dia")}</Text>
            </View>

            <View style={styles.calendarIcon}>
              <Ionicons name="calendar-outline" size={19} color={tc.fg("#000000")} />
            </View>
          </View>

          {/* DATES */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
            {dates.map((date) => {
              const selected = selectedDateKey === date.key;
              const closed = closedOn(date.weekday);

              return (
                <Pressable
                  key={date.key}
                  onPress={() => handleDatePress(date)}
                  style={({ pressed }) => [
                    styles.dateCard,
                    closed && styles.dateCardClosed,
                    selected && styles.dateCardSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.dateDay, selected && styles.dateSelectedText]}>{date.day}</Text>

                  <Text style={[styles.dateNumber, selected && styles.dateSelectedText]}>{date.number}</Text>

                  <Text style={[styles.dateMonth, selected && styles.dateSelectedText]}>{closed ? t("Fechado") : date.month}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* SELECTED DATE */}
          <Animated.View style={[styles.selectedDateCard, { transform: [{ scale: selectionScale }] }]}>
            <View style={styles.selectedDateIcon}>
              <Ionicons name="calendar" size={19} color={tc.fg("#FFFFFF")} />
            </View>

            <View style={styles.selectedDateInfo}>
              <Text style={styles.selectedDateLabel}>{t("DATA SELECIONADA")}</Text>

              <Text style={styles.selectedDateTitle}>{currentDate?.fullDate}</Text>

              {/* O horário de funcionamento do espaço nesse dia */}
              <Text style={styles.selectedDateHours}>
                {closedToday
                  ? t("O espaço não abre neste dia")
                  : dayHours
                    ? t("Aberto das {0} às {1}", [clock(dayHours.open), clock(dayHours.close)])
                    : t("Aberto todo o dia")}
              </Text>
            </View>

            <Ionicons name={closedToday ? "close-circle" : "checkmark-circle"} size={23} color={tc.fg(closedToday ? "#FF3B30" : "#000000")} />
          </Animated.View>

          {/* TIME HEADER */}
          <View style={styles.timeHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>{t("HORÁRIO")}</Text>
              <Text style={styles.sectionTitle}>{t("Quando prefere?")}</Text>
            </View>

            <View style={styles.timeZone}>
              <Ionicons name="time-outline" size={15} color={tc.fg("#636366")} />
              <Text style={styles.timeZoneText}>{t("Luanda")}</Text>
            </View>
          </View>

          {/* TIME GRID */}
          {slotsLoading ? (
            <View style={styles.slotsCenterState}>
              <ActivityIndicator color={tc.fg("#000000")} />
            </View>
          ) : slots.length > 0 ? (
            <View style={styles.wheelCard}>
              <Text style={styles.wheelHint}>
                {slots.length === 1 ? t("1 horário livre") : t("{0} horários livres", [slots.length])}
                {dayHours ? ` · ${clock(dayHours.open)}–${clock(dayHours.close)}` : ""}
              </Text>
              {/* Refaz a roda ao mudar de dia, para abrir de novo na primeira hora. */}
              <TimeWheel key={selectedDateKey} times={slots.map((slot) => slot.time)} value={selectedTime} onChange={setSelectedTime} />
            </View>
          ) : (
            <View style={styles.emptySlots}>
              <View style={styles.emptySlotsIcon}>
                <Ionicons name="time-outline" size={22} color={tc.fg("#AEAEB2")} />
              </View>

              <Text style={styles.emptySlotsTitle}>
                {slotsError
                  ? t("Não foi possível carregar os horários")
                  : closedToday
                    ? t("O espaço não está disponível neste dia")
                    : t("Sem horários disponíveis neste dia")}
              </Text>

              <Text style={styles.emptySlotsText}>
                {closedToday ? t("O espaço não trabalha neste dia da semana. Escolha outra data.") : t("Tente escolher outra data.")}
              </Text>
            </View>
          )}

          <View style={styles.bottomSpace} />
        </ScrollView>

        {/* BOTTOM CTA */}
        <BlurView intensity={85} tint={tc.dark ? "dark" : "light"} style={styles.bottomBar}>
          <View style={styles.bottomBarInner}>
            <View style={styles.bookingPreview}>
              <Text style={styles.previewLabel}>{t("SEU AGENDAMENTO")}</Text>

              <View style={styles.previewRow}>
                <Text style={styles.previewDate}>
                  {currentDate?.number} {currentDate?.month}
                </Text>

                <View style={styles.previewDot} />

                <Text style={[styles.previewTime, !selectedTime && styles.previewTimeEmpty]}>
                  {selectedTime ? formatSlotTime(selectedTime) : t("Escolha o horário")}
                </Text>
              </View>
            </View>

            <Animated.View style={[styles.continueButtonWrapper, { transform: [{ scale: buttonScale }] }]}>
              <Pressable
                onPress={pressButton}
                disabled={!selectedTime}
                style={[styles.continueButton, !selectedTime && styles.continueButtonDisabled]}
              >
                <LinearGradient
                  colors={tc.bgs(selectedTime ? ["#000000", "#2C2C2E"] : ["#D1D1D6", "#D1D1D6"])}
                  style={styles.continueGradient}
                >
                  <Text style={[styles.continueText, !selectedTime && styles.continueTextDisabled]}>{t("Continuar")}</Text>

                  <Ionicons name="arrow-forward" size={18} color={tc.fg(selectedTime ? "#FFFFFF" : "#AEAEB2")} />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>
        </BlurView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (tc: ThemeRoles) =>
  StyleSheet.create({
    dateCardClosed: {
      opacity: 0.45,
    },

    selectedDateHours: {
      marginTop: 3,
      fontSize: 12,
      fontWeight: "600",
      color: tc.fg("#636366"),
    },

    wheelCard: {
      marginHorizontal: 20,
      marginTop: 14,
      paddingTop: 16,
      paddingBottom: 6,
      borderRadius: 26,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#FFFFFF"),
      borderWidth: 1,
      borderColor: tc.border("rgba(0,0,0,0.06)"),
    },

    wheelHint: {
      textAlign: "center",
      fontSize: 12,
      fontWeight: "600",
      letterSpacing: 0.3,
      color: tc.fg("#636366"),
    },

    wheel: {
      height: WHEEL_ROW * WHEEL_ROWS,
      justifyContent: "center",
    },

    wheelBand: {
      position: "absolute",
      left: 18,
      right: 18,
      height: WHEEL_ROW,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(46, 103, 179,0.10)"),
    },

    wheelRow: {
      height: WHEEL_ROW,
      alignItems: "center",
      justifyContent: "center",
    },

    wheelText: {
      fontSize: 26,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
      color: tc.fg("#000000"),
    },

    wheelIcon: {
      position: "absolute",
      left: 34,
    },

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

    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 130,
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
      alignItems: "center",
      flex: 1,
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
      marginBottom: 26,
    },

    progressTrack: {
      height: 4,
      borderRadius: 2,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#D1D1D6"),
      overflow: "hidden",
    },

    progressFill: {
      width: "75%",
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

    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: tc.bg("rgba(255,255,255,0.82)"),
      borderRadius: 22,
      borderCurve: "continuous",
      padding: 14,
      borderWidth: 1,
      borderColor: tc.border("rgba(255,255,255,0.9)"),
      marginBottom: 30,
    },

    summaryIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg("#000000"),
      marginRight: 11,
    },

    summaryInfo: {
      flex: 1,
    },

    summaryLabel: {
      fontSize: 8,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 3,
    },

    summaryTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
    },

    summaryMeta: {
      fontSize: 10,
      color: tc.fg("#636366"),
      marginTop: 2,
      fontWeight: "600",
    },

    summaryDivider: {
      width: 1,
      height: 38,
      backgroundColor: tc.bg("#E5E5EA"),
      marginHorizontal: 12,
    },

    professionalMini: {
      flexDirection: "row",
      alignItems: "center",
    },

    avatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#E5E5EA"),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 7,
    },

    avatarText: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
    },

    professionalName: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
    },

    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },

    sectionEyebrow: {
      fontSize: 9,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 4,
    },

    sectionTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: tc.fg("#000000"),
      letterSpacing: -0.5,
    },

    calendarIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(255,255,255,0.85)"),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tc.border("rgba(0,0,0,0.05)"),
    },

    dateList: {
      gap: 10,
      paddingVertical: 3,
      paddingRight: 10,
    },

    dateCard: {
      width: 67,
      height: 92,
      borderRadius: 20,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: tc.bg("rgba(255,255,255,0.82)"),
      borderWidth: 1,
      borderColor: tc.border("#E5E5EA"),
    },

    dateCardSelected: {
      borderColor: tc.border("#000000"),
      backgroundColor: tc.bg("#000000"),
    },

    dateDay: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      letterSpacing: 0.3,
      marginBottom: 4,
    },

    dateNumber: {
      fontSize: 24,
      fontWeight: "700",
      color: tc.fg("#000000"),
      letterSpacing: -0.4,
    },

    dateMonth: {
      fontSize: 8,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginTop: 3,
    },

    dateSelectedText: {
      color: tc.fg("#FFFFFF"),
    },

    selectedDateCard: {
      marginTop: 18,
      padding: 14,
      borderRadius: 19,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(255,255,255,0.9)"),
      borderWidth: 1,
      borderColor: tc.border("#E5E5EA"),
      flexDirection: "row",
      alignItems: "center",
    },

    selectedDateIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#000000"),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    selectedDateInfo: {
      flex: 1,
    },

    selectedDateLabel: {
      fontSize: 8,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 3,
    },

    selectedDateTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
    },

    timeHeader: {
      marginTop: 32,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 13,
    },

    timeZone: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: 2,
    },

    timeZoneText: {
      fontSize: 10,
      color: tc.fg("#636366"),
      fontWeight: "700",
    },

    slotsCenterState: {
      paddingVertical: 40,
      alignItems: "center",
      justifyContent: "center",
    },

    timeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 10,
    },

    timeCard: {
      width: "23.5%",
      height: 48,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg("rgba(255,255,255,0.86)"),
      borderWidth: 1,
      borderColor: tc.border("#E5E5EA"),
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 5,
      overflow: "hidden",
    },

    timeCardSelected: {
      borderColor: tc.border("#000000"),
      backgroundColor: tc.bg("#000000"),
    },

    timeSelectedGradient: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },

    timeText: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
    },

    timeTextSelected: {
      color: tc.fg("#FFFFFF"),
    },

    emptySlots: {
      paddingVertical: 34,
      paddingHorizontal: 20,
      borderRadius: 20,
      borderCurve: "continuous",
      alignItems: "center",
      backgroundColor: tc.bg("rgba(255,255,255,0.65)"),
      borderWidth: 1,
      borderColor: tc.border("rgba(0,0,0,0.05)"),
    },

    emptySlotsIcon: {
      width: 46,
      height: 46,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#E5E5EA"),
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },

    emptySlotsTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
      textAlign: "center",
    },

    emptySlotsText: {
      marginTop: 5,
      fontSize: 11,
      color: tc.fg("#636366"),
      textAlign: "center",
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
      gap: 12,
    },

    bookingPreview: {
      flex: 1,
    },

    previewLabel: {
      fontSize: 8,
      letterSpacing: 0.3,
      fontWeight: "700",
      color: tc.fg("#8E8E93"),
      marginBottom: 4,
    },

    previewRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    previewDate: {
      fontSize: 13,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
    },

    previewDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#8E8E93"),
      marginHorizontal: 7,
    },

    previewTime: {
      fontSize: 13,
      fontWeight: "700",
      color: tc.fg("#1C1C1E"),
    },

    previewTimeEmpty: {
      color: tc.fg("#AEAEB2"),
      fontWeight: "700",
    },

    continueButtonWrapper: {
      width: 142,
    },

    continueButton: {
      height: 52,
      borderRadius: 17,
      borderCurve: "continuous",
      overflow: "hidden",
    },

    continueButtonDisabled: {
      opacity: 0.9,
    },

    continueGradient: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
    },

    continueText: {
      color: tc.fg("#FFFFFF"),
      fontSize: 12,
      fontWeight: "700",
    },

    continueTextDisabled: {
      color: tc.fg("#AEAEB2"),
    },

    pressed: {
      opacity: 0.8,
    },
  });
