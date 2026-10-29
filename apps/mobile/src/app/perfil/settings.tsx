import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Switch, Text, View } from "react-native";
import { BrandIcon } from "@/components/Brand";
import { useThemed, type ThemeRoles } from "@/theme/roles";
import { useAuth } from "@/contexts/AuthContext";
import { START_PAGES, usePreferences } from "@/contexts/PreferencesContext";
import { useThemePreference } from "@/contexts/ThemeContext";
import { useT, LANGUAGES, useLanguage } from "@/i18n";

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

type SwitchRowProps = {
  icon: IconName;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

function SwitchRow({ icon, title, description, value, onChange }: SwitchRowProps) {
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
        onValueChange={onChange}
        trackColor={{
          false: "#D1D1D6",
          true: "#E2EEFF",
        }}
        thumbColor={value ? COLORS.blue : COLORS.white}
      />
    </View>
  );
}

type NavigationRowProps = {
  icon: IconName;
  title: string;
  description?: string;
  value?: string;
  onPress: () => void;
  danger?: boolean;
};

function NavigationRow({ icon, title, description, value, onPress, danger = false }: NavigationRowProps) {
  const { tc, styles } = useThemed(createStyles);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.navigationRow, pressed && styles.pressed]}>
      <View style={[styles.navigationIcon, danger && styles.dangerNavigationIcon]}>
        <Ionicons name={icon} size={19} color={tc.fg(danger ? COLORS.red : COLORS.text)} />
      </View>

      <View style={styles.navigationContent}>
        <Text style={[styles.navigationTitle, danger && styles.dangerNavigationTitle]}>{title}</Text>

        {description ? <Text style={styles.navigationDescription}>{description}</Text> : null}
      </View>

      {value ? (
        <Text style={styles.navigationValue}>{value}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={tc.fg(danger ? COLORS.red : COLORS.muted)} />
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const router = useRouter();

  // O interruptor de modo escuro é a mesma escolha de tema do Perfil (Claro / Escuro / Sistema).
  const { scheme, setPreference: setThemePreference } = useThemePreference();
  const darkMode = scheme === "dark";

  const { preferences, setPreference, reset } = usePreferences();
  const { logout } = useAuth();
  const startPageLabel = START_PAGES.find((page) => page.value === preferences.startPage)?.label ?? "Início";
  const startPage = t(startPageLabel);
  const language = useLanguage();
  const languageName = LANGUAGES.find((item) => item.id === language)?.name;

  const handleDarkMode = (value: boolean) => {
    setThemePreference(value ? "dark" : "light");
  };

  const handleStartPage = () => {
    Alert.alert(t("Página inicial"), t("Escolha onde o Agenda+ abre."), [
      ...START_PAGES.map((page) => ({ text: t(page.label), onPress: () => setPreference("startPage", page.value) })),
      { text: t("Cancelar"), style: "cancel" as const },
    ]);
  };

  const handleClearCache = () => {
    Alert.alert(t("Limpar dados temporários"), t("Apaga as imagens guardadas no telemóvel. Voltam a ser descarregadas quando forem precisas."), [
      { text: t("Cancelar"), style: "cancel" },
      {
        text: t("Limpar"),
        onPress: async () => {
          try {
            await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]);
            Alert.alert(t("Concluído"), t("Os dados temporários foram limpos."));
          } catch {
            Alert.alert(t("Não foi possível limpar"), t("Tente novamente dentro de momentos."));
          }
        },
      },
    ]);
  };

  const handleResetSettings = () => {
    Alert.alert(t("Restaurar definições"), t("As preferências da aplicação voltam aos valores iniciais."), [
      { text: t("Cancelar"), style: "cancel" },
      {
        text: t("Restaurar"),
        style: "destructive",
        onPress: () => {
          reset();
          setThemePreference("system");
          Alert.alert(t("Definições restauradas"), t("As preferências voltaram aos valores iniciais."));
        },
      },
    ]);
  };

  const handleLogout = () => {
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

  const handleAbout = () => {
    Alert.alert(t("Agenda+"), t("Marque os seus serviços de beleza em segundos.\n\nVersão {0}", [Constants.expoConfig?.version ?? "1.0.0"]));
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

          <Text style={styles.headerTitle}>{t("Definições")}</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* EXPERIÊNCIA */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Experiência")}</Text>

            <Text style={styles.sectionSubtitle}>{t("Personalize a forma como o Agenda+ funciona para si.")}</Text>

            <View style={styles.settingsCard}>
              <SwitchRow
                icon="moon-outline"
                title={t("Modo escuro")}
                description={t("Usar uma aparência escura na aplicação.")}
                value={darkMode}
                onChange={handleDarkMode}
              />

              <View style={styles.separator} />

              <SwitchRow
                icon="phone-portrait-outline"
                title={t("Feedback háptico")}
                description={t("Pequenas vibrações ao interagir com elementos.")}
                value={preferences.haptics}
                onChange={(value) => setPreference("haptics", value)}
              />

            </View>
          </View>

          {/* AGENDAMENTOS */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Agendamentos")}</Text>

            <Text style={styles.sectionSubtitle}>{t("Defina como deseja gerir os seus agendamentos.")}</Text>

            <View style={styles.settingsCard}>
              <SwitchRow
                icon="pricetag-outline"
                title={t("Mostrar preços")}
                description={t("Mostrar os preços dos serviços antes da reserva.")}
                value={preferences.showPrices}
                onChange={(value) => setPreference("showPrices", value)}
              />

              <View style={styles.separator} />

              <NavigationRow
                icon="home-outline"
                title={t("Página inicial")}
                description={t("Escolha a tela que aparece ao abrir a aplicação.")}
                value={startPage}
                onPress={handleStartPage}
              />
            </View>
          </View>

          {/* REGIÃO */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Região")}</Text>

            <Text style={styles.sectionSubtitle}>{t("Escolha o idioma da aplicação.")}</Text>

            <View style={styles.navigationCard}>
              {/* IDIOMA */}

              <NavigationRow
                icon="language-outline"
                title={t("Idioma")}
                description={t("Idioma utilizado na aplicação.")}
                value={languageName}
                onPress={() => router.push("/perfil/language")}
              />

            </View>
          </View>

          {/* CONTA */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Conta")}</Text>

            <Text style={styles.sectionSubtitle}>{t("Gerencie informações e acessos da sua conta.")}</Text>

            <View style={styles.navigationCard}>
              <NavigationRow
                icon="person-outline"
                title={t("Dados pessoais")}
                description={t("Nome, telefone, localização e foto.")}
                onPress={() => router.push("/perfil/personalinfo")}
              />

              <View style={styles.separator} />

              <NavigationRow
                icon="lock-closed-outline"
                title={t("Privacidade")}
                description={t("Controle os seus dados e permissões.")}
                onPress={() => router.push("/perfil/privacy")}
              />

              <View style={styles.separator} />

              <NavigationRow
                icon="notifications-outline"
                title={t("Notificações")}
                description={t("Gerencie as suas notificações.")}
                onPress={() => router.push("/perfil/notifications")}
              />
            </View>
          </View>

          {/* APLICAÇÃO */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Aplicação")}</Text>

            <Text style={styles.sectionSubtitle}>{t("Informações e manutenção da aplicação.")}</Text>

            <View style={styles.navigationCard}>
              <NavigationRow
                icon="trash-outline"
                title={t("Limpar dados temporários")}
                description={t("Remover informações temporárias armazenadas localmente.")}
                onPress={handleClearCache}
              />

              <View style={styles.separator} />

              <NavigationRow
                icon="refresh-outline"
                title={t("Restaurar definições")}
                description={t("Voltar às configurações padrão.")}
                onPress={handleResetSettings}
              />

              <View style={styles.separator} />

              <NavigationRow
                icon="information-circle-outline"
                title={t("Sobre o Agenda+")}
                description={t("Informações sobre a aplicação.")}
                onPress={handleAbout}
              />
            </View>
          </View>

          {/* ZONA DE RISCO */}

          <View style={styles.section}>
            <Text style={styles.dangerSectionTitle}>{t("Zona de risco")}</Text>

            <View style={styles.dangerCard}>
              <View style={styles.dangerIcon}>
                <Ionicons name="log-out-outline" size={21} color={tc.fg(COLORS.red)} />
              </View>

              <View style={styles.dangerContent}>
                <Text style={styles.dangerTitle}>{t("Terminar sessão")}</Text>

                <Text style={styles.dangerDescription}>{t("Sair da sua conta neste dispositivo.")}</Text>
              </View>

              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [styles.logoutButton, pressed && styles.pressed]}
              >
                <Text style={styles.logoutButtonText}>{t("Sair")}</Text>
              </Pressable>
            </View>
          </View>

          {/* FOOTER */}

          <View style={styles.footer}>
            <BrandIcon size={30} />

            <Text style={styles.footerBrand}>{t("Agenda+")}</Text>

            <Text style={styles.footerVersion}>v1.0.0</Text>
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

    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 45,
    },

    section: {
      marginTop: 25,
    },

    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    sectionSubtitle: {
      marginTop: 4,
      fontSize: 11,
      lineHeight: 17,
      color: tc.fg(COLORS.secondary),
    },

    dangerSectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg(COLORS.red),
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

    navigationCard: {
      marginTop: 13,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      overflow: "hidden",
    },

    navigationRow: {
      minHeight: 72,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
    },

    navigationIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
    },

    navigationContent: {
      flex: 1,
      marginHorizontal: 11,
    },

    navigationTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    navigationDescription: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 15,
      color: tc.fg(COLORS.secondary),
    },

    navigationValue: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.secondary),
      marginRight: 3,
    },

    dangerCard: {
      marginTop: 13,
      padding: 14,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border("#FFEBEA"),
      flexDirection: "row",
      alignItems: "center",
    },

    dangerIcon: {
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
      marginHorizontal: 10,
    },

    dangerTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: tc.fg(COLORS.red),
    },

    dangerDescription: {
      marginTop: 3,
      fontSize: 10,
      lineHeight: 15,
      color: tc.fg(COLORS.secondary),
    },

    logoutButton: {
      height: 36,
      paddingHorizontal: 13,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.redSoft),
      alignItems: "center",
      justifyContent: "center",
    },

    logoutButtonText: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.red),
    },

    dangerNavigationIcon: {
      backgroundColor: tc.bg(COLORS.redSoft),
    },

    dangerNavigationTitle: {
      color: tc.fg(COLORS.red),
    },

    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.98 }],
    },

    footer: {
      marginTop: 35,
      alignItems: "center",
      justifyContent: "center",
    },


    footerBrand: {
      marginTop: 7,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: tc.fg(COLORS.black),
    },

    footerVersion: {
      marginTop: 3,
      fontSize: 9,
      color: tc.fg(COLORS.muted),
    },
  });
