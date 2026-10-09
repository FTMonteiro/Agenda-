import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppointmentDTO, AppointmentStatus, BusinessDTO, ProfessionalDTO, ServiceDTO } from "@slotix/types";

import { useIOSColors } from "@/components/ios";
import { Typography } from "@/constants/theme";
import { cancelAppointment, listMyAppointments } from "../services/appointments";
import { syncReminders } from "../services/reminders";
import { usePreferences } from "../contexts/PreferencesContext";
import { getBusiness, getBusinessProfessionals, getBusinessServices } from "../services/businesses";
import { useT, translate, dateLocale } from "@/i18n";

// De quanto em quanto tempo o ecrã volta a perguntar ao servidor pelo estado das
// marcações enquanto está aberto — é assim que "Pendente" passa a "Confirmado" ou
// "Concluído" sozinho, quando o espaço confirma ou regista o pagamento.
const REFRESH_INTERVAL_MS = 15000;

type Tab = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

const TABS: { value: Tab; label: string }[] = [
  { value: "PENDING", label: "Pendentes" },
  { value: "CONFIRMED", label: "Confirmados" },
  { value: "COMPLETED", label: "Concluídos" },
  { value: "CANCELLED", label: "Cancelados" },
];

// "Não compareceu" fica junto dos cancelados: são as marcações que não se realizaram.
function tabOf(status: AppointmentStatus): Tab {
  return status === "NO_SHOW" ? "CANCELLED" : status;
}

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function statusStyle(status: AppointmentStatus, colors: ReturnType<typeof useIOSColors>) {
  switch (status) {
    case "PENDING":
      return { label: translate("Pendente"), icon: "time" as IconName, color: colors.warning, background: colors.warningBackground };
    case "CONFIRMED":
      return { label: translate("Confirmado"), icon: "checkmark-circle" as IconName, color: colors.info, background: colors.infoBackground };
    case "COMPLETED":
      return { label: translate("Concluído"), icon: "checkmark-done-circle" as IconName, color: colors.success, background: colors.successBackground };
    case "NO_SHOW":
      return { label: translate("Não compareceu"), icon: "alert-circle" as IconName, color: colors.textSecondary, background: colors.input };
    default:
      return { label: translate("Cancelado"), icon: "close-circle" as IconName, color: colors.error, background: colors.errorBackground };
  }
}

const STATUS_HINT: Record<AppointmentStatus, string> = {
  PENDING: "À espera que o espaço confirme a sua marcação.",
  CONFIRMED: "O espaço confirmou. Esperamos por si à hora marcada.",
  COMPLETED: "Serviço realizado e pagamento registado pelo espaço.",
  CANCELLED: "Esta marcação foi cancelada.",
  NO_SHOW: "O espaço registou que não compareceu.",
};

interface AppointmentView {
  appointment: AppointmentDTO;
  date: Date;
  business?: BusinessDTO;
  service?: ServiceDTO;
  professional?: ProfessionalDTO;
}

function formatPrice(value: number): string {
  return `${value.toLocaleString("pt-AO")} Kz`;
}

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat(dateLocale(), { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function monthShort(date: Date): string {
  return new Intl.DateTimeFormat(dateLocale(), { month: "short" }).format(date).replace(".", "").toUpperCase();
}

// "Hoje", "Amanhã", "Em 3 dias"… para a marcação em destaque.
function relativeDay(date: Date): string {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const days = Math.round((target.getTime() - start.getTime()) / 86400000);

  if (days === 0) return translate("Hoje");
  if (days === 1) return translate("Amanhã");
  if (days > 1) return translate("Em {0} dias", [days]);
  return formatLongDate(date);
}

/* Controlo segmentado com contagem em cada separador e a pílula a deslizar. */
function Segmented({ value, counts, onChange }: { value: Tab; counts: Record<Tab, number>; onChange: (next: Tab) => void }) {
  const t = useT();
  const colors = useIOSColors();
  const [width, setWidth] = useState(0);
  const index = TABS.findIndex((tab) => tab.value === value);
  const position = useRef(new Animated.Value(index)).current;

  useEffect(() => {
    Animated.spring(position, { toValue: index, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
  }, [index, position]);

  const segment = width > 0 ? (width - 4) / TABS.length : 0;

  return (
    <View
      style={[styles.segmented, { backgroundColor: colors.input }]}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {segment > 0 ? (
        <Animated.View
          style={[
            styles.segmentThumb,
            { width: segment, backgroundColor: colors.surfaceElevated, transform: [{ translateX: Animated.multiply(position, segment) }] },
          ]}
        />
      ) : null}
      {TABS.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentLabel, { color: colors.text, fontWeight: active ? "600" : "500" }]} numberOfLines={1}>
              {t(tab.label)}
            </Text>
            {counts[tab.value] > 0 ? (
              <Text style={[styles.segmentCount, { color: active ? colors.primary : colors.textSecondary }]}>{counts[tab.value]}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function StatusPill({ status }: { status: AppointmentStatus }) {
  const t = useT();
  const colors = useIOSColors();
  const style = statusStyle(status, colors);
  return (
    <View style={[styles.pill, { backgroundColor: style.background }]}>
      <Ionicons name={style.icon} size={13} color={style.color} />
      <Text style={[styles.pillText, { color: style.color }]}>{t(style.label)}</Text>
    </View>
  );
}

function AppointmentCard({ item, onPress }: { item: AppointmentView; onPress: () => void }) {
  const t = useT();
  const colors = useIOSColors();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue === 1 ? 6 : 0 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={() => spring(0.98)} onPressOut={() => spring(1)} accessibilityRole="button">
      <Animated.View style={[styles.card, { backgroundColor: colors.card, transform: [{ scale }] }]}>
        <View style={[styles.dateBlock, { backgroundColor: colors.input }]}>
          <Text style={[styles.dateMonth, { color: colors.error }]}>{monthShort(item.date)}</Text>
          <Text style={[styles.dateDay, { color: colors.text }]}>{item.date.getDate()}</Text>
          <Text style={[styles.dateTime, { color: colors.textSecondary }]}>{formatTime(item.date)}</Text>
        </View>

        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.service?.name ?? t("Serviço")}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.business?.name ?? t("Espaço")}
            {item.professional ? `  ·  ${item.professional.name}` : ""}
          </Text>
          <View style={styles.cardFooter}>
            <StatusPill status={item.appointment.status} />
            <Text style={[styles.cardPrice, { color: colors.text }]}>{formatPrice(item.appointment.price)}</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
      </Animated.View>
    </Pressable>
  );
}

/* Folha de detalhes da marcação (folha do iOS, com as ações no fundo). */
function DetailsSheet({
  item,
  cancelling,
  onClose,
  onCancel,
  onOpenSpace,
}: {
  item: AppointmentView | null;
  cancelling: boolean;
  onClose: () => void;
  onCancel: () => void;
  onOpenSpace: () => void;
}) {
  const t = useT();
  const colors = useIOSColors();
  if (!item) return null;

  const { appointment } = item;
  const style = statusStyle(appointment.status, colors);
  const canCancel = appointment.status === "PENDING" || appointment.status === "CONFIRMED";

  const rows: { icon: IconName; label: string; value: string }[] = [
    { icon: "calendar", label: t("Data"), value: formatLongDate(item.date) },
    { icon: "time", label: t("Hora"), value: formatTime(item.date) },
    { icon: "cut", label: t("Serviço"), value: item.service?.name ?? "—" },
    { icon: "hourglass", label: t("Duração"), value: item.service ? `${item.service.duration} min` : "—" },
    { icon: "person", label: t("Profissional"), value: item.professional?.name ?? "—" },
    { icon: "location", label: t("Morada"), value: item.business?.address ?? "—" },
    { icon: "cash", label: t("Preço"), value: formatPrice(appointment.price) },
  ];

  return (
    <Modal visible animationType="slide" presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"} onRequestClose={onClose}>
      <SafeAreaView style={[styles.sheet, { backgroundColor: colors.background }]} edges={Platform.OS === "ios" ? [] : ["top"]}>
        <View style={styles.sheetNav}>
          <View style={styles.sheetNavSide} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>{t("Marcação")}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={[styles.sheetNavSide, styles.sheetNavRight]}>
            <Text style={[styles.sheetDone, { color: colors.primary }]}>{t("OK")}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.statusBanner, { backgroundColor: style.background }]}>
            <Ionicons name={style.icon} size={30} color={style.color} />
            <View style={styles.flex}>
              <Text style={[styles.statusBannerTitle, { color: style.color }]}>{t(style.label)}</Text>
              <Text style={[styles.statusBannerText, { color: colors.text }]}>{t(STATUS_HINT[appointment.status])}</Text>
            </View>
          </View>

          <Pressable onPress={onOpenSpace} accessibilityRole="button">
            {({ pressed }) => (
              <View style={[styles.spaceRow, { backgroundColor: pressed ? colors.backgroundSelected : colors.card }]}>
                <View style={[styles.spaceImage, { backgroundColor: colors.input }]}>
                  {item.business?.imageUrl ? (
                    <Image source={{ uri: item.business.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Ionicons name="storefront-outline" size={22} color={colors.textSecondary} />
                  )}
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.business?.name ?? t("Espaço")}
                  </Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                    {t("Ver o espaço")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} />
              </View>
            )}
          </Pressable>

          <View style={[styles.detailGroup, { backgroundColor: colors.card }]}>
            {rows.map((row, index) => (
              <View key={row.label}>
                <View style={styles.detailRow}>
                  <Ionicons name={row.icon} size={18} color={colors.textSecondary} />
                  <Text style={[styles.detailLabel, { color: colors.text }]}>{t(row.label)}</Text>
                  <Text style={[styles.detailValue, { color: colors.textSecondary }]} numberOfLines={2}>
                    {row.value}
                  </Text>
                </View>
                {index < rows.length - 1 ? <View style={[styles.separator, { backgroundColor: colors.divider }]} /> : null}
              </View>
            ))}
          </View>

          {appointment.notes ? (
            <View style={[styles.detailGroup, styles.notes, { backgroundColor: colors.card }]}>
              <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>{t("NOTAS")}</Text>
              <Text style={[styles.notesText, { color: colors.text }]}>{appointment.notes}</Text>
            </View>
          ) : null}

          {canCancel ? (
            <Pressable onPress={onCancel} disabled={cancelling} accessibilityRole="button">
              {({ pressed }) => (
                <View style={[styles.cancelButton, { backgroundColor: pressed ? colors.backgroundSelected : colors.card }]}>
                  {cancelling ? (
                    <ActivityIndicator color={colors.error} />
                  ) : (
                    <Text style={[styles.cancelText, { color: colors.error }]}>{t("Cancelar marcação")}</Text>
                  )}
                </View>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function AppointmentsScreen() {
  const t = useT();
  const { preferences } = usePreferences();
  const router = useRouter();
  const colors = useIOSColors();
  const insets = useSafeAreaInsets();

  const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
  const [businessMap, setBusinessMap] = useState<Record<string, BusinessDTO>>({});
  const [serviceMap, setServiceMap] = useState<Record<string, ServiceDTO>>({});
  const [professionalMap, setProfessionalMap] = useState<Record<string, ProfessionalDTO>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("PENDING");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadedBusinesses = useRef(new Set<string>());
  const pickedInitialTab = useRef(false);

  // Os nomes do espaço, serviço e profissional vêm de pedidos por espaço, feitos uma só
  // vez por espaço; nas atualizações seguintes só se volta a pedir a lista de marcações.
  const load = useCallback(async () => {
    try {
      const data = await listMyAppointments();
      setAppointments(data);

      const missing = [...new Set(data.map((appointment) => appointment.businessId))].filter(
        (businessId) => !loadedBusinesses.current.has(businessId),
      );
      if (missing.length === 0) return;

      const details = await Promise.all(
        missing.map(async (businessId) => {
          const [business, services, professionals] = await Promise.all([
            getBusiness(businessId),
            getBusinessServices(businessId),
            getBusinessProfessionals(businessId),
          ]);
          return { businessId, business, services, professionals };
        }),
      );

      for (const detail of details) loadedBusinesses.current.add(detail.businessId);
      setBusinessMap((current) => ({ ...current, ...Object.fromEntries(details.map((d) => [d.businessId, d.business])) }));
      setServiceMap((current) => ({ ...current, ...Object.fromEntries(details.flatMap((d) => d.services.map((s) => [s.id, s]))) }));
      setProfessionalMap((current) => ({
        ...current,
        ...Object.fromEntries(details.flatMap((d) => d.professionals.map((p) => [p.id, p]))),
      }));
    } catch {
      // Mantém o que já estava no ecrã; a próxima atualização automática tenta de novo.
    } finally {
      setLoading(false);
    }
  }, []);

  // Atualiza ao entrar no ecrã e depois de 15 em 15 segundos enquanto estiver aberto.
  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), REFRESH_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const views: AppointmentView[] = useMemo(
    () =>
      appointments.map((appointment) => ({
        appointment,
        date: new Date(appointment.scheduledAt),
        business: businessMap[appointment.businessId],
        service: serviceMap[appointment.serviceId],
        professional: professionalMap[appointment.professionalId],
      })),
    [appointments, businessMap, serviceMap, professionalMap],
  );

  const counts = useMemo(() => {
    const result: Record<Tab, number> = { PENDING: 0, CONFIRMED: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const view of views) result[tabOf(view.appointment.status)]++;
    return result;
  }, [views]);

  // Na primeira carga abre o separador mais útil: confirmados, se houver; senão pendentes.
  useEffect(() => {
    if (loading || pickedInitialTab.current) return;
    pickedInitialTab.current = true;
    if (counts.PENDING === 0 && counts.CONFIRMED > 0) setTab("CONFIRMED");
    else if (counts.PENDING === 0 && counts.CONFIRMED === 0 && counts.COMPLETED > 0) setTab("COMPLETED");
  }, [loading, counts]);

  const visible = useMemo(() => {
    const upcomingFirst = tab === "PENDING" || tab === "CONFIRMED";
    return views
      .filter((view) => tabOf(view.appointment.status) === tab)
      .sort((a, b) => (upcomingFirst ? a.date.getTime() - b.date.getTime() : b.date.getTime() - a.date.getTime()));
  }, [views, tab]);

  // A próxima marcação ainda por acontecer (confirmada ou pendente) fica em destaque no topo.
  const next = useMemo(() => {
    const now = Date.now();
    return views
      .filter((view) => (view.appointment.status === "CONFIRMED" || view.appointment.status === "PENDING") && view.date.getTime() >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  }, [views]);

  const selected = views.find((view) => view.appointment.id === selectedId) ?? null;

  const confirmCancel = () => {
    if (!selected) return;
    Alert.alert(t("Cancelar marcação?"), t("O espaço será avisado e o horário fica livre para outra pessoa."), [
      { text: t("Manter"), style: "cancel" },
      {
        text: t("Cancelar marcação"),
        style: "destructive",
        onPress: async () => {
          setCancelling(true);
          try {
            const updated = await cancelAppointment(selected.appointment.id);
            // Uma marcação cancelada deixa de ter lembretes.
            void syncReminders(preferences.reminders);
            setAppointments((current) => current.map((appointment) => (appointment.id === updated.id ? updated : appointment)));
            setSelectedId(null);
          } catch {
            Alert.alert(t("Não foi possível cancelar"), t("Tente novamente dentro de momentos."));
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const openSpace = (businessId: string) => {
    setSelectedId(null);
    router.push({ pathname: "/space", params: { businessId } } as never);
  };

  const emptyText: Record<Tab, string> = {
    PENDING: "Quando fizer uma marcação, ela fica aqui até o espaço a confirmar.",
    CONFIRMED: "As marcações confirmadas pelo espaço aparecem aqui.",
    COMPLETED: "As marcações já realizadas e pagas aparecem aqui.",
    CANCELLED: "Não tem marcações canceladas.",
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textSecondary} />}
      >
        {/* As marcações abrem-se a partir do Perfil. */}
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile" as never))}
          accessibilityRole="button"
          accessibilityLabel={t("Voltar")}
          hitSlop={10}
          style={[styles.back, { backgroundColor: colors.card }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>

        {next ? (
          <Pressable onPress={() => setSelectedId(next.appointment.id)} accessibilityRole="button">
            {({ pressed }) => (
              <LinearGradient
                colors={["#0A84FF", "#5E5CE6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.hero, { opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={styles.heroTop}>
                  <Text style={styles.heroEyebrow}>{t("PRÓXIMA MARCAÇÃO")}</Text>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{t(statusStyle(next.appointment.status, colors).label)}</Text>
                  </View>
                </View>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {next.service?.name ?? t("Serviço")}
                </Text>
                <Text style={styles.heroSubtitle} numberOfLines={1}>
                  {next.business?.name ?? t("Espaço")}
                </Text>
                <View style={styles.heroFooter}>
                  <View style={styles.heroInfo}>
                    <Ionicons name="calendar" size={15} color="#FFFFFF" />
                    <Text style={styles.heroInfoText}>{relativeDay(next.date)}</Text>
                  </View>
                  <View style={styles.heroInfo}>
                    <Ionicons name="time" size={15} color="#FFFFFF" />
                    <Text style={styles.heroInfoText}>{formatTime(next.date)}</Text>
                  </View>
                  {next.professional ? (
                    <View style={[styles.heroInfo, styles.flex]}>
                      <Ionicons name="person" size={15} color="#FFFFFF" />
                      <Text style={styles.heroInfoText} numberOfLines={1}>
                        {next.professional.name}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </LinearGradient>
            )}
          </Pressable>
        ) : null}

        <Segmented value={tab} counts={counts} onChange={setTab} />

        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.textSecondary} />
          </View>
        ) : visible.length === 0 ? (
          <View style={styles.state}>
            <Ionicons name="calendar-outline" size={46} color={colors.textTertiary} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>{t("Nada por aqui")}</Text>
            <Text style={[styles.stateText, { color: colors.textSecondary }]}>{t(emptyText[tab])}</Text>
            {appointments.length === 0 ? (
              <Pressable onPress={() => router.replace("/marcar" as never)} accessibilityRole="button">
                {({ pressed }) => (
                  <View style={[styles.newBooking, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}>
                    <Text style={styles.exploreButtonText}>{t("Marcar um serviço")}</Text>
                  </View>
                )}
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {visible.map((item) => (
              <AppointmentCard key={item.appointment.id} item={item} onPress={() => setSelectedId(item.appointment.id)} />
            ))}
          </View>
        )}
      </ScrollView>

      <DetailsSheet
        item={selected}
        cancelling={cancelling}
        onClose={() => setSelectedId(null)}
        onCancel={confirmCancel}
        onOpenSpace={() => selected && openSpace(selected.appointment.businessId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 150,
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
  },
  hero: {
    borderRadius: 22,
    borderCurve: "continuous",
    padding: 18,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heroEyebrow: {
    ...Typography.caption1,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
  },
  heroBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  heroBadgeText: {
    ...Typography.caption1,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  heroTitle: {
    ...Typography.title1,
    color: "#FFFFFF",
  },
  heroSubtitle: {
    ...Typography.body,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.35)",
  },
  heroInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroInfoText: {
    ...Typography.subheadline,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  segmented: {
    height: 36,
    borderRadius: 10,
    borderCurve: "continuous",
    padding: 2,
    flexDirection: "row",
    marginBottom: 16,
  },
  segmentThumb: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 8,
    borderCurve: "continuous",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  segmentLabel: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  segmentCount: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateBlock: {
    width: 62,
    borderRadius: 12,
    borderCurve: "continuous",
    paddingVertical: 8,
    alignItems: "center",
  },
  dateMonth: {
    ...Typography.caption2,
    fontWeight: "700",
  },
  dateDay: {
    ...Typography.title2,
  },
  dateTime: {
    ...Typography.caption1,
    fontWeight: "600",
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...Typography.headline,
  },
  cardSubtitle: {
    ...Typography.subheadline,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  cardPrice: {
    ...Typography.subheadline,
    fontWeight: "600",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    ...Typography.caption1,
    fontWeight: "600",
  },
  state: {
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 24,
    gap: 8,
  },
  stateTitle: {
    ...Typography.title3,
    marginTop: 8,
  },
  stateText: {
    ...Typography.subheadline,
    textAlign: "center",
    marginBottom: 12,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  newBooking: {
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
  sheet: {
    flex: 1,
  },
  sheetNav: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  sheetNavSide: {
    width: 60,
  },
  sheetNavRight: {
    alignItems: "flex-end",
  },
  sheetTitle: {
    ...Typography.headline,
    flex: 1,
    textAlign: "center",
  },
  sheetDone: {
    ...Typography.body,
    fontWeight: "600",
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    gap: 16,
  },
  statusBanner: {
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  statusBannerTitle: {
    ...Typography.headline,
  },
  statusBannerText: {
    ...Typography.subheadline,
    marginTop: 2,
  },
  spaceRow: {
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  spaceImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderCurve: "continuous",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  detailGroup: {
    borderRadius: 12,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  detailRow: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailLabel: {
    ...Typography.body,
  },
  detailValue: {
    ...Typography.body,
    flex: 1,
    textAlign: "right",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 44,
  },
  notes: {
    padding: 14,
    gap: 4,
  },
  notesLabel: {
    ...Typography.caption1,
    fontWeight: "600",
  },
  notesText: {
    ...Typography.body,
  },
  cancelButton: {
    height: 50,
    borderRadius: 12,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    ...Typography.body,
  },
});
