import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIOSColors } from "@/components/ios";
import { Typography } from "@/constants/theme";

/*
 * A moldura comum dos ecrãs de topo (Início, Favoritos, Marcações), como nas apps da Apple:
 * um título grande que sobe com a página e passa para uma barra translúcida fixa no topo,
 * botões redondos para as ações e uma entrada em cascata das secções.
 */

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Distância de scroll a partir da qual a barra de topo fica opaca e mostra o título.
const COLLAPSE_START = 30;
const COLLAPSE_END = 70;

/* Barra fixa no topo: vidro e título pequeno só depois de a página subir; as ações ficam sempre. */
export function CollapsingTopBar({
  scrollY,
  title,
  left,
  right,
}: {
  scrollY: Animated.Value;
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const colors = useIOSColors();
  const insets = useSafeAreaInsets();
  const opacity = scrollY.interpolate({ inputRange: [COLLAPSE_START, COLLAPSE_END], outputRange: [0, 1], extrapolate: "clamp" });
  const titleShift = scrollY.interpolate({ inputRange: [COLLAPSE_START, COLLAPSE_END], outputRange: [6, 0], extrapolate: "clamp" });

  return (
    <View pointerEvents="box-none" style={[styles.topBar, { height: insets.top + 52 }]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
        <BlurView intensity={80} tint="systemChromeMaterial" style={StyleSheet.absoluteFill} />
        <View style={[styles.topBarBorder, { backgroundColor: colors.divider }]} />
      </Animated.View>

      <View pointerEvents="box-none" style={[styles.topBarRow, { marginTop: insets.top }]}>
        <View pointerEvents="box-none" style={styles.topBarSide}>
          {left}
        </View>
        <Animated.Text
          pointerEvents="none"
          style={[styles.topBarTitle, { color: colors.text, opacity, transform: [{ translateY: titleShift }] }]}
          numberOfLines={1}
        >
          {title}
        </Animated.Text>
        <View pointerEvents="box-none" style={[styles.topBarSide, styles.topBarRight]}>
          {right}
        </View>
      </View>
    </View>
  );
}

/* Título grande do ecrã; desvanece ao subir e cresce ligeiramente ao puxar para baixo. */
export function LargeTitle({
  scrollY,
  title,
  subtitle,
  accessory,
}: {
  scrollY: Animated.Value;
  title: React.ReactNode;
  subtitle?: string;
  accessory?: React.ReactNode;
}) {
  const colors = useIOSColors();
  const opacity = scrollY.interpolate({ inputRange: [0, COLLAPSE_END - 10], outputRange: [1, 0], extrapolate: "clamp" });
  const scale = scrollY.interpolate({ inputRange: [-120, 0], outputRange: [1.08, 1], extrapolate: "clamp" });

  return (
    <Animated.View style={[styles.largeTitle, { opacity, transform: [{ scale }] }]}>
      <View style={styles.largeTitleText}>
        {typeof title === "string" ? (
          <Text style={[styles.largeTitleLabel, { color: colors.text }]} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        ) : (
          title
        )}
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
      </View>
      {accessory ? <View style={styles.accessory}>{accessory}</View> : null}
    </Animated.View>
  );
}

/* Botão redondo de ícone, com um número opcional (avisos por ler, por exemplo). */
export function CircleButton({
  icon,
  onPress,
  label,
  badge,
  tint,
  elevated,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  badge?: number;
  tint?: string;
  elevated?: boolean;
}) {
  const colors = useIOSColors();
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue === 1 ? 8 : 0 }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => spring(0.88)}
      onPressOut={() => spring(1)}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          styles.circle,
          elevated && styles.circleElevated,
          { backgroundColor: colors.card, transform: [{ scale }] },
        ]}
      >
        <Ionicons name={icon} size={20} color={tint ?? colors.text} />
        {badge && badge > 0 ? (
          <View style={[styles.badge, { borderColor: colors.background }]}>
            <Text style={styles.badgeText}>{badge > 9 ? "9+" : badge}</Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/* Entrada em cascata: cada bloco sobe e aparece um pouco depois do anterior. */
export function Reveal({
  index,
  children,
  distance = 18,
}: {
  index: number;
  children: React.ReactNode;
  distance?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      delay: Math.min(index, 10) * 60,
      useNativeDriver: true,
      speed: 12,
      bounciness: 3,
    }).start();
  }, [index, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  topBarBorder: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  topBarRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  topBarSide: {
    width: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topBarRight: {
    justifyContent: "flex-end",
  },
  topBarTitle: {
    ...Typography.headline,
    flex: 1,
    textAlign: "center",
  },
  largeTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    transformOrigin: "left",
  },
  largeTitleText: {
    flex: 1,
  },
  largeTitleLabel: {
    ...Typography.largeTitle,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  subtitle: {
    ...Typography.subheadline,
    marginTop: 2,
  },
  accessory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  circleElevated: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
