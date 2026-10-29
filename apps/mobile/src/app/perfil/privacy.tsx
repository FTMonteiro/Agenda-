import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, Share, StatusBar, StyleSheet, Switch, Text, View } from "react-native";
import { useThemed, type ThemeRoles } from "@/theme/roles";
import { useT } from "@/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { usePreferenceToggles } from "@/hooks/use-preference-toggles";
import { listMyAppointments } from "@/services/appointments";
import { listFavorites } from "@/services/favorites";
import { deleteMyAccount, getMe, logoutEverywhere } from "@/services/users";

type IconName = keyof typeof Ionicons.glyphMap;

const COLORS = {
  background: "#F5F5F2",
  white: "#FFFFFF",
  black: "#000000",
  text: "#000000",
  secondary: "#636366",
  muted: "#AEAEB2",
  border: "#E5E5EA",

  blue: "#2E67B3",
  blueSoft: "#E2EEFF",

  green: "#34C759",
  greenSoft: "#EAF9EE",

  orange: "#FF9500",
  orangeSoft: "#FFF4E5",

  red: "#FF3B30",
  redSoft: "#FFEBEA",
};

// O estado de cada marcação, como aparece na cópia dos dados.
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Concluída",
  CANCELLED: "Cancelada",
  NO_SHOW: "Faltou",
};

type SettingRowProps = {
  icon: IconName;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function SettingRow({ icon, title, description, value, onValueChange }: SettingRowProps) {
  const { tc, styles } = useThemed(createStyles);
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={19} color={tc.fg(COLORS.text)} />
      </View>

      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>

        <Text style={styles.settingDescription}>{description}</Text>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: "#D1D1D6",
          true: "#E2EEFF",
        }}
        thumbColor={value ? COLORS.blue : COLORS.white}
      />
    </View>
  );
}

type LinkRowProps = {
  icon: IconName;
  title: string;
  description?: string;
  danger?: boolean;
  onPress: () => void;
};

function LinkRow({ icon, title, description, danger = false, onPress }: LinkRowProps) {
  const { tc, styles } = useThemed(createStyles);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
      <View style={[styles.linkIcon, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={19} color={tc.fg(danger ? COLORS.red : COLORS.text)} />
      </View>

      <View style={styles.linkContent}>
        <Text style={[styles.linkTitle, danger && styles.dangerTitle]}>{title}</Text>

        {description ? <Text style={styles.linkDescription}>{description}</Text> : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={tc.fg(danger ? COLORS.red : COLORS.muted)} />
    </Pressable>
  );
}

export default function PrivacyScreen() {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const router = useRouter();
  const { user, logout } = useAuth();

  // A localização e os lembretes são as mesmas opções do Perfil: ligar pede a autorização
  // ao telemóvel, e a escolha fica guardada.
  const { preferences, setLocation, setReminders } = usePreferenceToggles();
  // Qual das ações com o servidor está a decorrer (os botões ficam à espera dela).
  const [busy, setBusy] = useState<"export" | "sessions" | "delete" | null>(null);

  // Uma cópia, em texto, do que a conta guarda: os dados pessoais, as marcações e os
  // favoritos. Sai pela folha de partilha do telemóvel, para guardar ou enviar.
  const handleDownloadData = async () => {
    if (busy) return;
    setBusy("export");
    try {
      const [me, appointments, favorites] = await Promise.all([getMe(), listMyAppointments(), listFavorites()]);
      const day = (value: string) => new Date(value).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });

      const message = [
        t("Os meus dados no Agenda+"),
        "",
        `${t("Nome")}: ${me.name}`,
        `${t("E-mail")}: ${me.email}`,
        `${t("Telefone")}: ${me.phone ?? "—"}`,
        `${t("Conta criada em")}: ${day(me.createdAt)}`,
        `${t("Última localização guardada")}: ${me.latitude !== null && me.longitude !== null ? `${me.latitude}, ${me.longitude}` : "—"}`,
        "",
        `${t("Marcações")} (${appointments.length})`,
        ...appointments.map((item) => `• ${day(item.scheduledAt)} · ${t(STATUS_LABELS[item.status] ?? item.status)} · ${item.price} Kz`),
        "",
        `${t("Favoritos")} (${favorites.length})`,
        ...favorites.map((item) => `• ${item.business.name}`),
      ].join("\n");

      await Share.share({ title: t("Os meus dados no Agenda+"), message });
    } catch {
      Alert.alert(t("Não foi possível obter os dados"), t("Verifique a ligação e tente novamente."));
    } finally {
      setBusy(null);
    }
  };

  const leave = async () => {
    await logout();
    router.replace("/login");
  };

  const handleSessions = () => {
    Alert.alert(
      t("Terminar todas as sessões?"),
      t("A sua conta sai de todos os dispositivos, incluindo este. Terá de voltar a entrar."),
      [
        { text: t("Cancelar"), style: "cancel" },
        {
          text: t("Terminar sessões"),
          style: "destructive",
          onPress: async () => {
            setBusy("sessions");
            try {
              await logoutEverywhere();
              await leave();
            } catch {
              setBusy(null);
              Alert.alert(t("Não foi possível terminar as sessões"), t("Verifique a ligação e tente novamente."));
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t("Apagar conta"),
      t("Esta ação é permanente: deixa de poder entrar com {0} e as suas marcações futuras deixam de estar acessíveis.", [user?.email ?? t("esta conta")]),
      [
        { text: t("Cancelar"), style: "cancel" },
        {
          text: t("Apagar conta"),
          style: "destructive",
          onPress: async () => {
            setBusy("delete");
            try {
              await deleteMyAccount();
              await leave();
            } catch {
              setBusy(null);
              Alert.alert(t("Não foi possível apagar a conta"), t("Verifique a ligação e tente novamente."));
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={tc.dark ? "light-content" : "dark-content"} />

      <View style={styles.container}>
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={23} color={tc.fg(COLORS.black)} />
          </Pressable>

          <Text style={styles.headerTitle}>{t("Privacidade")}</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* PERMISSIONS */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Permissões")}</Text>

            <Text style={styles.sectionSubtitle}>{t("O que o Agenda+ pode usar no seu telemóvel.")}</Text>

            <View style={styles.settingsCard}>
              <SettingRow
                icon="location-outline"
                title={t("Localização")}
                description={t("Usar a localização para mostrar espaços próximos.")}
                value={preferences.location}
                onValueChange={(value) => void setLocation(value)}
              />

              <View style={styles.separator} />

              <SettingRow
                icon="notifications-outline"
                title={t("Lembretes de marcações")}
                description={t("Receber um aviso na véspera e uma hora antes de cada marcação.")}
                value={preferences.reminders}
                onValueChange={(value) => void setReminders(value)}
              />
            </View>
          </View>

          {/* DATA */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Os seus dados")}</Text>

            <Text style={styles.sectionSubtitle}>{t("Consulte e controle os dados associados à sua conta.")}</Text>

            <View style={styles.linksCard}>
              <LinkRow
                icon="download-outline"
                title={busy === "export" ? t("A preparar os dados...") : t("Obter os meus dados")}
                description={t("Uma cópia dos seus dados, marcações e favoritos.")}
                onPress={() => void handleDownloadData()}
              />

              <View style={styles.separator} />

              <LinkRow
                icon="person-outline"
                title={t("Dados pessoais")}
                description={t("Ver e corrigir o nome, o telefone e a foto.")}
                onPress={() => router.push("/perfil/personalinfo")}
              />

              <View style={styles.separator} />

              <LinkRow
                icon="document-text-outline"
                title={t("Termos e privacidade")}
                description={t("Saiba como os seus dados são tratados.")}
                onPress={() => router.push("/perfil/terms")}
              />
            </View>
          </View>

          {/* SECURITY */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Segurança")}</Text>

            <Text style={styles.sectionSubtitle}>{t("Mantenha a sua conta protegida.")}</Text>

            <View style={styles.linksCard}>
              <LinkRow
                icon="phone-portrait-outline"
                title={busy === "sessions" ? t("A terminar as sessões...") : t("Terminar todas as sessões")}
                description={t("Sair da conta em todos os dispositivos.")}
                onPress={handleSessions}
              />
            </View>
          </View>

          {/* DANGER ZONE */}

          <View style={styles.section}>
            <Text style={styles.dangerSectionTitle}>{t("Zona de risco")}</Text>

            <Text style={styles.sectionSubtitle}>{t("Ações que podem afetar permanentemente a sua conta.")}</Text>

            <View style={styles.dangerCard}>
              <View style={styles.dangerTop}>
                <View style={styles.dangerMainIcon}>
                  <Ionicons name="trash-outline" size={21} color={tc.fg(COLORS.red)} />
                </View>

                <View style={styles.dangerContent}>
                  <Text style={styles.dangerTitle}>{t("Apagar conta")}</Text>

                  <Text style={styles.dangerDescription}>{t("Esta ação é permanente e não poderá ser desfeita.")}</Text>
                </View>
              </View>

              <Pressable
                onPress={handleDeleteAccount}
                disabled={busy !== null}
                style={({ pressed }) => [styles.deleteButton, (pressed || busy === "delete") && styles.pressed]}
              >
                <Text style={styles.deleteButtonText}>{busy === "delete" ? t("A apagar...") : t("Apagar minha conta")}</Text>
              </Pressable>
            </View>
          </View>

          {/* FOOTER */}

          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={15} color={tc.fg(COLORS.muted)} />

            <Text style={styles.footerText}>{t("A sua privacidade e segurança são prioridades do Agenda+.")}</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (tc: ThemeRoles) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: tc.bg(COLORS.background),
    },

    container: {
      flex: 1,
      backgroundColor: tc.bg(COLORS.background),
    },

    header: {
      height: 68,
      paddingHorizontal: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
    },

    headerTitle: {
      fontSize: 19,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
      letterSpacing: -0.3,
    },

    headerSpacer: {
      width: 42,
    },

    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.98 }],
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 45,
    },

    section: {
      marginTop: 27,
    },

    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    dangerSectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg(COLORS.red),
    },

    sectionSubtitle: {
      marginTop: 4,
      fontSize: 11,
      lineHeight: 17,
      color: tc.fg(COLORS.secondary),
    },

    settingsCard: {
      marginTop: 13,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      overflow: "hidden",
    },

    settingRow: {
      minHeight: 76,
      paddingHorizontal: 14,
      paddingVertical: 11,
      flexDirection: "row",
      alignItems: "center",
    },

    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
    },

    settingContent: {
      flex: 1,
      marginHorizontal: 11,
    },

    settingTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    settingDescription: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 15,
      color: tc.fg(COLORS.secondary),
    },

    separator: {
      height: 1,
      backgroundColor: tc.bg(COLORS.border),
      marginLeft: 65,
    },

    linksCard: {
      marginTop: 13,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      overflow: "hidden",
    },

    linkRow: {
      minHeight: 72,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
    },

    linkIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
    },

    linkContent: {
      flex: 1,
      marginHorizontal: 11,
    },

    linkTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    linkDescription: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 15,
      color: tc.fg(COLORS.secondary),
    },

    dangerIcon: {
      backgroundColor: tc.bg(COLORS.redSoft),
    },

    dangerTitle: {
      color: tc.fg(COLORS.red),
    },

    dangerCard: {
      marginTop: 13,
      padding: 15,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border("#FFEBEA"),
    },

    dangerTop: {
      flexDirection: "row",
      alignItems: "flex-start",
    },

    dangerMainIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.redSoft),
      alignItems: "center",
      justifyContent: "center",
    },

    dangerContent: {
      flex: 1,
      marginLeft: 11,
    },

    dangerDescription: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
      color: tc.fg(COLORS.secondary),
    },

    deleteButton: {
      height: 45,
      marginTop: 15,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.redSoft),
      borderWidth: 1,
      borderColor: tc.border("#FFEBEA"),
      alignItems: "center",
      justifyContent: "center",
    },

    deleteButtonText: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.red),
    },

    footer: {
      marginTop: 30,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
    },

    footerText: {
      maxWidth: 280,
      fontSize: 9,
      lineHeight: 14,
      color: tc.fg(COLORS.muted),
      textAlign: "center",
    },
  });
