import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";

import { useIOSColors } from "@/components/ios";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { joinBusiness } from "@/services/businesses";
import { tapFeedback } from "@/services/haptics";
import { useT } from "@/i18n";

/*
 * Tela "Cliente do espaço", aberta ao confirmar uma marcação quando a pessoa não foi
 * reconhecida como cliente do espaço:
 *
 *   1. "Já é cliente de X?"            Sim → segue a marcação
 *                                       Não → passo 2
 *   2. "Criar o seu registo de cliente?" mostra os dados da conta que vão ser usados
 *                                       (foto, nome, telefone, email)
 *                                       Sim → regista no espaço e segue a marcação
 *                                       Não → segue a marcação sem registo
 *
 * Em qualquer passo dá para continuar sem responder: a marcação nunca fica presa aqui.
 * onDone(joined) diz se a pessoa ficou registada como cliente nesta tela.
 */

type Step = "ask" | "offer" | "saving" | "failed";

export function ClientCheckSheet({
  visible,
  businessId,
  businessName,
  onDone,
}: {
  visible: boolean;
  businessId: string;
  businessName: string;
  onDone: (joined: boolean) => void;
}) {
  const t = useT();
  const colors = useIOSColors();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("ask");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setStep("ask");
      setError(null);
    }
  }, [visible]);

  // "Já sou cliente" também liga a conta ao espaço, para não voltar a perguntar; se a
  // ligação falhar, a marcação segue na mesma.
  const alreadyClient = async () => {
    tapFeedback();
    setStep("saving");
    await joinBusiness(businessId).catch(() => undefined);
    onDone(false);
  };

  const register = async () => {
    tapFeedback();
    setStep("saving");
    setError(null);
    try {
      await joinBusiness(businessId);
      onDone(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t("Não foi possível criar o registo."));
      setStep("failed");
    }
  };

  const skip = () => {
    tapFeedback();
    onDone(false);
  };

  const details = [
    { icon: "person" as const, label: t("Nome"), value: user?.name ?? "—" },
    { icon: "call" as const, label: t("Telefone"), value: user?.phone || t("Sem telefone na conta") },
    { icon: "mail" as const, label: t("Email"), value: user?.email ?? "—" },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={skip}
    >
      <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
        <View style={styles.topBar}>
          <View style={styles.flex} />
          <Pressable onPress={skip} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Fechar")} disabled={step === "saving"}>
            <View style={[styles.close, { backgroundColor: colors.input }]}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {step === "ask" ? (
            <>
              <View style={[styles.icon, { backgroundColor: colors.infoBackground }]}>
                <Ionicons name="people" size={30} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{t("Já é cliente de {0}?", [businessName])}</Text>
              <Text style={[styles.text, { color: colors.textSecondary }]}>
                {t("Não encontrámos o seu registo neste espaço. Diga-nos se já é cliente para seguirmos com a marcação.")}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.avatarWrap}>
                <UserAvatar size={84} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{t("Criar o seu registo de cliente?")}</Text>
              <Text style={[styles.text, { color: colors.textSecondary }]}>
                {t("Fica registado como cliente de {0} com os dados da sua conta. Não precisa de preencher nada.", [businessName])}
              </Text>

              <View style={[styles.card, { backgroundColor: colors.card }]}>
                {details.map((row, index) => (
                  <View key={row.label}>
                    {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.divider }]} /> : null}
                    <View style={styles.row}>
                      <Ionicons name={row.icon} size={17} color={colors.textSecondary} />
                      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                      <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>
                        {row.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {step === "failed" && error ? (
                <View style={[styles.error, { backgroundColor: colors.errorBackground }]}>
                  <Ionicons name="alert-circle" size={17} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>

        <View style={styles.actions}>
          {step === "saving" ? (
            <View style={styles.saving}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : step === "ask" ? (
            <>
              <PrimaryButton label={t("Sim, já sou cliente")} onPress={() => void alreadyClient()} />
              <SecondaryButton
                label={t("Não, ainda não sou")}
                onPress={() => {
                  tapFeedback();
                  setStep("offer");
                }}
              />
              <LinkButton label={t("Continuar sem responder")} onPress={skip} />
            </>
          ) : (
            <>
              <PrimaryButton
                label={step === "failed" ? t("Tentar novamente") : t("Sim, criar o meu registo")}
                onPress={() => void register()}
              />
              <SecondaryButton label={t("Não, só fazer a marcação")} onPress={skip} />
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useIOSColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <View style={[styles.button, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useIOSColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {({ pressed }) => (
        <View style={[styles.button, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <Text style={[styles.buttonText, { color: colors.text }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useIOSColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={styles.link}>
      {({ pressed }) => <Text style={[styles.linkText, { color: colors.primary, opacity: pressed ? 0.6 : 1 }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  topBar: { flexDirection: "row", paddingHorizontal: 16, paddingTop: 12 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 24, alignItems: "center" },
  icon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  avatarWrap: { marginBottom: 18 },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", letterSpacing: -0.3 },
  text: { marginTop: 10, fontSize: 15, lineHeight: 22, textAlign: "center" },
  card: { alignSelf: "stretch", marginTop: 24, borderRadius: 14, borderCurve: "continuous", paddingHorizontal: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 29 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 50 },
  rowLabel: { fontSize: 15, width: 72 },
  rowValue: { flex: 1, fontSize: 15, fontWeight: "500", textAlign: "right" },
  error: { alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, padding: 12, borderRadius: 12 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  actions: { paddingHorizontal: 20, paddingBottom: 8, gap: 10 },
  saving: { height: 112, alignItems: "center", justifyContent: "center" },
  button: { height: 52, borderRadius: 14, borderCurve: "continuous", alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 16, fontWeight: "600" },
  link: { alignSelf: "center", paddingVertical: 10 },
  linkText: { fontSize: 15, fontWeight: "500" },
});
