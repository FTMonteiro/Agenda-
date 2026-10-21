import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandIcon } from "@/components/Brand";
import { useIOSColors } from "@/components/ios";
import { Typography } from "@/constants/theme";
import { useAuth } from "../contexts/AuthContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { useSelectedLocation } from "../contexts/LocationContext";
import { useThemePreference, type ThemePreference } from "../contexts/ThemeContext";
import { listMyAppointments } from "../services/appointments";
import { usePreferenceToggles } from "@/hooks/use-preference-toggles";
import { pickAvatar, uploadAvatar, type AvatarSource } from "../services/avatar";
import { useT, dateLocale, LANGUAGES, useLanguage } from "@/i18n";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: IconName; tint: string }[] = [
  { value: "light", label: "Claro", icon: "sunny", tint: "#FF9500" },
  { value: "dark", label: "Escuro", icon: "moon", tint: "#5856D6" },
  { value: "system", label: "Sistema", icon: "phone-portrait", tint: "#8E8E93" },
];

/* Linha das Definições do iOS: ícone num quadrado colorido, texto, valor e seta. */
function SettingsRow({
  icon,
  tint,
  title,
  value,
  onPress,
  accessory,
}: {
  icon: IconName;
  tint: string;
  title: string;
  value?: string;
  onPress?: () => void;
  accessory?: React.ReactNode;
}) {
  const colors = useIOSColors();

  const content = (pressed: boolean) => (
    <View style={[styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={17} color="#FFFFFF" />
      </View>
      <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
        {title}
      </Text>
      {value ? <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text> : null}
      {accessory ?? (onPress ? <Ionicons name="chevron-forward" size={17} color={colors.textTertiary} /> : null)}
    </View>
  );

  if (!onPress) return content(false);
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
}

function Group({ header, footer, children }: { header?: string; footer?: string; children: React.ReactNode[] }) {
  const colors = useIOSColors();
  return (
    <View style={styles.group}>
      {header ? <Text style={[styles.groupHeader, { color: colors.textSecondary }]}>{header}</Text> : null}
      <View style={[styles.groupCard, { backgroundColor: colors.card }]}>
        {children.map((child, index) => (
          <View key={index}>
            {child}
            {index < children.length - 1 ? (
              <View style={[styles.separator, { backgroundColor: colors.divider }]} />
            ) : null}
          </View>
        ))}
      </View>
      {footer ? <Text style={[styles.groupFooter, { color: colors.textSecondary }]}>{footer}</Text> : null}
    </View>
  );
}

export default function ProfileScreen() {
  const t = useT();
  const router = useRouter();
  const colors = useIOSColors();
  const insets = useSafeAreaInsets();
  const { user, logout, refresh: refreshAuth } = useAuth();
  const { favorites } = useFavorites();
  const { place: currentPlace, coordinates: myPosition } = useSelectedLocation();
  const { preference: themePreference, setPreference: setThemePreference } = useThemePreference();

  const language = useLanguage();
  const languageName = LANGUAGES.find((item) => item.id === language)?.name;

  const [appointmentCount, setAppointmentCount] = useState<number | null>(null);
  const { preferences, setLocation, setReminders } = usePreferenceToggles();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const changePhoto = async (source: AvatarSource) => {
    try {
      const uri = await pickAvatar(source);
      if (!uri) return;

      setUploadingPhoto(true);
      await uploadAvatar(uri);
      await refreshAuth();
    } catch (error) {
      Alert.alert(t("Foto de perfil"), error instanceof Error ? t(error.message) : t("Não foi possível guardar a foto."));
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Folha de ações do iOS: escolher da galeria ou tirar uma foto.
  const choosePhoto = () => {
    Alert.alert(t("Foto de perfil"), undefined, [
      { text: t("Escolher da galeria"), onPress: () => void changePhoto("library") },
      { text: t("Tirar foto"), onPress: () => void changePhoto("camera") },
      { text: t("Cancelar"), style: "cancel" },
    ]);
  };

  // O número de marcações é atualizado sempre que se volta ao perfil.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listMyAppointments()
        .then((data) => {
          if (!cancelled) setAppointmentCount(data.length);
        })
        .catch(() => {
          if (!cancelled) setAppointmentCount(0);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const initials = useMemo(() => {
    const result = (user?.name ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
    return result || "?";
  }, [user?.name]);

  const memberSince = user?.createdAt
    ? new Intl.DateTimeFormat(dateLocale(), { month: "long", year: "numeric" }).format(new Date(user.createdAt))
    : null;

  const confirmLogout = () => {
    Alert.alert(t("Terminar sessão?"), t("Pode voltar a entrar a qualquer momento com o seu e-mail."), [
      { text: t("Cancelar"), style: "cancel" },
      {
        text: t("Terminar sessão"),
        style: "destructive",
        onPress: () => {
          void logout();
          router.replace("/login");
        },
      },
    ]);
  };

  const go = (path: string) => () => router.push(path as never);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Cartão da conta, como o cartão do Apple ID nas Definições */}
      <Pressable
        onPress={go("/perfil/personalinfo")}
        accessibilityRole="button"
        accessibilityLabel={t("Informações pessoais")}
      >
        {({ pressed }) => (
          <View
            style={[
              styles.accountCard,
              { backgroundColor: colors.card },
              pressed && { backgroundColor: colors.backgroundSelected },
            ]}
          >
            <Pressable
              onPress={choosePhoto}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t("Alterar foto de perfil")}
            >
              <View>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={["#5AC8FA", "#2E67B3"]} style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </LinearGradient>
                )}
                {uploadingPhoto ? (
                  <View style={[styles.avatar, styles.avatarBusy]}>
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                ) : null}
                <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              </View>
            </Pressable>
            <View style={styles.accountText}>
              <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                {user?.name ?? t("Conta Agenda+")}
              </Text>
              <Text style={[styles.accountEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                {user?.email ?? ""}
              </Text>
              {memberSince ? (
                <Text style={[styles.accountSince, { color: colors.textSecondary }]}>{t("Membro desde")}{" "}{memberSince}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        )}
      </Pressable>

      {/* Atividade */}
      <View style={styles.stats}>
        <Pressable style={styles.statWrap} onPress={() => router.push("/appointments" as never)}>
          {({ pressed }) => (
            <View style={[styles.stat, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.infoBackground }]}>
                <Ionicons name="calendar" size={18} color={colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{appointmentCount ?? "—"}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("Marcações")}</Text>
            </View>
          )}
        </Pressable>
        <Pressable style={styles.statWrap} onPress={() => router.replace("/favorites" as never)}>
          {({ pressed }) => (
            <View style={[styles.stat, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}>
              <View style={[styles.statIcon, { backgroundColor: colors.errorBackground }]}>
                <Ionicons name="heart" size={18} color={colors.error} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{favorites.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t("Favoritos")}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <Group header={t("Conta")}>
        <SettingsRow icon="person" tint="#8E8E93" title={t("Informações pessoais")} onPress={go("/perfil/personalinfo")} />
        <SettingsRow icon="notifications" tint="#FF3B30" title={t("Notificações")} onPress={go("/perfil/notifications")} />
        <SettingsRow icon="language" tint="#2E67B3" title={t("Idioma")} value={languageName} onPress={go("/perfil/language")} />
      </Group>

      <Group header={t("Aparência")} footer={t("Em Sistema, a app acompanha o modo claro ou escuro do telemóvel.")}>
        {THEME_OPTIONS.map((option) => (
          <SettingsRow
            key={option.value}
            icon={option.icon}
            tint={option.tint}
            title={t(option.label)}
            onPress={() => setThemePreference(option.value)}
            accessory={
              themePreference === option.value ? (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              ) : (
                <View />
              )
            }
          />
        ))}
      </Group>

      <Group
        header={t("Preferências")}
        footer={t("Os lembretes avisam na véspera e uma hora antes de cada marcação. A localização serve para mostrar os espaços mais perto de si.")}
      >
        <SettingsRow
          icon="notifications-circle"
          tint="#FF9500"
          title={t("Lembretes de marcações")}
          accessory={<Switch value={preferences.reminders} onValueChange={(value) => void setReminders(value)} />}
        />
        <SettingsRow
          icon="location"
          tint="#34C759"
          title={t("Localização")}
          value={preferences.location ? (currentPlace ?? (myPosition ? t("A obter o local…") : undefined)) : undefined}
          accessory={<Switch value={preferences.location} onValueChange={(value) => void setLocation(value)} />}
        />
      </Group>

      <Group header={t("Suporte")}>
        <SettingsRow icon="help-buoy" tint="#30B0C7" title={t("Central de ajuda")} onPress={go("/perfil/help")} />
        <SettingsRow icon="hand-left" tint="#5856D6" title={t("Privacidade")} onPress={go("/perfil/privacy")} />
        <SettingsRow icon="document-text" tint="#8E8E93" title={t("Termos de utilização")} onPress={go("/perfil/terms")} />
        <SettingsRow icon="settings" tint="#636366" title={t("Definições")} onPress={go("/perfil/settings")} />
      </Group>

      <View style={[styles.groupCard, styles.logoutCard, { backgroundColor: colors.card }]}>
        <Pressable onPress={confirmLogout} accessibilityRole="button">
          {({ pressed }) => (
            <View style={[styles.logoutRow, pressed && { backgroundColor: colors.backgroundSelected }]}>
              <Text style={[styles.logoutText, { color: colors.error }]}>{t("Terminar sessão")}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.brand}>
        <BrandIcon size={44} />
      </View>
      <Text style={[styles.version, { color: colors.textTertiary }]}>{t("Agenda+ · versão 1.0.0")}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 150,
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
  },
  largeTitle: {
    ...Typography.largeTitle,
    marginBottom: 16,
  },
  accountCard: {
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarBusy: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...Typography.title2,
    color: "#FFFFFF",
  },
  accountText: {
    flex: 1,
    gap: 1,
  },
  accountName: {
    ...Typography.title3,
  },
  accountEmail: {
    ...Typography.subheadline,
  },
  accountSince: {
    ...Typography.footnote,
    marginTop: 2,
  },
  stats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  statWrap: {
    flex: 1,
  },
  stat: {
    borderRadius: 12,
    borderCurve: "continuous",
    padding: 14,
    gap: 2,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    ...Typography.title1,
  },
  statLabel: {
    ...Typography.footnote,
  },
  group: {
    marginTop: 28,
  },
  groupHeader: {
    ...Typography.footnote,
    marginHorizontal: 16,
    marginBottom: 7,
    textTransform: "uppercase",
  },
  groupFooter: {
    ...Typography.footnote,
    marginHorizontal: 16,
    marginTop: 7,
  },
  groupCard: {
    borderRadius: 12,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  row: {
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 7,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    ...Typography.body,
    flex: 1,
  },
  rowValue: {
    ...Typography.body,
    maxWidth: 160,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
  logoutCard: {
    marginTop: 28,
  },
  logoutRow: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    ...Typography.body,
  },
  brand: {
    alignItems: "center",
    marginTop: 28,
  },
  version: {
    ...Typography.footnote,
    textAlign: "center",
    marginTop: 10,
  },
});
