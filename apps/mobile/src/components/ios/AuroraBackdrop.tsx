import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BlurView } from "expo-blur";

/*
 * Fundo das páginas de entrada: três luzes de cor (azul, violeta, ciano) muito
 * desfocadas, a deslizar devagar por trás de um véu de vidro — o mesmo tipo de
 * profundidade dos fundos do iOS/macOS. Brilha no preto do modo escuro e fica
 * apenas um tom no modo claro. Com "Reduzir movimento" ativo fica parado.
 */

type Orb = {
  color: string;
  size: number;
  top: `${number}%`;
  left: `${number}%`;
  drift: [number, number];
  duration: number;
};

const ORBS: Orb[] = [
  { color: "#0A84FF", size: 340, top: "-8%", left: "-30%", drift: [60, 40], duration: 22000 },
  { color: "#BF5AF2", size: 300, top: "30%", left: "45%", drift: [-50, 60], duration: 26000 },
  { color: "#64D2FF", size: 260, top: "68%", left: "-15%", drift: [70, -40], duration: 30000 },
];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduced)
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => subscription.remove();
  }, []);

  return reduced;
}

function DriftingOrb({ orb, opacity, still }: { orb: Orb; opacity: number; still: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (still) {
      progress.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: orb.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: orb.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [orb.duration, progress, still]);

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: orb.size,
          height: orb.size,
          borderRadius: orb.size / 2,
          top: orb.top,
          left: orb.left,
          backgroundColor: orb.color,
          opacity,
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, orb.drift[0]] }) },
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, orb.drift[1]] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) },
          ],
        },
      ]}
    />
  );
}

export function AuroraBackdrop() {
  const isDark = useColorScheme() === "dark";
  const still = useReducedMotion();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ORBS.map((orb) => (
        <DriftingOrb key={orb.color} orb={orb} opacity={isDark ? 0.55 : 0.18} still={still} />
      ))}
      <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      {/* Escurece o centro para o texto e os campos continuarem legíveis por cima das cores. */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(0,0,0,0.35)" : "rgba(242,242,247,0.55)" }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: "absolute",
  },
});
