import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BrandIcon } from "@/components/Brand";
import { useThemed, type ThemeRoles } from "@/theme/roles";
import { useT } from "@/i18n";

type IconName = keyof typeof Ionicons.glyphMap;

const COLORS = {
  background: "#F5F5F2",
  white: "#FFFFFF",
  black: "#000000",
  text: "#000000",
  secondary: "#636366",
  muted: "#AEAEB2",
  border: "#E5E5EA",

  blue: "#1451D6",
  blueSoft: "#E5ECFA",

  green: "#34C759",
  greenSoft: "#EAF9EE",

  orange: "#FF9500",
  orangeSoft: "#FFF4E5",

  red: "#FF3B30",
  redSoft: "#FFEBEA",
};

type HelpCategory = {
  id: string;
  icon: IconName;
  title: string;
  description: string;
};

type FAQItem = {
  id: string;
  question: string;
  answer: string;
};

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "bookings",
    icon: "calendar-outline",
    title: "Agendamentos",
    description: "Reservas, horários e cancelamentos.",
  },
  {
    id: "account",
    icon: "person-outline",
    title: "Conta e perfil",
    description: "Dados pessoais e configurações da conta.",
  },
  {
    id: "notifications",
    icon: "notifications-outline",
    title: "Notificações",
    description: "Alertas, lembretes e preferências.",
  },
  {
    id: "privacy",
    icon: "shield-checkmark-outline",
    title: "Privacidade e segurança",
    description: "Dados, permissões e segurança.",
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "faq-1",
    question: "Como faço um agendamento?",
    answer:
      "Abra a área Explorar, escolha o espaço ou serviço que pretende utilizar, selecione a data e o horário disponível e confirme a sua reserva.",
  },
  {
    id: "faq-2",
    question: "Posso cancelar um agendamento?",
    answer:
      "Sim. Abra os seus agendamentos, selecione a reserva e utilize a opção de cancelamento. As condições podem variar de acordo com o espaço.",
  },
  {
    id: "faq-3",
    question: "Como altero os meus dados pessoais?",
    answer: "Aceda ao seu Perfil, toque em Editar perfil e altere as informações que pretende atualizar.",
  },
  {
    id: "faq-4",
    question: "Como altero as notificações?",
    answer: "No Perfil, abra Notificações e escolha quais tipos de alertas deseja receber.",
  },
  {
    id: "faq-5",
    question: "Os meus dados estão protegidos?",
    answer:
      "O Agenda+ foi pensado para utilizar boas práticas de segurança e privacidade. As opções disponíveis podem ser consultadas na área Privacidade.",
  },
];

function CategoryRow({
  icon,
  title,
  description,
  onPress,
}: {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
}) {
  const { tc, styles } = useThemed(createStyles);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.categoryRow, pressed && styles.pressed]}>
      <View style={styles.categoryIcon}>
        <Ionicons name={icon} size={19} color={tc.fg(COLORS.text)} />
      </View>

      <View style={styles.categoryContent}>
        <Text style={styles.categoryTitle}>{title}</Text>

        <Text style={styles.categoryDescription}>{description}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={tc.fg(COLORS.muted)} />
    </Pressable>
  );
}

export default function HelpScreen() {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return FAQ_ITEMS;
    }

    return FAQ_ITEMS.filter((item) => {
      return (
        item.question.toLowerCase().includes(normalizedSearch) || item.answer.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [search]);

  /*
   * CATEGORIAS
   *
   * Cada categoria abre a página real correspondente.
   */
  const handleCategory = (category: HelpCategory) => {
    switch (category.id) {
      case "bookings":
        router.push("/appointments");
        break;

      case "account":
        router.push("/perfil/personalinfo");
        break;

      case "notifications":
        router.push("/perfil/notifications");
        break;

      case "privacy":
        router.push("/perfil/privacy");
        break;

      default:
        break;
    }
  };

  const handlePrivacy = () => {
    router.push("/perfil/privacy");
  };

  const handleTerms = () => {
    router.push("/perfil/terms");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={tc.dark ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={23} color={tc.fg(COLORS.black)} />
          </Pressable>

          <Text style={styles.headerTitle}>{t("Ajuda")}</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          {/* HERO */}

          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="help-circle-outline" size={27} color={tc.fg(COLORS.blue)} />
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{t("Como podemos ajudar?")}</Text>

              <Text style={styles.heroDescription}>
                {t("Encontre respostas rapidamente ou fale diretamente com a nossa equipa.")}
              </Text>
            </View>
          </View>

          {/* SEARCH */}

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={19} color={tc.fg(COLORS.muted)} />

            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("Pesquisar ajuda...")}
              placeholderTextColor={tc.fg(COLORS.muted)}
              style={styles.searchInput}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          {/* CATEGORIES */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Categorias")}</Text>

            <Text style={styles.sectionSubtitle}>{t("Encontre rapidamente o que procura.")}</Text>

            <View style={styles.card}>
              {HELP_CATEGORIES.map((category, index) => (
                <React.Fragment key={category.id}>
                  <CategoryRow
                    icon={category.icon}
                    title={t(category.title)}
                    description={t(category.description)}
                    onPress={() => handleCategory(category)}
                  />

                  {index < HELP_CATEGORIES.length - 1 ? <View style={styles.separator} /> : null}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* FAQ */}

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderContent}>
                <Text style={styles.sectionTitle}>{t("Perguntas frequentes")}</Text>

                <Text style={styles.sectionSubtitle}>{t("Respostas para as dúvidas mais comuns.")}</Text>
              </View>

              <View style={styles.faqBadge}>
                <Text style={styles.faqBadgeText}>{filteredFaqs.length}</Text>
              </View>
            </View>

            <View style={styles.faqCard}>
              {filteredFaqs.length === 0 ? (
                <View style={styles.emptyFaq}>
                  <View style={styles.emptyFaqIcon}>
                    <Ionicons name="search-outline" size={22} color={tc.fg(COLORS.muted)} />
                  </View>

                  <Text style={styles.emptyFaqTitle}>{t("Nenhum resultado")}</Text>

                  <Text style={styles.emptyFaqDescription}>{t("Não encontrámos uma resposta para a sua pesquisa.")}</Text>
                </View>
              ) : (
                filteredFaqs.map((item, index) => {
                  const isExpanded = expandedFaq === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      <Pressable
                        onPress={() => setExpandedFaq(isExpanded ? null : item.id)}
                        style={({ pressed }) => [styles.faqRow, pressed && styles.pressed]}
                      >
                        <View style={styles.faqQuestionIcon}>
                          <Ionicons name="help-outline" size={16} color={tc.fg(COLORS.blue)} />
                        </View>

                        <View style={styles.faqQuestionContent}>
                          <Text style={styles.faqQuestion}>{t(item.question)}</Text>

                          {isExpanded ? <Text style={styles.faqAnswer}>{t(item.answer)}</Text> : null}
                        </View>

                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={17}
                          color={tc.fg(COLORS.muted)}
                        />
                      </Pressable>

                      {index < filteredFaqs.length - 1 ? <View style={styles.separator} /> : null}
                    </React.Fragment>
                  );
                })
              )}
            </View>
          </View>

          {/* OTHER OPTIONS */}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("Mais opções")}</Text>

            <View style={styles.card}>
              <CategoryRow
                icon="shield-checkmark-outline"
                title={t("Privacidade")}
                description={t("Consulte e gerencie as suas preferências.")}
                onPress={handlePrivacy}
              />

              <View style={styles.separator} />

              <CategoryRow
                icon="document-text-outline"
                title={t("Termos e condições")}
                description={t("Consulte os termos de utilização do Agenda+.")}
                onPress={handleTerms}
              />
            </View>
          </View>

          {/* SECURITY */}

          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <Ionicons name="shield-checkmark-outline" size={21} color={tc.fg(COLORS.green)} />
            </View>

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>{t("A sua segurança importa")}</Text>

              <Text style={styles.securityDescription}>
                {t("Nunca partilhe a sua palavra-passe, códigos de verificação ou informações confidenciais.")}
              </Text>
            </View>
          </View>

          {/* FOOTER */}

          <View style={styles.footer}>
            <BrandIcon size={30} />

            <Text style={styles.footerBrand}>{t("Agenda+")}</Text>

            <Text style={styles.footerVersion}>{t("Centro de ajuda · v1.0.0")}</Text>
          </View>
        </ScrollView>

      </KeyboardAvoidingView>
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

    heroCard: {
      padding: 17,
      borderRadius: 23,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      flexDirection: "row",
      alignItems: "center",
    },

    heroIcon: {
      width: 50,
      height: 50,
      borderRadius: 17,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blueSoft),
      alignItems: "center",
      justifyContent: "center",
    },

    heroContent: {
      flex: 1,
      marginLeft: 13,
    },

    heroTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
      letterSpacing: -0.2,
    },

    heroDescription: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 16,
      color: tc.fg(COLORS.secondary),
    },

    searchContainer: {
      height: 51,
      marginTop: 14,
      paddingHorizontal: 15,
      borderRadius: 17,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      flexDirection: "row",
      alignItems: "center",
    },

    searchInput: {
      flex: 1,
      marginLeft: 10,
      paddingVertical: 0,
      fontSize: 12,
      color: tc.fg(COLORS.text),
    },

    section: {
      marginTop: 27,
    },

    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    sectionHeaderContent: {
      flex: 1,
    },

    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    sectionSubtitle: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 16,
      color: tc.fg(COLORS.secondary),
    },

    faqBadge: {
      minWidth: 27,
      height: 27,
      paddingHorizontal: 8,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blueSoft),
      alignItems: "center",
      justifyContent: "center",
    },

    faqBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.blue),
    },

    card: {
      marginTop: 13,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      overflow: "hidden",
    },

    categoryRow: {
      minHeight: 72,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
    },

    categoryIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
    },

    categoryContent: {
      flex: 1,
      marginHorizontal: 11,
    },

    categoryTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    categoryDescription: {
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

    faqCard: {
      marginTop: 13,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      overflow: "hidden",
    },

    faqRow: {
      paddingHorizontal: 14,
      paddingVertical: 15,
      flexDirection: "row",
      alignItems: "flex-start",
    },

    faqQuestionIcon: {
      width: 31,
      height: 31,
      borderRadius: 11,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blueSoft),
      alignItems: "center",
      justifyContent: "center",
    },

    faqQuestionContent: {
      flex: 1,
      marginHorizontal: 10,
    },

    faqQuestion: {
      fontSize: 11,
      lineHeight: 17,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    faqAnswer: {
      marginTop: 8,
      fontSize: 10,
      lineHeight: 16,
      color: tc.fg(COLORS.secondary),
    },

    emptyFaq: {
      paddingHorizontal: 25,
      paddingVertical: 30,
      alignItems: "center",
    },

    emptyFaqIcon: {
      width: 45,
      height: 45,
      borderRadius: 15,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
    },

    emptyFaqTitle: {
      marginTop: 10,
      fontSize: 12,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    emptyFaqDescription: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 15,
      textAlign: "center",
      color: tc.fg(COLORS.secondary),
    },

    securityCard: {
      marginTop: 27,
      padding: 15,
      borderRadius: 20,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.greenSoft),
      borderWidth: 1,
      borderColor: tc.border("#EAF9EE"),
      flexDirection: "row",
      alignItems: "center",
    },

    securityIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      alignItems: "center",
      justifyContent: "center",
    },

    securityContent: {
      flex: 1,
      marginLeft: 11,
    },

    securityTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    securityDescription: {
      marginTop: 3,
      fontSize: 9,
      lineHeight: 14,
      color: tc.fg(COLORS.secondary),
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

    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.98 }],
    },
  });
