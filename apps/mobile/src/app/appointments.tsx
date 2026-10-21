import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
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
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { AppointmentDTO, AppointmentStatus, BusinessDTO, ProfessionalDTO, ServiceDTO } from "@slotix/types";

import { Skeleton, UpcomingAppointmentCard } from "@/components/HomeWidgets";
import { useIOSColors } from "@/components/ios";
import { CircleButton, CollapsingTopBar, Reveal } from "@/components/ScreenChrome";
import { Typography } from "@/constants/theme";
import { cancelAppointment, listMyAppointments } from "../services/appointments";
import { clearHistory, getHistoryClearedAt, withoutClearedHistory } from "../services/appointment-history";
import { useAuth } from "../contexts/AuthContext";
import { syncReminders } from "../services/reminders";
import { onRealtime } from "../services/realtime";
import { usePreferences } from "../contexts/PreferencesContext";
import { getBusiness, getBusinessProfessionals, getBusinessServices } from "../services/businesses";
import { tapFeedback } from "../services/haptics";
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

const TAB_ICON: Record<Tab, IconName> = {
  PENDING: "time-outline",
  CONFIRMED: "checkmark-circle-outline",
  COMPLETED: "checkmark-done-circle-outline",
  CANCELLED: "close-circle-outline",
};

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
  NO_SHOW: "Não compareceu no dia marcado, por isso o agendamento foi cancelado.",
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
      <Ionicons name={style.icon} size={12} color={style.color} />
      <Text style={[styles.pillText, { color: style.color }]}>{t(style.label)}</Text>
    </View>
  );
}

// Os grupos da lista: por dia nas marcações por acontecer ("Hoje", "Amanhã", "sexta-feira,
// 24 de outubro"), por mês no histórico ("Outubro de 2026").
function groupLabel(date: Date, upcoming: boolean): string {
  if (!upcoming) {
    const month = new Intl.DateTimeFormat(dateLocale(), { month: "long", year: "numeric" }).format(date);
    return month.charAt(0).toUpperCase() + month.slice(1);
  }
  const day = relativeDay(date);
  return day.charAt(0).toUpperCase() + day.slice(1);
}

function AppointmentCard({ item, onPress }: { item: AppointmentView; onPress: () => void }) {
  const t = useT();
  const colors = useIOSColors();
  const status = statusStyle(item.appointment.status, colors);
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue === 1 ? 6 : 0 }).start();
  const photo = item.business?.logoUrl ?? item.business?.imageUrl;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => spring(0.98)}
      onPressOut={() => spring(1)}
      accessibilityRole="button"
      accessibilityLabel={`${item.service?.name ?? t("Serviço")}, ${item.business?.name ?? t("Espaço")}, ${formatLongDate(item.date)}, ${formatTime(item.date)}, ${t(status.label)}`}
    >
      <Animated.View style={[styles.card, { backgroundColor: colors.card, transform: [{ scale }] }]}>
        {/* Faixa com a cor do estado, para ler a lista de relance */}
        <View style={[styles.cardAccent, { backgroundColor: status.color }]} />

        <View style={[styles.dateBlock, { backgroundColor: colors.input }]}>
          <Text style={[styles.dateMonth, { color: status.color }]}>{monthShort(item.date)}</Text>
          <Text style={[styles.dateDay, { color: colors.text }]}>{item.date.getDate()}</Text>
        </View>

        <View style={styles.cardText}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
            {item.service?.name ?? t("Serviço")}
          </Text>
          <View style={styles.cardBusiness}>
            {photo ? <Image source={{ uri: photo }} style={styles.cardLogo} contentFit="cover" /> : null}
            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.business?.name ?? t("Espaço")}
              {item.professional ? `  ·  ${item.professional.name}` : ""}
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <View style={styles.cardTime}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.cardTimeText, { color: colors.text }]}>{formatTime(item.date)}</Text>
            </View>
            <StatusPill status={item.appointment.status} />
          </View>
        </View>

        <View style={styles.cardEnd}>
          <Text style={[styles.cardPrice, { color: colors.text }]}>{formatPrice(item.appointment.price)}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* Lugar guardado para a lista enquanto as marcações chegam. */
function ListSkeleton() {
  return (
    <View style={styles.list}>
      {[0, 1, 2].map((key) => (
        <Skeleton key={key} width="100%" height={96} radius={18} />
      ))}
    </View>
  );
}

/* Atalho redondo na folha de detalhes ("Ver espaço", "Como chegar", "Ligar"). */
function QuickAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const colors = useIOSColors();
  return (
    <Pressable onPress={onPress} style={styles.flex} accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => (
        <View style={[styles.quickAction, { backgroundColor: colors.card, opacity: pressed ? 0.6 : 1 }]}>
          <View style={[styles.quickIcon, { backgroundColor: colors.infoBackground }]}>
            <Ionicons name={icon} size={19} color={colors.primary} />
          </View>
          <Text style={[styles.quickLabel, { color: colors.text }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
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
  onDirections,
}: {
  item: AppointmentView | null;
  cancelling: boolean;
  onClose: () => void;
  onCancel: () => void;
  onOpenSpace: () => void;
  onDirections: () => void;
}) {
  const t = useT();
  const colors = useIOSColors();
  if (!item) return null;

  const { appointment, business } = item;
  const style = statusStyle(appointment.status, colors);
  const canCancel = appointment.status === "PENDING" || appointment.status === "CONFIRMED";
  const photo = business?.imageUrl ?? business?.logoUrl;
  const hasRoute = business?.latitude != null && business?.longitude != null;

  const rows: { icon: IconName; label: string; value: string }[] = [
    { icon: "calendar", label: t("Data"), value: formatLongDate(item.date) },
    { icon: "time", label: t("Hora"), value: formatTime(item.date) },
    { icon: "hourglass", label: t("Duração"), value: item.service ? `${item.service.duration} min` : "—" },
    { icon: "person", label: t("Profissional"), value: item.professional?.name ?? "—" },
    { icon: "location", label: t("Morada"), value: business?.address ?? "—" },
  ];

  return (
    <Modal visible animationType="slide" presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"} onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false} bounces>
          {/* Capa com a fotografia do espaço, o serviço e o estado */}
          <View style={[styles.cover, { backgroundColor: colors.backgroundSelected }]}>
            {photo ? (
              <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            ) : (
              <LinearGradient colors={["#0A84FF", "#5E5CE6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            )}
            <LinearGradient
              colors={["rgba(0,0,0,0.35)", "rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]}
              locations={[0, 0.35, 1]}
              style={StyleSheet.absoluteFill}
            />
            <SafeAreaView edges={Platform.OS === "ios" ? [] : ["top"]} style={styles.coverNav}>
              <View style={styles.flex} />
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Fechar")}>
                <View style={styles.coverClose}>
                  <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </View>
              </Pressable>
            </SafeAreaView>
            <View style={styles.coverText}>
              <View style={[styles.coverStatus, { backgroundColor: style.color }]}>
                <Ionicons name={style.icon} size={13} color="#FFFFFF" />
                <Text style={styles.coverStatusText}>{t(style.label)}</Text>
              </View>
              <Text style={styles.coverTitle} numberOfLines={2}>
                {item.service?.name ?? t("Serviço")}
              </Text>
              <Text style={styles.coverSubtitle} numberOfLines={1}>
                {business?.name ?? t("Espaço")}
              </Text>
            </View>
          </View>

          <View style={styles.sheetBody}>
            <Text style={[styles.statusHint, { color: colors.textSecondary }]}>{t(STATUS_HINT[appointment.status])}</Text>

            <View style={styles.quickRow}>
              <QuickAction icon="storefront" label={t("Ver o espaço")} onPress={onOpenSpace} />
              {hasRoute ? <QuickAction icon="navigate" label={t("Como chegar")} onPress={onDirections} /> : null}
              {business?.phone ? (
                <QuickAction icon="call" label={t("Ligar")} onPress={() => void Linking.openURL(`tel:${business.phone}`)} />
              ) : null}
            </View>

            <View style={[styles.detailGroup, { backgroundColor: colors.card }]}>
              {rows.map((row, index) => (
                <View key={row.label}>
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIcon, { backgroundColor: colors.input }]}>
                      <Ionicons name={row.icon} size={15} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>
                      {row.value}
                    </Text>
                  </View>
                  {index < rows.length - 1 ? <View style={[styles.separator, { backgroundColor: colors.divider }]} /> : null}
                </View>
              ))}
            </View>

            {/* O total em destaque, como num recibo */}
            <View style={[styles.totalRow, { backgroundColor: colors.card }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{t("Preço")}</Text>
              <Text style={[styles.totalValue, { color: colors.text }]}>{formatPrice(appointment.price)}</Text>
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
                  <View style={[styles.cancelButton, { backgroundColor: colors.errorBackground, opacity: pressed ? 0.7 : 1 }]}>
                    {cancelling ? (
                      <ActivityIndicator color={colors.error} />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={18} color={colors.error} />
                        <Text style={[styles.cancelText, { color: colors.error }]}>{t("Cancelar marcação")}</Text>
                      </>
                    )}
                  </View>
                )}
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function AppointmentsScreen() {
  const t = useT();
  const { preferences } = usePreferences();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // Data do último "Apagar histórico" neste telemóvel (appointment-history.ts).
  const historyClearedAt = useRef<number | null>(null);
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

  const scrollY = useRef(new Animated.Value(0)).current;
  const loadedBusinesses = useRef(new Set<string>());
  const pickedInitialTab = useRef(false);

  // Os nomes do espaço, serviço e profissional vêm de pedidos por espaço, feitos uma só
  // vez por espaço; nas atualizações seguintes só se volta a pedir a lista de marcações.
  const load = useCallback(async () => {
    try {
      if (userId) historyClearedAt.current = await getHistoryClearedAt(userId);
      const data = withoutClearedHistory(await listMyAppointments(), historyClearedAt.current);
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
  }, [userId]);

  // Atualiza ao entrar no ecrã, na hora em que o espaço muda um agendamento (confirma,
  // cancela...) — pela ligação em tempo real — e, de reserva, de 15 em 15 segundos.
  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), REFRESH_INTERVAL_MS);
      const offAppointment = onRealtime("appointment", () => void load());
      const offResync = onRealtime("resync", () => void load());
      return () => {
        clearInterval(timer);
        offAppointment();
        offResync();
      };
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

  // Concluídas, canceladas e faltas: o que "Apagar histórico" tira da lista.
  const historyCount = counts.COMPLETED + counts.CANCELLED;
  const [clearingHistory, setClearingHistory] = useState(false);

  const confirmClearHistory = () => {
    Alert.alert(
      t("Apagar histórico?"),
      t("As marcações concluídas e canceladas deixam de aparecer aqui. As pendentes e confirmadas ficam."),
      [
        { text: t("Manter"), style: "cancel" },
        {
          text: t("Apagar histórico"),
          style: "destructive",
          onPress: async () => {
            setClearingHistory(true);
            try {
              if (!userId) throw new Error("sem sessão");
              historyClearedAt.current = await clearHistory(userId);
              setAppointments((current) => current.filter((appointment) => {
                const group = tabOf(appointment.status);
                return group === "PENDING" || group === "CONFIRMED";
              }));
              setTab(counts.PENDING > 0 || counts.CONFIRMED === 0 ? "PENDING" : "CONFIRMED");
            } catch {
              Alert.alert(t("Não foi possível apagar o histórico"), t("Tente novamente dentro de momentos."));
            } finally {
              setClearingHistory(false);
            }
          },
        },
      ],
    );
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

  // "Como chegar" abre o caminho dentro da app, como na página do espaço.
  const openDirections = () => {
    const business = selected?.business;
    if (!business || business.latitude == null || business.longitude == null) return;
    setSelectedId(null);
    router.push({
      pathname: "/rota",
      params: {
        name: business.name,
        address: business.address ?? "",
        latitude: String(business.latitude),
        longitude: String(business.longitude),
      },
    } as never);
  };

  const changeTab = (next: Tab) => {
    if (next === tab) return;
    tapFeedback();
    setTab(next);
  };

  // A lista do separador escolhido, em grupos com título (dia ou mês).
  const groups = useMemo(() => {
    const upcomingTab = tab === "PENDING" || tab === "CONFIRMED";
    const result: { label: string; items: AppointmentView[] }[] = [];
    for (const item of visible) {
      const label = groupLabel(item.date, upcomingTab);
      const last = result[result.length - 1];
      if (last && last.label === label) last.items.push(item);
      else result.push({ label, items: [item] });
    }
    return result;
  }, [visible, tab]);

  const showClearHistory = (tab === "COMPLETED" || tab === "CANCELLED") && historyCount > 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 56 }]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textSecondary} />}
      >
        {next ? (
          <Reveal index={1}>
            <View style={styles.hero}>
              <UpcomingAppointmentCard item={next} onPress={() => setSelectedId(next.appointment.id)} />
            </View>
          </Reveal>
        ) : null}

        <View style={styles.segmentedWrap}>
          <Segmented value={tab} counts={counts} onChange={changeTab} />
        </View>

        {loading ? (
          <ListSkeleton />
        ) : visible.length === 0 ? (
          <Reveal index={0} key={`empty-${tab}`}>
            <View style={styles.state}>
              <View style={[styles.stateIcon, { backgroundColor: colors.card }]}>
                <Ionicons name={TAB_ICON[tab]} size={30} color={colors.textTertiary} />
              </View>
              <Text style={[styles.stateTitle, { color: colors.text }]}>{t("Nada por aqui")}</Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>{t(emptyText[tab])}</Text>
              {appointments.length === 0 ? (
                <Pressable onPress={() => router.replace("/marcar" as never)} accessibilityRole="button">
                  {({ pressed }) => (
                    <View style={[styles.newBooking, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}>
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                      <Text style={styles.newBookingText}>{t("Marcar um serviço")}</Text>
                    </View>
                  )}
                </Pressable>
              ) : null}
            </View>
          </Reveal>
        ) : (
          // A chave muda com o separador: a lista volta a entrar em cascata ao trocar.
          <View key={tab} style={styles.groups}>
            {groups.map((group, groupIndex) => (
              <Reveal key={group.label} index={groupIndex}>
                <View style={styles.group}>
                  <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{group.label}</Text>
                  <View style={styles.list}>
                    {group.items.map((item) => (
                      <AppointmentCard key={item.appointment.id} item={item} onPress={() => setSelectedId(item.appointment.id)} />
                    ))}
                  </View>
                </View>
              </Reveal>
            ))}
          </View>
        )}
      </Animated.ScrollView>

      <CollapsingTopBar
        scrollY={scrollY}
        title=""
        left={
          // As marcações abrem-se a partir do Perfil.
          <CircleButton
            icon="chevron-back"
            label={t("Voltar")}
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/profile" as never))}
          />
        }
        right={
          showClearHistory ? (
            clearingHistory ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <CircleButton icon="trash-outline" tint={colors.error} label={t("Apagar histórico")} onPress={confirmClearHistory} />
            )
          ) : null
        }
      />

      <DetailsSheet
        item={selected}
        cancelling={cancelling}
        onClose={() => setSelectedId(null)}
        onCancel={confirmCancel}
        onOpenSpace={() => selected && openSpace(selected.appointment.businessId)}
        onDirections={openDirections}
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
    marginTop: 4,
  },
  segmentedWrap: {
    marginTop: 20,
  },
  segmented: {
    height: 38,
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 2,
    flexDirection: "row",
  },
  segmentThumb: {
    position: "absolute",
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 10,
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
  groups: {
    marginTop: 8,
  },
  group: {
    marginTop: 18,
  },
  groupLabel: {
    ...Typography.footnote,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  list: {
    gap: 10,
  },
  card: {
    borderRadius: 18,
    borderCurve: "continuous",
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  dateBlock: {
    width: 54,
    height: 60,
    borderRadius: 14,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  dateMonth: {
    ...Typography.caption2,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  dateDay: {
    ...Typography.title2,
    fontWeight: "700",
  },
  cardText: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    ...Typography.headline,
  },
  cardBusiness: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardLogo: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  cardSubtitle: {
    ...Typography.subheadline,
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  cardTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardTimeText: {
    ...Typography.footnote,
    fontWeight: "600",
  },
  cardEnd: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    alignSelf: "stretch",
    paddingVertical: 2,
  },
  cardPrice: {
    ...Typography.subheadline,
    fontWeight: "700",
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
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  stateIcon: {
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
  },
  stateText: {
    ...Typography.subheadline,
    textAlign: "center",
    marginBottom: 14,
  },
  newBooking: {
    height: 50,
    paddingHorizontal: 26,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  newBookingText: {
    ...Typography.headline,
    color: "#FFFFFF",
  },
  sheet: {
    flex: 1,
  },
  sheetContent: {
    paddingBottom: 48,
  },
  cover: {
    height: 260,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  coverNav: {
    flexDirection: "row",
    padding: 16,
  },
  coverClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  coverText: {
    padding: 20,
    gap: 4,
  },
  coverStatus: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  coverStatusText: {
    ...Typography.caption1,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  coverTitle: {
    ...Typography.title1,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: "#FFFFFF",
  },
  coverSubtitle: {
    ...Typography.body,
    color: "rgba(255,255,255,0.85)",
  },
  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  statusHint: {
    ...Typography.subheadline,
    paddingHorizontal: 4,
  },
  quickRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickAction: {
    borderRadius: 16,
    borderCurve: "continuous",
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 6,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    ...Typography.footnote,
    fontWeight: "600",
  },
  detailGroup: {
    borderRadius: 16,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  detailRow: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  detailLabel: {
    ...Typography.subheadline,
  },
  detailValue: {
    ...Typography.subheadline,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 54,
  },
  totalRow: {
    borderRadius: 16,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    ...Typography.subheadline,
    fontWeight: "600",
  },
  totalValue: {
    ...Typography.title2,
    fontWeight: "800",
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
    borderRadius: 14,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelText: {
    ...Typography.headline,
  },
});
