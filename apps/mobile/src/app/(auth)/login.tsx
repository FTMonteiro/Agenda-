import React, { useRef, useState } from "react";

import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";

import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { FieldRow, FilledButton, GroupedSection, TextButton, useIOSColors } from "@/components/ios";
import { AuroraBackdrop } from "@/components/ios/AuroraBackdrop";
import { BrandIcon } from "@/components/Brand";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { Typography } from "@/constants/theme";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { ApiRequestError } from "../../services/api-client";
import { login } from "../../services/auth";
import { useT } from "@/i18n";

export default function LoginScreen() {
  const t = useT();
  const router = useRouter();
  const colors = useIOSColors();
  const isDark = useColorScheme() === "dark";
  const { refresh: refreshAuth } = useAuth();
  const { refresh: refreshFavorites } = useFavorites();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (loading || socialBusy) return;

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("Indique um e-mail válido."));
      return;
    }
    if (!password) {
      setError(t("Indique a sua palavra-passe."));
      return;
    }

    try {
      setLoading(true);
      setError("");

      await login({ email: email.trim().toLowerCase(), password });
      await refreshAuth();
      void refreshFavorites();

      // replace impede voltar ao login com o gesto de recuar.
      router.replace("/");
    } catch (caught) {
      if (caught instanceof ApiRequestError && caught.statusCode === 401) {
        setError(t("E-mail ou palavra-passe incorretos."));
        return;
      }

      Alert.alert(
        t("Não foi possível entrar"),
        caught instanceof ApiRequestError ? t(caught.message) : t("Verifique a ligação à internet e tente novamente."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(t("Recuperar palavra-passe"), t("A recuperação da conta ainda não está disponível."));
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <AuroraBackdrop />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.appIcon}>
                <BrandIcon size={76} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>{t("Entrar")}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t("Use a sua conta agenda+ para continuar.")}
              </Text>
            </View>

            <GroupedSection error={error}>
              <FieldRow
                label={t("E-mail")}
                placeholder={t("nome@exemplo.com")}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError("");
                }}
                invalid={Boolean(error)}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                submitBehavior="submit"
              />
              <FieldRow
                ref={passwordRef}
                label={t("Palavra-passe")}
                placeholder={t("Obrigatória")}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (error) setError("");
                }}
                invalid={Boolean(error)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                trailing={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? t("Ocultar palavra-passe") : t("Mostrar palavra-passe")}
                    onPress={() => setShowPassword((value) => !value)}
                    hitSlop={10}
                  >
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.textTertiary} />
                  </Pressable>
                }
              />
            </GroupedSection>

            <FilledButton title={t("Entrar")} onPress={handleLogin} loading={loading} />

            <View style={styles.forgot}>
              <TextButton title={t("Esqueceu-se da palavra-passe?")} disabled={loading} onPress={handleForgotPassword} />
            </View>

            <SocialAuthButtons mode="login" disabled={loading} onBusyChange={setSocialBusy} />

            <View style={styles.spacer} />

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t("Ainda não tem conta?")}</Text>
              <TextButton title={t("Criar conta")} disabled={loading} onPress={() => router.push("/cadastro")} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  appIcon: {
    marginBottom: 20,
  },
  title: {
    ...Typography.largeTitle,
    textAlign: "center",
  },
  subtitle: {
    ...Typography.body,
    textAlign: "center",
    marginTop: 6,
  },
  forgot: {
    alignItems: "center",
    marginTop: 20,
  },
  spacer: {
    flex: 1,
    minHeight: 32,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    ...Typography.body,
  },
});
