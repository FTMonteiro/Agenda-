import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
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

import { getMe, updateMe } from "../../services/users";
import { uploadAvatar } from "../../services/avatar";
import { useAuth } from "../../contexts/AuthContext";
import { useThemed, type ThemeRoles } from "@/theme/roles";
import { useT } from "@/i18n";

const COLORS = {
  background: "#F5F5F2",
  white: "#FFFFFF",
  black: "#000000",
  text: "#000000",
  secondary: "#636366",
  muted: "#AEAEB2",
  border: "#E5E5EA",
  inputBackground: "#F2F2F7",
  blue: "#1451D6",
  blueSoft: "#E5ECFA",
  success: "#34C759",
  danger: "#FF3B30",
  dangerSoft: "#FFEBEA",
};

type IconName = keyof typeof Ionicons.glyphMap;

type InputFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  icon: IconName;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words";
  editable?: boolean;
  helperText?: string;
};

function InputField({
  label,
  value,
  placeholder,
  icon,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "sentences",
  editable = true,
  helperText,
}: InputFieldProps) {
  const { tc, styles } = useThemed(createStyles);
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <View style={[styles.inputWrapper, !editable && styles.inputWrapperDisabled]}>
        <View style={styles.inputIcon}>
          <Ionicons name={icon} size={18} color={tc.fg(editable ? COLORS.text : COLORS.muted)} />
        </View>

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tc.fg(COLORS.muted)}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          style={[styles.input, !editable && styles.inputDisabled]}
          selectionColor={COLORS.blue}
          returnKeyType="done"
        />

        {!editable && <Ionicons name="lock-closed-outline" size={16} color={tc.fg(COLORS.muted)} />}
      </View>

      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

export default function PersonalInfoScreen() {
  const t = useT();
  const { tc, styles } = useThemed(createStyles);
  const router = useRouter();
  const { refresh: refreshAuth } = useAuth();

  // ==========================================================
  // DADOS
  // ==========================================================

  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // ==========================================================
  // FOTO
  // ==========================================================

  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // ==========================================================
  // ESTADOS
  // ==========================================================

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [saved, setSaved] = useState(false);

  const saveScale = useRef(new Animated.Value(1)).current;

  // ==========================================================
  // CARREGAR PERFIL
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const me = await getMe();
        if (cancelled) return;

        setFullName(me.name);
        setEmail(me.email);
        setPhone(me.phone ?? "");
        setAvatarUrl(me.avatarUrl);
      } catch (error) {
        if (!cancelled) {
          Alert.alert(t("Erro"), t("Não foi possível carregar os seus dados."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // INICIAIS
  // ==========================================================

  const initials = useMemo(() => {
    const result = fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name.charAt(0).toUpperCase())
      .join("");

    return result || "?";
  }, [fullName]);

  // ==========================================================
  // VALIDAÇÃO
  // ==========================================================

  const isFormValid = fullName.trim().length >= 2 && phone.trim().length >= 6;

  // ==========================================================
  // ALTERAÇÃO
  // ==========================================================

  const markAsChanged = () => {
    setSaved(false);
  };

  // ==========================================================
  // GALERIA
  // ==========================================================

  const pickImageFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(t("Permissão necessária"), t("Permita o acesso às suas fotos para escolher uma foto de perfil."));

        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) {
        return;
      }

      const selectedImage = result.assets?.[0]?.uri;

      if (!selectedImage) {
        return;
      }

      setPhotoUri(selectedImage);

      markAsChanged();
    } catch (error) {
      console.error("Erro ao escolher imagem:", error);

      Alert.alert(t("Erro"), t("Não foi possível abrir a galeria."));
    }
  };

  // ==========================================================
  // CÂMARA
  // ==========================================================

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(t("Permissão necessária"), t("Permita o acesso à câmara para tirar uma foto de perfil."));

        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) {
        return;
      }

      const capturedImage = result.assets?.[0]?.uri;

      if (!capturedImage) {
        return;
      }

      setPhotoUri(capturedImage);

      markAsChanged();
    } catch (error) {
      console.error("Erro ao tirar foto:", error);

      Alert.alert(t("Erro"), t("Não foi possível abrir a câmara."));
    }
  };

  // ==========================================================
  // REMOVER FOTO
  // ==========================================================

  const removePhoto = () => {
    if (!photoUri) {
      return;
    }

    Alert.alert(t("Remover foto"), t("Deseja realmente remover a sua foto de perfil?"), [
      {
        text: t("Cancelar"),
        style: "cancel",
      },
      {
        text: t("Remover"),
        style: "destructive",
        onPress: () => {
          setPhotoUri(null);
          markAsChanged();
        },
      },
    ]);
  };

  // ==========================================================
  // OPÇÕES DA FOTO
  // ==========================================================

  const openPhotoOptions = () => {
    const buttons: Array<{
      text: string;
      onPress?: () => void;
      style?: "default" | "cancel" | "destructive";
    }> = [
      {
        text: t("Escolher da galeria"),
        onPress: pickImageFromGallery,
      },
      {
        text: t("Tirar uma foto"),
        onPress: takePhoto,
      },
    ];

    if (photoUri) {
      buttons.push({
        text: t("Remover foto"),
        style: "destructive",
        onPress: removePhoto,
      });
    }

    buttons.push({
      text: t("Cancelar"),
      style: "cancel",
    });

    Alert.alert(t("Foto de perfil"), t("Escolha uma opção"), buttons);
  };

  // ==========================================================
  // ANIMAÇÃO DO BOTÃO
  // ==========================================================

  const handleSavePressIn = () => {
    Animated.spring(saveScale, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 30,
      bounciness: 5,
    }).start();
  };

  const handleSavePressOut = () => {
    Animated.spring(saveScale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 5,
    }).start();
  };

  // ==========================================================
  // GUARDAR
  // ==========================================================

  const handleSave = async () => {
    if (saving) {
      return;
    }

    const cleanName = fullName.trim();

    const cleanPhone = phone.trim();

    if (!cleanName) {
      Alert.alert(t("Nome obrigatório"), t("Digite o seu nome completo."));

      return;
    }

    if (cleanName.length < 2) {
      Alert.alert(t("Nome inválido"), t("Digite um nome válido."));

      return;
    }

    if (cleanPhone.length < 6) {
      Alert.alert(t("Telefone inválido"), t("Digite um número de telefone válido."));

      return;
    }

    setSaving(true);

    setSaved(false);

    try {
      // Uma foto nova escolhida neste ecrã é enviada junto com o resto dos dados.
      if (photoUri) {
        const withPhoto = await uploadAvatar(photoUri);
        setAvatarUrl(withPhoto.avatarUrl);
        setPhotoUri(null);
      }

      const updated = await updateMe({
        name: cleanName,
        phone: cleanPhone,
      });

      setFullName(updated.name);
      setPhone(updated.phone ?? "");
      // Atualiza o nome e a foto mostrados no Perfil e na Home.
      void refreshAuth();

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error("Erro ao guardar:", error);

      Alert.alert(t("Erro"), t("Não foi possível guardar as alterações."));
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // VOLTAR
  // ==========================================================

  const handleBack = () => {
    router.back();
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={tc.dark ? "light-content" : "dark-content"} />

        <View style={[styles.keyboardView, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={tc.fg(COLORS.black)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={tc.dark ? "light-content" : "dark-content"} />

      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* ================================================= */}
          {/* HEADER */}
          {/* ================================================= */}

          <View style={styles.header}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={23} color={tc.fg(COLORS.text)} />
            </Pressable>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{t("Dados pessoais")}</Text>

              <Text style={styles.headerSubtitle}>{t("Informações da sua conta")}</Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          {/* ================================================= */}
          {/* PROFILE CARD */}
          {/* ================================================= */}

          <View style={styles.profileCard}>
            <Pressable
              onPress={openPhotoOptions}
              style={({ pressed }) => [styles.avatarWrapper, pressed && styles.avatarPressed]}
            >
              {photoUri || avatarUrl ? (
                <Image
                  source={{
                    uri: photoUri ?? avatarUrl ?? undefined,
                  }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}

              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={11} color={tc.fg(COLORS.white)} />
              </View>
            </Pressable>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {fullName || t("Seu nome")}
              </Text>

              <View style={styles.accountRow}>
                <View style={styles.activeDot} />

                <Text style={styles.accountStatus}>{t("Conta ativa")}</Text>
              </View>
            </View>

            <Pressable
              onPress={openPhotoOptions}
              style={({ pressed }) => [styles.photoButton, pressed && styles.photoButtonPressed]}
            >
              <Ionicons name="camera-outline" size={18} color={tc.fg(COLORS.text)} />
            </Pressable>
          </View>

          {/* ================================================= */}
          {/* INFORMATION */}
          {/* ================================================= */}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <Text style={styles.sectionTitle}>{t("Informações")}</Text>

                <Text style={styles.sectionDescription}>{t("Mantenha os seus dados atualizados.")}</Text>
              </View>

              <View style={styles.privateBadge}>
                <Ionicons name="shield-checkmark-outline" size={14} color={tc.fg(COLORS.success)} />

                <Text style={styles.privateBadgeText}>{t("Privado")}</Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <InputField
                label={t("Nome completo")}
                value={fullName}
                placeholder={t("Digite o seu nome completo")}
                icon="person-outline"
                onChangeText={(value) => {
                  setFullName(value);
                  markAsChanged();
                }}
                autoCapitalize="words"
              />

              <View style={styles.fieldDivider} />

              <InputField
                label={t("Email")}
                value={email}
                placeholder={t("Digite o seu email")}
                icon="mail-outline"
                onChangeText={() => {}}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={false}
                helperText={t("O email está associado à sua conta.")}
              />

              <View style={styles.fieldDivider} />

              <InputField
                label={t("Telefone")}
                value={phone}
                placeholder="+244 900 000 000"
                icon="call-outline"
                onChangeText={(value) => {
                  setPhone(value);
                  markAsChanged();
                }}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* ================================================= */}
          {/* PHOTO ACTION */}
          {/* ================================================= */}

          <Pressable
            onPress={openPhotoOptions}
            style={({ pressed }) => [styles.photoActionCard, pressed && styles.photoActionCardPressed]}
          >
            <View style={styles.photoActionIcon}>
              <Ionicons name="image-outline" size={21} color={tc.fg(COLORS.blue)} />
            </View>

            <View style={styles.photoActionContent}>
              <Text style={styles.photoActionTitle}>
                {photoUri ? t("Alterar foto de perfil") : t("Adicionar foto de perfil")}
              </Text>

              <Text style={styles.photoActionText}>{t("Escolha uma foto da galeria ou tire uma nova.")}</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color={tc.fg(COLORS.muted)} />
          </Pressable>

          {/* ================================================= */}
          {/* SECURITY */}
          {/* ================================================= */}

          <View style={styles.securityCard}>
            <View style={styles.securityIcon}>
              <Ionicons name="shield-checkmark-outline" size={20} color={tc.fg(COLORS.blue)} />
            </View>

            <View style={styles.securityContent}>
              <Text style={styles.securityTitle}>{t("Os seus dados estão protegidos")}</Text>

              <Text style={styles.securityText}>
                {t("As suas informações pessoais são utilizadas apenas para melhorar a sua experiência no Agenda+.")}
              </Text>
            </View>
          </View>

          {/* ================================================= */}
          {/* SAVE BUTTON */}
          {/* ================================================= */}

          <Animated.View
            style={[
              styles.saveButtonWrapper,
              {
                transform: [
                  {
                    scale: saveScale,
                  },
                ],
              },
            ]}
          >
            <Pressable
              onPress={handleSave}
              onPressIn={handleSavePressIn}
              onPressOut={handleSavePressOut}
              disabled={!isFormValid || saving}
              style={[styles.saveButton, !isFormValid && styles.saveButtonDisabled, saved && styles.saveButtonSaved]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={tc.fg(COLORS.white)} />
              ) : saved ? (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color={tc.fg(COLORS.white)} />

                  <Text style={styles.saveButtonText}>{t("Alterações guardadas")}</Text>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark" size={19} color={tc.fg(COLORS.white)} />

                  <Text style={styles.saveButtonText}>{t("Guardar alterações")}</Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* ================================================= */}
          {/* FOOTER */}
          {/* ================================================= */}

          <Text style={styles.bottomHint}>{t("Pode alterar os seus dados pessoais a qualquer momento.")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (tc: ThemeRoles) =>
  StyleSheet.create({
    // ==========================================================
    // BASE
    // ==========================================================

    safeArea: {
      flex: 1,
      backgroundColor: tc.bg(COLORS.background),
    },

    keyboardView: {
      flex: 1,
    },

    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 70,
    },

    // ==========================================================
    // HEADER
    // ==========================================================

    header: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 18,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      alignItems: "center",
      justifyContent: "center",
    },

    backButtonPressed: {
      transform: [
        {
          scale: 0.94,
        },
      ],
    },

    headerCenter: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 12,
    },

    headerTitle: {
      color: tc.fg(COLORS.text),
      fontSize: 18,
      fontWeight: "700",
      letterSpacing: -0.3,
    },

    headerSubtitle: {
      color: tc.fg(COLORS.secondary),
      fontSize: 11,
      marginTop: 3,
    },

    headerSpacer: {
      width: 42,
    },

    // ==========================================================
    // PROFILE
    // ==========================================================

    profileCard: {
      backgroundColor: tc.bg(COLORS.white),
      borderRadius: 24,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 30,
    },

    avatarWrapper: {
      position: "relative",
      marginRight: 13,
    },

    avatarPressed: {
      transform: [
        {
          scale: 0.96,
        },
      ],
    },

    avatar: {
      width: 62,
      height: 62,
      borderRadius: 31,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.black),
      alignItems: "center",
      justifyContent: "center",
    },

    avatarImage: {
      width: 62,
      height: 62,
      borderRadius: 31,
      borderCurve: "continuous",
    },

    avatarText: {
      color: tc.fg(COLORS.white),
      fontSize: 18,
      fontWeight: "700",
      letterSpacing: 0.4,
    },

    verifiedBadge: {
      position: "absolute",
      right: -1,
      bottom: -1,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blue),
      borderWidth: 3,
      borderColor: tc.border(COLORS.white),
      alignItems: "center",
      justifyContent: "center",
    },

    profileInfo: {
      flex: 1,
      minWidth: 0,
    },

    profileName: {
      color: tc.fg(COLORS.text),
      fontSize: 16,
      fontWeight: "700",
    },

    accountRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 5,
    },

    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.success),
      marginRight: 6,
    },

    accountStatus: {
      color: tc.fg(COLORS.success),
      fontSize: 11,
      fontWeight: "700",
    },

    photoButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderCurve: "continuous",
      backgroundColor: tc.bg("#F2F2F7"),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      alignItems: "center",
      justifyContent: "center",
    },

    photoButtonPressed: {
      transform: [
        {
          scale: 0.94,
        },
      ],
    },

    // ==========================================================
    // SECTION
    // ==========================================================

    section: {
      marginBottom: 27,
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 11,
    },

    sectionHeaderText: {
      flex: 1,
    },

    sectionTitle: {
      color: tc.fg(COLORS.text),
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: -0.1,
    },

    sectionDescription: {
      color: tc.fg(COLORS.secondary),
      fontSize: 12,
      marginTop: 4,
      lineHeight: 17,
    },

    privateBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: tc.bg("#EAF9EE"),
      borderRadius: 20,
      borderCurve: "continuous",
      paddingHorizontal: 9,
      paddingVertical: 6,
      marginLeft: 10,
    },

    privateBadgeText: {
      color: tc.fg(COLORS.success),
      fontSize: 10,
      fontWeight: "700",
      marginLeft: 4,
    },

    // ==========================================================
    // FORM
    // ==========================================================

    formCard: {
      backgroundColor: tc.bg(COLORS.white),
      borderRadius: 22,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      overflow: "hidden",
    },

    fieldContainer: {
      paddingHorizontal: 15,
      paddingVertical: 14,
    },

    fieldLabel: {
      color: tc.fg(COLORS.text),
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 8,
    },

    inputWrapper: {
      minHeight: 50,
      borderRadius: 15,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.inputBackground),
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 10,
    },

    inputWrapperDisabled: {
      backgroundColor: tc.bg("#F2F2F7"),
    },

    inputIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 7,
    },

    input: {
      flex: 1,
      minHeight: 48,
      color: tc.fg(COLORS.text),
      fontSize: 14,
      fontWeight: "500",
      paddingVertical: 0,
    },

    inputDisabled: {
      color: tc.fg(COLORS.secondary),
    },

    helperText: {
      color: tc.fg(COLORS.muted),
      fontSize: 10,
      marginTop: 6,
      marginLeft: 2,
    },

    fieldDivider: {
      height: 1,
      backgroundColor: tc.bg(COLORS.border),
      marginLeft: 15,
    },

    // ==========================================================
    // PHOTO ACTION
    // ==========================================================

    photoActionCard: {
      backgroundColor: tc.bg(COLORS.white),
      borderRadius: 20,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: tc.border(COLORS.border),
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },

    photoActionCardPressed: {
      transform: [
        {
          scale: 0.985,
        },
      ],
    },

    photoActionIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.blueSoft),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },

    photoActionContent: {
      flex: 1,
    },

    photoActionTitle: {
      color: tc.fg(COLORS.text),
      fontSize: 13,
      fontWeight: "700",
    },

    photoActionText: {
      color: tc.fg(COLORS.secondary),
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },

    // ==========================================================
    // SECURITY
    // ==========================================================

    securityCard: {
      backgroundColor: tc.bg(COLORS.blueSoft),
      borderRadius: 20,
      borderCurve: "continuous",
      padding: 14,
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 20,
      borderWidth: 1,
      borderColor: tc.border("#E5ECFA"),
    },

    securityIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.white),
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    securityContent: {
      flex: 1,
      paddingTop: 1,
    },

    securityTitle: {
      color: tc.fg(COLORS.text),
      fontSize: 12,
      fontWeight: "700",
    },

    securityText: {
      color: tc.fg(COLORS.secondary),
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
    },

    // ==========================================================
    // SAVE
    // ==========================================================

    saveButtonWrapper: {
      width: "100%",
    },

    saveButton: {
      minHeight: 56,
      borderRadius: 19,
      borderCurve: "continuous",
      backgroundColor: tc.bg(COLORS.black),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
    },

    saveButtonDisabled: {
      backgroundColor: tc.bg("#C7C7CC"),
    },

    saveButtonSaved: {
      backgroundColor: tc.bg(COLORS.success),
    },

    saveButtonText: {
      color: tc.fg(COLORS.white),
      fontSize: 14,
      fontWeight: "700",
      marginLeft: 8,
    },

    // ==========================================================
    // FOOTER
    // ==========================================================

    bottomHint: {
      color: tc.fg(COLORS.muted),
      fontSize: 10,
      textAlign: "center",
      lineHeight: 15,
      marginTop: 12,
      paddingHorizontal: 20,
    },
  });
