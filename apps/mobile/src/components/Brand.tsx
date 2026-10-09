import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useT } from "@/i18n";

/*
 * A marca agenda+ num só sítio: o ícone da app, o nome escrito e o ecrã de abertura.
 * Trocar a marca no futuro é mexer só aqui (e nas imagens em assets/images).
 */

export const BRAND_NAME = "Agenda+";
export const BRAND_TAGLINE = "organize hoje. avance amanhã.";
export const BRAND_BLUE = "#1451D6";
export const BRAND_MINT = "#8FFFC7";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ICON = require("../../assets/images/icon.png");

// O ícone da app com os cantos contínuos do iOS (o ficheiro é quadrado, sem cantos).
export function BrandIcon({ size }: { size: number }) {
  // O recorte fica numa View porque `borderCurve` (cantos contínuos) não existe em imagens.
  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.225, borderCurve: "continuous", overflow: "hidden" }}
    >
      <Image source={ICON} style={{ width: size, height: size }} />
    </View>
  );
}

// "Agenda" + o sinal de mais na cor de destaque, como no logótipo.
export function BrandWordmark({ size, color, plusColor }: { size: number; color: string; plusColor: string }) {
  const t = useT();
  return (
    <Text
      style={[styles.wordmark, { fontSize: size, lineHeight: size * 1.15, color }]}
      accessibilityLabel={t("agenda mais")}
    >
      Agenda<Text style={{ color: plusColor }}> +</Text>
    </Text>
  );
}

const MIN_VISIBLE_MS = 1900;

/*
 * Ecrã de abertura: a primeira coisa que aparece ao abrir a app. O ícone entra com uma
 * mola, o nome sobe por baixo, e o conjunto desvanece para revelar a app quando esta
 * está pronta — nunca antes de ~2 s, para a marca se ver, nem depois de a app estar à espera.
 */
export function IntroSplash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const t = useT();
  const icon = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(icon, { toValue: 1, useNativeDriver: true, speed: 9, bounciness: 9 }),
      Animated.timing(text, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => setMinimumElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [icon, text]);

  useEffect(() => {
    if (!ready || !minimumElapsed) return;
    Animated.timing(exit, { toValue: 1, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
      () => onDone(),
    );
  }, [ready, minimumElapsed, exit, onDone]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.splash,
        {
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={t("agenda mais")}
    >
      <LinearGradient
        colors={["#1E5EEA", BRAND_BLUE, "#0F41B4"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.iconShadow,
          {
            opacity: icon.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
            transform: [{ scale: icon.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      >
        <View style={styles.iconRim}>
          <BrandIcon size={124} />
        </View>
      </Animated.View>

      <Animated.View
        style={{
          alignItems: "center",
          opacity: text,
          transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        }}
      >
        <BrandWordmark size={40} color="#FFFFFF" plusColor={BRAND_MINT} />
        <Text style={styles.tagline}>{BRAND_TAGLINE}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  splash: {
    alignItems: "center",
    justifyContent: "center",
    gap: 26,
    zIndex: 99999,
    elevation: 99999,
  },
  iconShadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  iconRim: {
    borderRadius: 124 * 0.225 + 3,
    borderCurve: "continuous",
    padding: 3,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  tagline: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
    color: "rgba(255,255,255,0.78)",
  },
});
