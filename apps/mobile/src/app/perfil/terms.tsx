import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
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

  blue: "#007AFF",
  blueSoft: "#E5F1FF",

  green: "#34C759",
  greenSoft: "#EAF9EE",

  orange: "#FF9500",
  orangeSoft: "#FFF4E5",

  red: "#FF3B30",
  redSoft: "#FFEBEA",
};

type SectionProps = {
  icon: IconName;
  number: string;
  title: string;
  children: React.ReactNode;
};

function TermsSection({ icon, number, title, children }: SectionProps) {
  const { tc, styles } = useThemed(createStyles);
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color={tc.fg(COLORS.text)} />
        </View>

        <View style={styles.sectionHeaderContent}>
          <Text style={styles.sectionNumber}>{number}</Text>

          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      </View>

      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  const { tc, styles } = useThemed(createStyles);
  return <Text style={styles.paragraph}>{children}</Text>;
}

function Bullet({ children }: { children: React.ReactNode }) {
  const { tc, styles } = useThemed(createStyles);
  return (
    <View style={styles.bulletRow}>
      <View style={styles.bullet} />

      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function TermsScreen() {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const router = useRouter();

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
            <Ionicons name="chevron-back" size={23} color={tc.fg(COLORS.black)} />
          </Pressable>

          <Text style={styles.headerTitle}>{t("Termos e condições")}</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* HERO */}

          <View style={styles.heroCard}>
            <View style={styles.heroTop}>
              <View style={styles.heroIcon}>
                <Ionicons name="document-text-outline" size={25} color={tc.fg(COLORS.blue)} />
              </View>

              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />

                <Text style={styles.statusText}>{t("Em vigor")}</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{t("Termos e condições do Agenda+")}</Text>

            <Text style={styles.heroDescription}>
              {t("Estes termos estabelecem as regras para a utilização da plataforma Agenda+ e dos seus serviços.")}
            </Text>

            <View style={styles.updatedRow}>
              <Ionicons name="time-outline" size={14} color={tc.fg(COLORS.muted)} />

              <Text style={styles.updatedText}>{t("Última atualização: 7 de setembro de 2026")}</Text>
            </View>
          </View>

          {/* INTRODUCTION */}

          <View style={styles.introductionCard}>
            <View style={styles.introductionIcon}>
              <Ionicons name="information-circle-outline" size={21} color={tc.fg(COLORS.blue)} />
            </View>

            <Text style={styles.introductionText}>
              {t("Ao utilizar o Agenda+, você declara que leu, compreendeu e concorda com estes termos e condições. Caso não concorde com alguma parte, recomendamos que não utilize os serviços da plataforma.")}
            </Text>
          </View>

          {/* 1 */}

          <TermsSection number="01" icon="checkmark-circle-outline" title={t("Aceitação dos termos")}>
            <Paragraph>
              {t("O acesso e utilização do Agenda+ estão sujeitos aos presentes Termos e Condições. Ao criar uma conta ou utilizar qualquer funcionalidade da plataforma, o utilizador aceita estes termos.")}
            </Paragraph>

            <Paragraph>
              {t("Estes termos podem ser atualizados ao longo do tempo para acompanhar alterações no serviço, requisitos legais ou melhorias na plataforma.")}
            </Paragraph>
          </TermsSection>

          {/* 2 */}

          <TermsSection number="02" icon="apps-outline" title={t("Utilização do serviço")}>
            <Paragraph>
              {t("O Agenda+ é uma plataforma destinada a facilitar a descoberta, organização e gestão de agendamentos entre utilizadores e espaços disponíveis na plataforma.")}
            </Paragraph>

            <Text style={styles.subheading}>{t("O utilizador compromete-se a:")}</Text>

            <Bullet>{t("Fornecer informações verdadeiras e atualizadas.")}</Bullet>

            <Bullet>{t("Utilizar a plataforma de forma legal e responsável.")}</Bullet>

            <Bullet>{t("Não utilizar o serviço para atividades fraudulentas ou abusivas.")}</Bullet>

            <Bullet>{t("Manter os dados de acesso à conta protegidos.")}</Bullet>
          </TermsSection>

          {/* 3 */}

          <TermsSection number="03" icon="person-outline" title={t("Conta do utilizador")}>
            <Paragraph>
              {t("Algumas funcionalidades do Agenda+ podem exigir a criação de uma conta. O utilizador é responsável pelas informações fornecidas e pela atividade realizada através da sua conta.")}
            </Paragraph>

            <Paragraph>
              {t("Caso suspeite que outra pessoa obteve acesso à sua conta, deverá tomar as medidas necessárias para proteger o acesso e contactar o suporte do Agenda+.")}
            </Paragraph>
          </TermsSection>

          {/* 4 */}

          <TermsSection number="04" icon="calendar-outline" title={t("Agendamentos")}>
            <Paragraph>
              {t("O Agenda+ pode permitir que o utilizador consulte disponibilidade e realize agendamentos junto dos espaços apresentados na plataforma.")}
            </Paragraph>

            <Paragraph>
              {t("A confirmação, alteração ou cancelamento de um agendamento pode estar sujeito às regras específicas do respetivo espaço.")}
            </Paragraph>

            <View style={styles.infoBox}>
              <Ionicons name="alert-circle-outline" size={18} color={tc.fg(COLORS.orange)} />

              <Text style={styles.infoBoxText}>
                {t("Verifique sempre os detalhes da reserva antes de confirmar o agendamento.")}
              </Text>
            </View>
          </TermsSection>

          {/* 5 */}

          <TermsSection number="05" icon="business-outline" title={t("Espaços e prestadores")}>
            <Paragraph>
              {t("Os espaços e prestadores apresentados no Agenda+ são responsáveis pelas informações relativas aos seus serviços, horários, disponibilidade, preços e políticas próprias.")}
            </Paragraph>

            <Paragraph>
              {t("O Agenda+ poderá disponibilizar ferramentas para facilitar a interação, mas determinadas condições da prestação do serviço são definidas diretamente pelo espaço.")}
            </Paragraph>
          </TermsSection>

          {/* 6 */}

          <TermsSection number="06" icon="shield-checkmark-outline" title={t("Privacidade e segurança")}>
            <Paragraph>
              {t("A proteção dos dados dos utilizadores é uma prioridade. As informações pessoais são tratadas de acordo com as políticas de privacidade aplicáveis ao serviço.")}
            </Paragraph>

            <Pressable
              onPress={() => router.push("/perfil/privacy")}
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
            >
              <Ionicons name="shield-checkmark-outline" size={17} color={tc.fg(COLORS.blue)} />

              <Text style={styles.linkButtonText}>{t("Ver definições de privacidade")}</Text>

              <Ionicons name="chevron-forward" size={17} color={tc.fg(COLORS.blue)} />
            </Pressable>
          </TermsSection>

          {/* 7 */}

          <TermsSection number="07" icon="warning-outline" title={t("Utilização proibida")}>
            <Paragraph>
              {t("Não é permitido utilizar o Agenda+ de forma que possa prejudicar outros utilizadores, espaços ou o funcionamento da plataforma.")}
            </Paragraph>

            <Text style={styles.subheading}>{t("Entre outras práticas, não é permitido:")}</Text>

            <Bullet>{t("Tentar obter acesso não autorizado a contas ou sistemas.")}</Bullet>

            <Bullet>{t("Utilizar informações falsas de forma fraudulenta.")}</Bullet>

            <Bullet>{t("Interferir no funcionamento normal da plataforma.")}</Bullet>

            <Bullet>{t("Utilizar o serviço para atividades ilegais.")}</Bullet>
          </TermsSection>

          {/* 8 */}

          <TermsSection number="08" icon="close-circle-outline" title={t("Cancelamentos e alterações")}>
            <Paragraph>
              {t("As condições de cancelamento ou alteração de um agendamento podem variar conforme o espaço e o serviço escolhido.")}
            </Paragraph>

            <Paragraph>{t("O utilizador deve consultar as condições apresentadas no momento da reserva.")}</Paragraph>
          </TermsSection>

          {/* 9 */}

          <TermsSection number="09" icon="server-outline" title={t("Disponibilidade da plataforma")}>
            <Paragraph>
              {t("Procuramos manter o Agenda+ disponível e funcional, mas podem ocorrer interrupções temporárias devido a manutenção, atualizações, problemas técnicos ou circunstâncias fora do nosso controlo.")}
            </Paragraph>
          </TermsSection>

          {/* 10 */}

          <TermsSection number="10" icon="document-attach-outline" title={t("Propriedade intelectual")}>
            <Paragraph>
              {t("A identidade visual, marca, interface, conteúdo, software e outros elementos próprios do Agenda+ estão protegidos pelas normas aplicáveis de propriedade intelectual.")}
            </Paragraph>

            <Paragraph>
              {t("Não é permitido copiar, modificar, distribuir ou explorar esses elementos sem autorização adequada.")}
            </Paragraph>
          </TermsSection>

          {/* 11 */}

          <TermsSection number="11" icon="people-outline" title={t("Responsabilidades")}>
            <Paragraph>
              {t("O utilizador é responsável pela utilização que faz da plataforma e pelas informações que disponibiliza.")}
            </Paragraph>

            <Paragraph>
              {t("O Agenda+ procura fornecer uma experiência segura e confiável, mas determinados serviços e interações dependem de terceiros e das condições específicas apresentadas na plataforma.")}
            </Paragraph>
          </TermsSection>

          {/* 12 */}

          <TermsSection number="12" icon="create-outline" title={t("Alterações aos termos")}>
            <Paragraph>
              {t("Podemos atualizar estes Termos e Condições periodicamente. Quando forem realizadas alterações relevantes, procuraremos disponibilizar informação adequada aos utilizadores.")}
            </Paragraph>

            <Paragraph>
              {t("A continuação da utilização do Agenda+ após a entrada em vigor das alterações significa que o utilizador aceita os termos atualizados.")}
            </Paragraph>
          </TermsSection>

          {/* CONTACT */}

          <View style={styles.contactCard}>
            <View style={styles.contactIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={tc.fg(COLORS.green)} />
            </View>

            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>{t("Tem alguma dúvida?")}</Text>

              <Text style={styles.contactDescription}>
                {t("Se precisar de esclarecimentos sobre estes termos, entre em contacto com a equipa do Agenda+.")}
              </Text>

              <Pressable
                onPress={() => router.push("/perfil/help")}
                style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}
              >
                <Text style={styles.contactButtonText}>{t("Centro de ajuda")}</Text>

                <Ionicons name="arrow-forward" size={16} color={tc.fg(COLORS.white)} />
              </Pressable>
            </View>
          </View>

          {/* LEGAL NOTICE */}

          <View style={styles.legalNotice}>
            <Ionicons name="information-circle-outline" size={17} color={tc.fg(COLORS.muted)} />

            <Text style={styles.legalNoticeText}>
              {t("Este conteúdo é uma versão informativa da estrutura de Termos e Condições do Agenda+. A versão jurídica definitiva deverá ser revista e aprovada antes do lançamento público da plataforma.")}
            </Text>
          </View>

          {/* FOOTER */}

          <View style={styles.footer}>
            <BrandIcon size={30} />

            <Text style={styles.footerBrand}>{t("Agenda+")}</Text>

            <Text style={styles.footerVersion}>{t("Termos e condições · v1.0.0")}</Text>
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
      fontSize: 18,
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
      paddingBottom: 50,
    },

    heroCard: {
      padding: 18,
      borderRadius: 23,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
    },

    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blueSoft),
      alignItems: "center",
      justifyContent: "center",
    },

    statusBadge: {
      height: 30,
      paddingHorizontal: 10,
      borderRadius: 15,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.greenSoft),
      flexDirection: "row",
      alignItems: "center",
    },

    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.green),
      marginRight: 6,
    },

    statusText: {
      fontSize: 9,
      fontWeight: "700",
      color: tc.fg(COLORS.green),
    },

    heroTitle: {
      marginTop: 17,
      fontSize: 19,
      lineHeight: 25,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
      letterSpacing: -0.4,
    },

    heroDescription: {
      marginTop: 7,
      fontSize: 11,
      lineHeight: 18,
      color: tc.fg(COLORS.secondary),
    },

    updatedRow: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
    },

    updatedText: {
      marginLeft: 6,
      fontSize: 9,
      color: tc.fg(COLORS.muted),
    },

    introductionCard: {
      marginTop: 15,
      padding: 15,
      borderRadius: 20,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blueSoft),
      borderWidth: 1,
      borderColor: tc.border("#E5F1FF"),
      flexDirection: "row",
      alignItems: "flex-start",
    },

    introductionIcon: {
      width: 35,
      height: 35,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      alignItems: "center",
      justifyContent: "center",
    },

    introductionText: {
      flex: 1,
      marginLeft: 10,
      fontSize: 10,
      lineHeight: 16,
      color: tc.fg(COLORS.secondary),
    },

    section: {
      marginTop: 27,
      padding: 16,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
    },

    sectionIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      alignItems: "center",
      justifyContent: "center",
    },

    sectionHeaderContent: {
      flex: 1,
      marginLeft: 11,
    },

    sectionNumber: {
      fontSize: 8,
      fontWeight: "700",
      color: tc.fg(COLORS.blue),
      letterSpacing: 0.3,
    },

    sectionTitle: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    sectionBody: {
      marginTop: 13,
    },

    paragraph: {
      marginBottom: 10,
      fontSize: 10,
      lineHeight: 17,
      color: tc.fg(COLORS.secondary),
    },

    subheading: {
      marginTop: 2,
      marginBottom: 9,
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    bulletRow: {
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "flex-start",
    },

    bullet: {
      width: 5,
      height: 5,
      marginTop: 6,
      borderRadius: 3,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blue),
    },

    bulletText: {
      flex: 1,
      marginLeft: 8,
      fontSize: 10,
      lineHeight: 16,
      color: tc.fg(COLORS.secondary),
    },

    infoBox: {
      marginTop: 3,
      padding: 11,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.orangeSoft),
      flexDirection: "row",
      alignItems: "flex-start",
    },

    infoBoxText: {
      flex: 1,
      marginLeft: 8,
      fontSize: 9,
      lineHeight: 15,
      color: tc.fg(COLORS.orange),
    },

    linkButton: {
      minHeight: 43,
      marginTop: 3,
      paddingHorizontal: 12,
      borderRadius: 13,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blueSoft),
      flexDirection: "row",
      alignItems: "center",
    },

    linkButtonText: {
      flex: 1,
      marginHorizontal: 8,
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.blue),
    },

    contactCard: {
      marginTop: 27,
      padding: 16,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      flexDirection: "row",
    },

    contactIcon: {
      width: 45,
      height: 45,
      borderRadius: 15,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.greenSoft),
      alignItems: "center",
      justifyContent: "center",
    },

    contactContent: {
      flex: 1,
      marginLeft: 12,
    },

    contactTitle: {
      fontSize: 12,
      fontWeight: "700",
      color: tc.fg(COLORS.text),
    },

    contactDescription: {
      marginTop: 4,
      fontSize: 10,
      lineHeight: 16,
      color: tc.fg(COLORS.secondary),
    },

    contactButton: {
      height: 38,
      marginTop: 12,
      paddingHorizontal: 13,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.black),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
    },

    contactButtonText: {
      marginRight: 7,
      fontSize: 10,
      fontWeight: "700",
      color: tc.fg(COLORS.white),
    },

    legalNotice: {
      marginTop: 20,
      paddingHorizontal: 5,
      flexDirection: "row",
      alignItems: "flex-start",
    },

    legalNoticeText: {
      flex: 1,
      marginLeft: 8,
      fontSize: 8,
      lineHeight: 13,
      color: tc.fg(COLORS.muted),
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
