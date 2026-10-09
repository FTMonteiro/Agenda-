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
import { register } from "../../services/auth";
import { useT, translate } from "@/i18n";

// A API exige pelo menos 8 caracteres — validar o mesmo aqui evita um erro só depois de enviar.
const MIN_PASSWORD_LENGTH = 8;

type Field = "name" | "email" | "phone" | "password" | "confirmPassword";
type Errors = Partial<Record<Field, string>>;

function validate(values: Record<Field, string>): Errors {
  const errors: Errors = {};
  const name = values.name.trim();

  if (!name) errors.name = translate("Indique o seu nome.");
  else if (name.length < 3) errors.name = translate("O nome deve ter pelo menos 3 caracteres.");

  if (!values.email.trim()) errors.email = translate("Indique o seu e-mail.");
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = translate("O e-mail não é válido.");

  if (!values.phone.trim()) errors.phone = translate("Indique o seu telefone.");
  else if (values.phone.replace(/\D/g, "").length < 9) errors.phone = translate("O número de telefone não é válido.");

  if (!values.password) errors.password = translate("Escolha uma palavra-passe.");
  else if (values.password.length < MIN_PASSWORD_LENGTH)
    errors.password = translate("A palavra-passe deve ter pelo menos {0} caracteres.", [MIN_PASSWORD_LENGTH]);

  if (!values.confirmPassword) errors.confirmPassword = translate("Confirme a palavra-passe.");
  else if (values.password !== values.confirmPassword) errors.confirmPassword = translate("As palavras-passe não coincidem.");

  return errors;
}

export default function CadastroScreen() {
  const t = useT();
  const router = useRouter();
  const colors = useIOSColors();
  const isDark = useColorScheme() === "dark";
  const { refresh: refreshAuth } = useAuth();
  const { refresh: refreshFavorites } = useFavorites();

  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Corrigir um campo apaga logo o erro desse campo (validação em linha, não só ao enviar).
  const setField = (field: Field) => (text: string) => {
    setValues((current) => ({ ...current, [field]: text }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleCreateAccount = async () => {
    if (loading || socialBusy) return;

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    try {
      setLoading(true);

      await register({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        phone: values.phone.trim(),
        password: values.password,
      });

      // O registo já devolve a sessão, por isso a pessoa entra diretamente na app.
      await refreshAuth();
      void refreshFavorites();
      // Conta nova: o passo seguinte é indicar a província e o bairro.
      router.replace("/localizacao" as never);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "EMAIL_ALREADY_REGISTERED") {
        setErrors({ email: t("Já existe uma conta com este e-mail.") });
        Alert.alert(t("Conta existente"), t("Já existe uma conta com este e-mail. Entre com a sua palavra-passe."), [
          { text: t("Cancelar"), style: "cancel" },
          { text: t("Entrar"), onPress: () => router.replace("/login") },
        ]);
        return;
      }

      Alert.alert(
        t("Não foi possível criar a conta"),
        error instanceof ApiRequestError ? t(error.message) : t("Verifique a ligação à internet e tente novamente."),
      );
    } finally {
      setLoading(false);
    }
  };

  const accountError = errors.name ?? errors.email ?? errors.phone;
  const passwordError = errors.password ?? errors.confirmPassword;

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
              <Text style={[styles.title, { color: colors.text }]}>{t("Criar conta")}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t("Marque os seus serviços de beleza em segundos.")}
              </Text>
            </View>

            <GroupedSection header={t("Os seus dados")} error={accountError}>
              <FieldRow
                label={t("Nome")}
                placeholder={t("Nome completo")}
                value={values.name}
                onChangeText={setField("name")}
                invalid={Boolean(errors.name)}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                submitBehavior="submit"
              />
              <FieldRow
                ref={emailRef}
                label={t("E-mail")}
                placeholder={t("nome@exemplo.com")}
                value={values.email}
                onChangeText={setField("email")}
                invalid={Boolean(errors.email)}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                submitBehavior="submit"
              />
              <FieldRow
                ref={phoneRef}
                label={t("Telefone")}
                placeholder={t("9XX XXX XXX")}
                value={values.phone}
                onChangeText={setField("phone")}
                invalid={Boolean(errors.phone)}
                autoComplete="tel"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                submitBehavior="submit"
              />
            </GroupedSection>

            <GroupedSection
              header={t("Segurança")}
              error={passwordError}
              footer={t("Use pelo menos {0} caracteres.", [MIN_PASSWORD_LENGTH])}
            >
              <FieldRow
                ref={passwordRef}
                label={t("Palavra-passe")}
                placeholder={t("Obrigatória")}
                value={values.password}
                onChangeText={setField("password")}
                invalid={Boolean(errors.password)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
                submitBehavior="submit"
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
              <FieldRow
                ref={confirmRef}
                label={t("Confirmar")}
                placeholder={t("Repita a palavra-passe")}
                value={values.confirmPassword}
                onChangeText={setField("confirmPassword")}
                invalid={Boolean(errors.confirmPassword)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleCreateAccount}
              />
            </GroupedSection>

            <FilledButton title={t("Criar conta")} onPress={handleCreateAccount} loading={loading} />

            <SocialAuthButtons mode="register" disabled={loading} onBusyChange={setSocialBusy} />

            <Text style={[styles.legal, { color: colors.textSecondary }]}>
              {t("Ao criar uma conta, aceita os Termos de Utilização e a Política de Privacidade.")}
            </Text>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>{t("Já tem conta?")}</Text>
              <TextButton title={t("Entrar")} disabled={loading} onPress={() => router.replace("/login")} />
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
    paddingTop: 24,
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
  legal: {
    ...Typography.footnote,
    textAlign: "center",
    marginTop: 16,
    marginHorizontal: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
  },
  footerText: {
    ...Typography.body,
  },
});
