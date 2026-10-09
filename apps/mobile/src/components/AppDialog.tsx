import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Modal, Pressable, StyleSheet, Text, View, type AlertButton } from "react-native";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIOSColors } from "@/components/ios";
import { Typography } from "@/constants/theme";
import { useT } from "@/i18n";

/*
 * Substitui as caixas de alerta do sistema e do browser ("Esta página diz…") por
 * avisos da própria app. Todo o código continua a chamar Alert.alert(); esta peça
 * decide como mostrar:
 *
 *  - um aviso simples (sem escolha a fazer) aparece como uma faixa no topo, que
 *    desaparece sozinha — não é preciso carregar em nada;
 *  - uma pergunta (dois ou mais botões) aparece como uma folha de opções vinda de
 *    baixo, ao estilo do iOS, com "Cancelar" separado.
 */

type Request = { id: number; title: string; message?: string; buttons: AlertButton[] };

let nextId = 1;
let listener: ((request: Request) => void) | null = null;
const pending: Request[] = [];

function emit(request: Request) {
  if (listener) listener(request);
  else pending.push(request);
}

Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
  emit({ id: nextId++, title, message: message || undefined, buttons: buttons ?? [] });
};

const NOTICE_MS = 3200;

export function AppDialogHost() {
  const t = useT();
  const colors = useIOSColors();
  const insets = useSafeAreaInsets();

  const [notice, setNotice] = useState<Request | null>(null);
  const [sheet, setSheet] = useState<Request | null>(null);
  const noticeAnimation = useRef(new Animated.Value(0)).current;
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listener = (request) => {
      // Sem escolha a fazer (nenhum botão, ou só "OK"): é um aviso, não uma pergunta.
      const isNotice = request.buttons.length <= 1;
      if (!isNotice) {
        setSheet(request);
        return;
      }

      request.buttons[0]?.onPress?.();
      setNotice(request);
    };
    for (const request of pending.splice(0)) listener(request);

    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;

    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    Animated.spring(noticeAnimation, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();
    noticeTimer.current = setTimeout(() => {
      Animated.timing(noticeAnimation, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
        setNotice(null),
      );
    }, NOTICE_MS);

    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [notice, noticeAnimation]);

  const dismissNotice = () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    Animated.timing(noticeAnimation, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setNotice(null));
  };

  const choose = (button?: AlertButton) => {
    setSheet(null);
    button?.onPress?.();
  };

  const cancel = sheet?.buttons.find((button) => button.style === "cancel");
  const actions = sheet?.buttons.filter((button) => button.style !== "cancel") ?? [];

  return (
    <>
      {notice ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.noticeLayer,
            {
              top: insets.top + 8,
              opacity: noticeAnimation,
              transform: [{ translateY: noticeAnimation.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
            },
          ]}
        >
          <Pressable onPress={dismissNotice} accessibilityRole="alert">
            <View style={styles.notice}>
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
              <Ionicons name="information-circle" size={22} color="#FFFFFF" />
              <View style={styles.noticeText}>
                <Text style={styles.noticeTitle} numberOfLines={2}>
                  {t(notice.title)}
                </Text>
                {notice.message ? (
                  <Text style={styles.noticeMessage} numberOfLines={3}>
                    {t(notice.message)}
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={() => choose(cancel)}>
        <Pressable style={styles.scrim} onPress={() => choose(cancel)} accessibilityLabel={t("Fechar")} />
        {sheet ? (
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <View style={[styles.sheetGroup, { backgroundColor: colors.surfaceElevated }]}>
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.textSecondary }]}>{t(sheet.title)}</Text>
                {sheet.message ? (
                  <Text style={[styles.sheetMessage, { color: colors.textSecondary }]}>{t(sheet.message)}</Text>
                ) : null}
              </View>
              {actions.map((button, index) => (
                <View key={`${button.text}-${index}`}>
                  <View style={[styles.separator, { backgroundColor: colors.divider }]} />
                  <Pressable onPress={() => choose(button)} accessibilityRole="button">
                    {({ pressed }) => (
                      <View style={[styles.sheetButton, pressed && { backgroundColor: colors.backgroundSelected }]}>
                        <Text
                          style={[
                            styles.sheetButtonText,
                            { color: button.style === "destructive" ? colors.error : colors.primary },
                          ]}
                        >
                          {t(button.text)}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                </View>
              ))}
            </View>

            <Pressable onPress={() => choose(cancel)} accessibilityRole="button">
              {({ pressed }) => (
                <View
                  style={[
                    styles.sheetGroup,
                    styles.sheetButton,
                    { backgroundColor: pressed ? colors.backgroundSelected : colors.surfaceElevated },
                  ]}
                >
                  <Text style={[styles.sheetButtonText, styles.cancelText, { color: colors.primary }]}>
                    {t(cancel?.text) ?? t("Cancelar")}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  noticeLayer: {
    position: "absolute",
    left: 12,
    right: 12,
    alignItems: "center",
    zIndex: 100000,
    elevation: 100000,
  },
  notice: {
    maxWidth: 520,
    minHeight: 52,
    borderRadius: 18,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(30,30,32,0.72)",
  },
  noticeText: {
    flexShrink: 1,
  },
  noticeTitle: {
    ...Typography.subheadline,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  noticeMessage: {
    ...Typography.footnote,
    color: "rgba(255,255,255,0.82)",
    marginTop: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    gap: 8,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  sheetGroup: {
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    gap: 2,
  },
  sheetTitle: {
    ...Typography.footnote,
    fontWeight: "600",
    textAlign: "center",
  },
  sheetMessage: {
    ...Typography.footnote,
    textAlign: "center",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  sheetButton: {
    minHeight: 57,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  sheetButtonText: {
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  cancelText: {
    fontWeight: "600",
  },
});
