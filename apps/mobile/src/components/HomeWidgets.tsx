import React, { useCallback, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View, type DimensionValue } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useRouter } from "expo-router";
import type { AppointmentDTO, BusinessDTO, ProfessionalDTO, ServiceDTO } from "@slotix/types";

import { useIOSColors } from "@/components/ios";
import { CircleButton } from "@/components/ScreenChrome";
import { useAuth } from "@/contexts/AuthContext";
import { Typography } from "@/constants/theme";
import { listMyAppointments } from "@/services/appointments";
import { getBusiness, getBusinessServices } from "@/services/businesses";
import { listNotifications } from "@/services/notifications";
import { onRealtime } from "@/services/realtime";
import { dateLocale, translate, useT } from "@/i18n";

/*
 * Peças da Home: o cartão da próxima marcação, o contador de avisos por ler e os blocos
 * de carregamento (skeleton) que guardam o lugar das secções enquanto os dados chegam.
 */

/* ---------------------------------------------------------
   Movimento reduzido (Acessibilidade → Movimento)
--------------------------------------------------------- */

export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => alive && setReduced(value))
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

/* ---------------------------------------------------------
   Skeleton
--------------------------------------------------------- */

// Um bloco cinzento que "respira" devagar: mostra a forma do que vai aparecer, em vez de
// um ecrã vazio. Com movimento reduzido fica parado.
export function Skeleton({
  width,
  height,
  radius = 12,
}: {
  width: DimensionValue;
  height: DimensionValue;
  radius?: number;
}) {
  const colors = useIOSColors();
  const reduceMotion = useReduceMotion();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 850, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        borderCurve: "continuous",
        backgroundColor: colors.backgroundSelected,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
      }}
    />
  );
}

/* ---------------------------------------------------------
   Avisos por ler
--------------------------------------------------------- */

// Quantos avisos estão por ler; volta a contar ao regressar ao ecrã e quando chega um
// aviso novo pela ligação em tempo real.
export function useUnreadCount(enabled: boolean): number {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const notifications = await listNotifications();
      setCount(notifications.filter((notification) => !notification.read).length);
    } catch {
      // fica a contagem anterior
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        setCount(0);
        return;
      }
      void load();
      const offNotification = onRealtime("notification", () => void load());
      const offResync = onRealtime("resync", () => void load());
      return () => {
        offNotification();
        offResync();
      };
    }, [enabled, load]),
  );

  return count;
}

// O sino dos avisos, igual em todos os ecrãs (Início, Explorar): com o número real de
// avisos por ler, que se atualiza na hora quando chega um aviso novo.
export function NotificationBell() {
  const t = useT();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const unread = useUnreadCount(isAuthenticated);

  return (
    <CircleButton
      icon={unread > 0 ? "notifications" : "notifications-outline"}
      label={unread > 0 ? t("Notificações, {0} por ler", [unread]) : t("Notificações")}
      badge={unread}
      onPress={() => router.push("/perfil/notifications")}
    />
  );
}

/* ---------------------------------------------------------
   Próxima marcação
--------------------------------------------------------- */

export interface UpcomingAppointment {
  appointment: AppointmentDTO;
  date: Date;
  business?: BusinessDTO;
  service?: ServiceDTO;
  professional?: ProfessionalDTO;
}

// A marcação ativa (pendente ou confirmada) mais próxima no futuro, com o nome do espaço
// e do serviço. Atualiza ao voltar à Home e quando o espaço muda uma marcação.
export function useUpcomingAppointment(enabled: boolean) {
  const [upcoming, setUpcoming] = useState<UpcomingAppointment | null>(null);
  const [loading, setLoading] = useState(enabled);
  // Espaço e serviços já pedidos: não se repetem a cada atualização.
  const details = useRef(new Map<string, { business: BusinessDTO; services: ServiceDTO[] }>());

  const load = useCallback(async () => {
    try {
      const now = Date.now();
      const next = (await listMyAppointments())
        .filter((appointment) => appointment.status === "PENDING" || appointment.status === "CONFIRMED")
        .map((appointment) => ({ appointment, date: new Date(appointment.scheduledAt) }))
        .filter((item) => item.date.getTime() > now)
        .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

      if (!next) {
        setUpcoming(null);
        return;
      }

      const { businessId, serviceId } = next.appointment;
      let detail = details.current.get(businessId);
      if (!detail) {
        const [business, services] = await Promise.all([getBusiness(businessId), getBusinessServices(businessId)]);
        detail = { business, services };
        details.current.set(businessId, detail);
      }

      setUpcoming({
        ...next,
        business: detail.business,
        service: detail.services.find((service) => service.id === serviceId),
      });
    } catch {
      // Mantém o cartão que já estava; a próxima atualização tenta de novo.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) {
        setUpcoming(null);
        setLoading(false);
        return;
      }
      void load();
      const offAppointment = onRealtime("appointment", () => void load());
      const offResync = onRealtime("resync", () => void load());
      return () => {
        offAppointment();
        offResync();
      };
    }, [enabled, load]),
  );

  return { upcoming, loading, reload: load };
}

// "Daqui a 25 min", "Daqui a 3 h", "Hoje", "Amanhã", "Em 3 dias" ou a data por extenso.
function whenText(date: Date, now: number): string {
  const minutes = Math.round((date.getTime() - now) / 60000);
  if (minutes < 60) return translate("Daqui a {0} min", [Math.max(minutes, 1)]);

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const days = Math.round((day.getTime() - today.getTime()) / 86400000);

  if (days === 0) return minutes < 6 * 60 ? translate("Daqui a {0} h", [Math.round(minutes / 60)]) : translate("Hoje");
  if (days === 1) return translate("Amanhã");
  if (days < 7) return translate("Em {0} dias", [days]);
  return new Intl.DateTimeFormat(dateLocale(), { weekday: "short", day: "numeric", month: "short" }).format(date);
}

function timeText(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// O texto "Daqui a…" acompanha o relógio: atualiza-se a cada minuto.
function useNow(): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function UpcomingAppointmentCard({ item, onPress }: { item: UpcomingAppointment; onPress: () => void }) {
  const t = useT();
  const now = useNow();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue === 1 ? 6 : 0 }).start();

  const confirmed = item.appointment.status === "CONFIRMED";
  const when = whenText(item.date, now);
  const day = item.date.getDate();
  const month = new Intl.DateTimeFormat(dateLocale(), { month: "short" }).format(item.date).replace(".", "").toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => spring(0.98)}
      onPressOut={() => spring(1)}
      accessibilityRole="button"
      accessibilityLabel={`${t("PRÓXIMA MARCAÇÃO")}: ${item.service?.name ?? t("Serviço")}, ${item.business?.name ?? t("Espaço")}, ${when}, ${timeText(item.date)}`}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient colors={["#0A84FF", "#5E5CE6"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          {/* Reflexo suave no canto, para dar volume ao cartão */}
          <View style={styles.glow} />

          <View style={styles.cardTop}>
            <Text style={styles.eyebrow}>{t("PRÓXIMA MARCAÇÃO")}</Text>
            <View style={styles.status}>
              <View style={[styles.statusDot, { backgroundColor: confirmed ? "#30D158" : "#FFD60A" }]} />
              <Text style={styles.statusText}>{confirmed ? t("Confirmado") : t("Pendente")}</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.dateBlock}>
              <Text style={styles.dateMonth}>{month}</Text>
              <Text style={styles.dateDay}>{day}</Text>
            </View>

            <View style={styles.cardText}>
              <Text style={styles.service} numberOfLines={1}>
                {item.service?.name ?? t("Serviço")}
              </Text>
              <Text style={styles.business} numberOfLines={1}>
                {item.business?.name ?? t("Espaço")}
                {item.professional ? `  ·  ${item.professional.name}` : ""}
              </Text>
              <View style={styles.whenRow}>
                <Ionicons name="time" size={14} color="#FFFFFF" />
                <Text style={styles.whenText} numberOfLines={1}>
                  {when} · {timeText(item.date)}
                </Text>
              </View>
            </View>

            {item.business?.imageUrl ? (
              <Image source={{ uri: item.business.imageUrl }} style={styles.thumb} contentFit="cover" transition={200} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            )}
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderCurve: "continuous",
    padding: 16,
    gap: 14,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    ...Typography.caption1,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: "rgba(255,255,255,0.8)",
  },
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.caption1,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dateBlock: {
    width: 54,
    height: 58,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  dateMonth: {
    ...Typography.caption2,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },
  dateDay: {
    ...Typography.title2,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  service: {
    ...Typography.headline,
    color: "#FFFFFF",
  },
  business: {
    ...Typography.subheadline,
    color: "rgba(255,255,255,0.85)",
  },
  whenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  whenText: {
    ...Typography.footnote,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
});
