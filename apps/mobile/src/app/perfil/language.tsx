import React from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useThemed, type ThemeRoles } from "@/theme/roles";
import { LANGUAGES, setLanguage, useLanguage, useT } from "@/i18n";

const COLORS = {
  background: "#F5F5F2",
  white: "#FFFFFF",
  black: "#000000",
  text: "#000000",
  secondary: "#636366",
  muted: "#AEAEB2",
  border: "#E5E5EA",
  blue: "#007AFF",
  blueSoft: "#E5F1FF",
  green: "#34C759",
};

export default function LanguageScreen() {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const router = useRouter();

  // O idioma escolhido aplica-se logo a toda a app e fica guardado no telemóvel.
  const selectedLanguage = useLanguage();
  const setSelectedLanguage = setLanguage;

  const currentLanguage = LANGUAGES.find((language) => language.id === selectedLanguage);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={tc.dark ? "light-content" : "dark-content"} backgroundColor={tc.bg(COLORS.background)} />

      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={tc.fg(COLORS.text)} />
          </Pressable>

          <Text style={styles.headerTitle}>{t("Idioma")}</Text>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* HERO */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="globe-outline" size={28} color={tc.fg(COLORS.blue)} />
            </View>

            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>{t("Escolha o seu idioma")}</Text>

              <Text style={styles.heroDescription}>{t("Selecione o idioma que pretende utilizar no Agenda+.")}</Text>
            </View>
          </View>

          {/* CURRENT LANGUAGE */}
          <View style={styles.currentCard}>
            <View style={styles.currentLeft}>
              <View style={styles.currentIcon}>
                <Ionicons name="checkmark-circle" size={21} color={tc.fg(COLORS.blue)} />
              </View>

              <View>
                <Text style={styles.currentLabel}>{t("IDIOMA ATUAL")}</Text>

                <Text style={styles.currentLanguage}>{currentLanguage?.name || t("Português")}</Text>
              </View>
            </View>

            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />

              <Text style={styles.activeText}>{t("Ativo")}</Text>
            </View>
          </View>

          {/* SECTION HEADER */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("IDIOMAS DISPONÍVEIS")}</Text>

            <Text style={styles.sectionCount}>{LANGUAGES.length}</Text>
          </View>

          {/* LANGUAGES */}
          <View style={styles.languageCard}>
            {LANGUAGES.map((language, index) => {
              const selected = selectedLanguage === language.id;

              return (
                <React.Fragment key={language.id}>
                  <Pressable
                    onPress={() => setSelectedLanguage(language.id)}
                    style={({ pressed }) => [styles.languageRow, pressed && styles.languagePressed]}
                  >
                    <View style={styles.languageLeft}>
                      <View style={[styles.flagContainer, selected && styles.flagContainerSelected]}>
                        <Text style={styles.flag}>{language.flag}</Text>
                      </View>

                      <View style={styles.languageInfo}>
                        <Text style={[styles.languageName, selected && styles.languageNameSelected]}>
                          {language.name}
                        </Text>

                        <Text style={styles.nativeName}>{language.name}</Text>
                      </View>
                    </View>

                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                  </Pressable>

                  {index < LANGUAGES.length - 1 && <View style={styles.separator} />}
                </React.Fragment>
              );
            })}
          </View>

          {/* INFORMATION */}
          <View style={styles.infoCard}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={tc.fg(COLORS.secondary)}
              style={styles.infoIcon}
            />

            <Text style={styles.infoText}>
              {t("O idioma escolhido será utilizado na interface do Agenda+. Algumas informações poderão continuar no idioma original enquanto a tradução estiver indisponível.")}
            </Text>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
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
      height: 64,
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
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
    },

    pressed: {
      opacity: 0.65,
      transform: [{ scale: 0.96 }],
    },

    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
      letterSpacing: -0.3,
    },

    headerPlaceholder: {
      width: 42,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 40,
    },

    hero: {
      backgroundColor: tc.bg(COLORS.black),
      borderRadius: 24,
      borderCurve: "continuous",
      padding: 22,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },

    heroIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: tc.bg(COLORS.blueSoft),
      marginRight: 16,
    },

    heroTextContainer: {
      flex: 1,
    },

    heroTitle: {
      color: tc.fg(COLORS.white),
      fontSize: 20,
      fontWeight: "700",
      letterSpacing: -0.5,
      marginBottom: 5,
    },

    heroDescription: {
      color: tc.fg("#C7C7CC"),
      fontSize: 13,
      lineHeight: 19,
    },

    currentCard: {
      minHeight: 78,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 26,
    },

    currentLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    currentIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blueSoft),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    currentLabel: {
      color: tc.fg(COLORS.muted),
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.3,
      marginBottom: 4,
    },

    currentLanguage: {
      color: tc.fg(COLORS.text),
      fontSize: 15,
      fontWeight: "700",
    },

    activeBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: tc.bg("#F2F2F7"),
      borderRadius: 999,
      borderCurve: "continuous",
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.green),
      marginRight: 6,
    },

    activeText: {
      color: tc.fg(COLORS.secondary),
      fontSize: 11,
      fontWeight: "600",
    },

    sectionHeader: {
      paddingHorizontal: 4,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    sectionTitle: {
      color: tc.fg(COLORS.muted),
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.3,
    },

    sectionCount: {
      color: tc.fg(COLORS.muted),
      fontSize: 11,
      fontWeight: "600",
    },

    languageCard: {
      backgroundColor: tc.bg(COLORS.white),
      borderRadius: 22,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      overflow: "hidden",
    },

    languageRow: {
      minHeight: 82,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    languagePressed: {
      opacity: 0.7,
    },

    languageLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },

    flagContainer: {
      width: 48,
      height: 48,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 13,
    },

    flagContainerSelected: {
      backgroundColor: tc.bg(COLORS.blueSoft),
    },

    flag: {
      fontSize: 25,
    },

    languageInfo: {
      flex: 1,
    },

    languageName: {
      color: tc.fg(COLORS.text),
      fontSize: 15,
      fontWeight: "700",
      marginBottom: 4,
    },

    languageNameSelected: {
      color: tc.fg(COLORS.blue),
    },

    nativeName: {
      color: tc.fg(COLORS.secondary),
      fontSize: 12,
      fontWeight: "400",
    },

    radio: {
      width: 23,
      height: 23,
      borderRadius: 12,
      borderCurve: "continuous",
      borderWidth: 1.5,
      borderColor: tc.border("#C7C7CC"),
      alignItems: "center",
      justifyContent: "center",
    },

    radioSelected: {
      borderColor: tc.border(COLORS.blue),
    },

    radioInner: {
      width: 11,
      height: 11,
      borderRadius: 6,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blue),
    },

    separator: {
      height: 1,
      backgroundColor: tc.bg(COLORS.border),
      marginLeft: 77,
    },

    infoCard: {
      marginTop: 16,
      padding: 16,
      borderRadius: 19,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      flexDirection: "row",
      alignItems: "flex-start",
    },

    infoIcon: {
      marginRight: 10,
      marginTop: 1,
    },

    infoText: {
      flex: 1,
      color: tc.fg(COLORS.secondary),
      fontSize: 12,
      lineHeight: 18,
    },

    footer: {
      alignItems: "center",
      marginTop: 34,
    },

    footerBrand: {
      color: tc.fg(COLORS.text),
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.3,
    },

    footerVersion: {
      color: tc.fg(COLORS.muted),
      fontSize: 10,
      marginTop: 5,
    },
  });
