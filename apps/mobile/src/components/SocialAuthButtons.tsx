import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";

import { useIOSColors } from "@/components/ios";
import { Typography } from "@/constants/theme";
import { useT } from "@/i18n";
import { useAuth } from "../contexts/AuthContext";
import { useFavorites } from "../contexts/FavoritesContext";
import { ApiRequestError } from "../services/api-client";
import {
  appleSignInAvailable,
  googleSignInAvailable,
  signInWithApple,
  signInWithGoogle,
  type SocialMode,
} from "../services/auth";

type Provider = "google" | "apple";

// O que dizer à pessoa para cada recusa do servidor; o resto fica como falha genérica.
const MESSAGES: Record<string, string> = {
  GOOGLE_NOT_CONFIGURED: "O início de sessão com a Google ainda não está disponível.",
  APPLE_NOT_CONFIGURED: "O início de sessão com a Apple ainda não está disponível neste telemóvel.",
  GOOGLE_EMAIL_NOT_VERIFIED: "A Google não confirmou o e-mail desta conta.",
  APPLE_EMAIL_NOT_VERIFIED: "A Apple não confirmou o e-mail desta conta.",
  GOOGLE_HANDOFF_INVALID: "A sessão expirou. Tente novamente.",
};

/*
 * "Continuar com Google" e "Continuar com Apple", para o ecrã de entrar (mode "login") e
 * o de criar conta (mode "register"). Entrar nunca cria uma conta: quem ainda não a tem é
 * encaminhado para o registo, e quem já a tem e tenta registar-se, para o início de sessão.
 */
export function SocialAuthButtons({
  mode,
  disabled,
  onBusyChange,
}: {
  mode: SocialMode;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const t = useT();
  const router = useRouter();
  const colors = useIOSColors();
  const { refresh: refreshAuth } = useAuth();
  const { refresh: refreshFavorites } = useFavorites();

  const [busy, setBusy] = useState<Provider | null>(null);

  if (!googleSignInAvailable && !appleSignInAvailable) return null;

  const run = async (provider: Provider) => {
    if (busy || disabled) return;

    try {
      setBusy(provider);
      onBusyChange?.(true);

      const result = provider === "google" ? await signInWithGoogle(mode) : await signInWithApple(mode);
      if (!result) return;

      await refreshAuth();
      void refreshFavorites();
      // Conta nova: o passo seguinte é indicar a província e o bairro.
      router.replace(mode === "register" ? ("/localizacao" as never) : "/");
    } catch (error) {
      const code = error instanceof ApiRequestError ? error.code : "";

      if (code === "SOCIAL_NOT_REGISTERED") {
        Alert.alert(t("Conta não encontrada"), t("Esta conta ainda não está registada no agenda+. Crie uma conta primeiro."), [
          { text: t("Cancelar"), style: "cancel" },
          { text: t("Criar conta"), onPress: () => router.push("/cadastro") },
        ]);
        return;
      }

      if (code === "EMAIL_ALREADY_REGISTERED") {
        Alert.alert(t("Conta existente"), t("Já existe uma conta com este e-mail. Inicie sessão."), [
          { text: t("Cancelar"), style: "cancel" },
          { text: t("Entrar"), onPress: () => router.replace("/login") },
        ]);
        return;
      }

      Alert.alert(
        mode === "register" ? t("Não foi possível criar a conta") : t("Não foi possível entrar"),
        t(MESSAGES[code] ?? "Não foi possível concluir. Verifique a ligação à internet e tente novamente."),
      );
    } finally {
      setBusy(null);
      onBusyChange?.(false);
    }
  };

  const button = (provider: Provider, icon: "logo-google" | "logo-apple", title: string) => (
    <Pressable
      key={provider}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || busy), busy: busy === provider }}
      disabled={Boolean(disabled || busy)}
      onPress={() => void run(provider)}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.button,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: (disabled || busy) && busy !== provider ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}
        >
          {busy === provider ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons name={icon} size={20} color={colors.text} />
              <Text style={[styles.buttonText, { color: colors.text }]}>{title}</Text>
            </>
          )}
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.textSecondary }]}>{t("ou")}</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>

      {appleSignInAvailable ? button("apple", "logo-apple", t("Continuar com Apple")) : null}
      {googleSignInAvailable ? button("google", "logo-google", t("Continuar com Google")) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    gap: 12,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    ...Typography.footnote,
  },
  button: {
    height: 50,
    borderRadius: 14,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    ...Typography.headline,
  },
});
