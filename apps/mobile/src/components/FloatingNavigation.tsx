import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { usePathname, useRouter } from "expo-router";

import { tapFeedback } from "@/services/haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useIOSColors } from "@/components/ios";
import { UserAvatar } from "@/components/UserAvatar";
import { useT } from "@/i18n";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

type Item = {
  route: string;
  label: string;
  icon: IconName;
  activeIcon: IconName;
};

const ITEMS: Item[] = [
  { route: "/", label: "Início", icon: "home-outline", activeIcon: "home" },
  { route: "/explore", label: "Explorar", icon: "compass-outline", activeIcon: "compass" },
  { route: "/favorites", label: "Favoritos", icon: "heart-outline", activeIcon: "heart" },
  { route: "/profile", label: "Perfil", icon: "person-outline", activeIcon: "person" },
];

// Como no iOS, o menu só aparece nos ecrãs de topo de cada separador; os ecrãs
// empilhados por cima (marcação, definições do perfil...) ocupam o ecrã todo.
// "/marcar" já não tem separador, mas continua a ser um ecrã de topo (chega-se a ele a
// partir das marcações), por isso o menu mantém-se lá.
export const TAB_ROUTES = [...ITEMS.map((item) => item.route), "/marcar"];

const BAR_HEIGHT = 66;
const BAR_PADDING = 6;
// A barra tem a largura dos separadores, não a do ecrã: uma cápsula compacta ao centro,
// com os separadores juntos.
const TAB_WIDTH = 74;
const BAR_WIDTH = TAB_WIDTH * ITEMS.length + BAR_PADDING * 2;
const BUBBLE_HEIGHT = BAR_HEIGHT - BAR_PADDING * 2;

function activeIndexOf(pathname: string) {
  // -1 num ecrã de topo sem separador próprio: nenhum fica escolhido.
  return ITEMS.findIndex((item) => pathname === item.route || (item.route === "/" && pathname === "/index"));
}

type TabProps = {
  item: Item;
  active: boolean;
  onPress: () => void;
};

// Encolhe no instante do toque (press-in) e volta com uma mola, como os controlos do sistema.
// O ícone do separador escolhido cresce um pouco, com um salto de mola ao ser escolhido.
const Tab = memo(function Tab({ item, active, onPress }: TabProps) {
  const t = useT();
  const colors = useIOSColors();
  const isDark = useColorScheme() === "dark";
  const scale = useRef(new Animated.Value(1)).current;
  const chosen = useRef(new Animated.Value(active ? 1 : 0)).current;
  const tint = active ? colors.primary : isDark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.62)";

  useEffect(() => {
    Animated.spring(chosen, { toValue: active ? 1 : 0, useNativeDriver: true, speed: 16, bounciness: 14 }).start();
  }, [active, chosen]);

  const springTo = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue === 1 ? 8 : 0 }).start();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={t(item.label)}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={() => springTo(0.88)}
      onPressOut={() => springTo(1)}
      style={styles.tab}
    >
      <Animated.View style={[styles.tabContent, { transform: [{ scale }] }]}>
        <Animated.View style={{ transform: [{ scale: chosen.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] }}>
          {item.route === "/profile" ? (
            <View style={[styles.avatarRing, { borderColor: active ? colors.primary : "transparent" }]}>
              <UserAvatar size={22} />
            </View>
          ) : (
            <Ionicons name={active ? item.activeIcon : item.icon} size={23} color={tint} />
          )}
        </Animated.View>
        <Text style={[styles.label, { color: tint, fontWeight: active ? "600" : "500" }]} numberOfLines={1}>
          {t(item.label)}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

// Menu flutuante de vidro: uma cápsula translúcida solta do fundo do ecrã, com o
// conteúdo a passar por baixo, um reflexo de luz no topo e uma "gota" de vidro que
// desliza até ao separador escolhido e se estica ligeiramente durante o movimento.
export default function FloatingNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";

  const activeIndex = activeIndexOf(pathname);
  const [tabWidth, setTabWidth] = useState(0);

  const position = useRef(new Animated.Value(activeIndex)).current;
  const stretch = useRef(new Animated.Value(1)).current;
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entrance, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 6 }).start();
  }, [entrance]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(position, { toValue: activeIndex, useNativeDriver: true, speed: 14, bounciness: 7 }),
      Animated.sequence([
        Animated.timing(stretch, { toValue: 1.22, duration: 120, useNativeDriver: true }),
        Animated.spring(stretch, { toValue: 1, useNativeDriver: true, speed: 10, bounciness: 10 }),
      ]),
    ]).start();
  }, [activeIndex, position, stretch]);

  const onLayout = (event: LayoutChangeEvent) => {
    setTabWidth((event.nativeEvent.layout.width - BAR_PADDING * 2) / ITEMS.length);
  };

  const navigate = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      tapFeedback();
      router.replace(ITEMS[index].route as never);
    },
    [activeIndex, router],
  );

  const bottom = Math.max(insets.bottom, Platform.OS === "web" ? 12 : 10) + 4;

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.position,
          {
            bottom,
            opacity: entrance,
            transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
          },
        ]}
      >
        <View style={[styles.shadow, { shadowOpacity: isDark ? 0.5 : 0.16 }]}>
          <View style={styles.glass} onLayout={onLayout}>
            <BlurView
              intensity={isDark ? 60 : 70}
              tint={isDark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDark ? "rgba(28, 28, 30, 0.42)" : "rgba(255, 255, 255, 0.46)" },
              ]}
            />
            {/* Reflexo de luz na metade de cima, como uma superfície de vidro. */}
            <LinearGradient
              pointerEvents="none"
              colors={
                isDark
                  ? ["rgba(255,255,255,0.14)", "rgba(255,255,255,0)"]
                  : ["rgba(255,255,255,0.75)", "rgba(255,255,255,0)"]
              }
              style={styles.sheen}
            />

            {tabWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.bubble,
                  {
                    width: tabWidth,
                    // Sem separador escolhido (-1), a gota some-se.
                    opacity: position.interpolate({ inputRange: [-1, 0], outputRange: [0, 1], extrapolate: "clamp" }),
                    backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.7)",
                    borderColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.95)",
                    transform: [
                      {
                        translateX: position.interpolate({
                          inputRange: [0, ITEMS.length - 1],
                          outputRange: [0, tabWidth * (ITEMS.length - 1)],
                        }),
                      },
                      { scaleX: stretch },
                      { scaleY: stretch.interpolate({ inputRange: [1, 1.22], outputRange: [1, 0.92] }) },
                    ],
                  },
                ]}
              />
            ) : null}

            <View style={styles.tabs}>
              {ITEMS.map((item, index) => (
                <Tab key={item.route} item={item} active={index === activeIndex} onPress={() => navigate(index)} />
              ))}
            </View>

            {/* Contorno fino e claro: a aresta do vidro a apanhar a luz. */}
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.rim,
                { borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.85)" },
              ]}
            />
          </View>

        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  position: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  shadow: {
    width: BAR_WIDTH,
    maxWidth: "100%",
    borderRadius: BAR_HEIGHT / 2,
    borderCurve: "continuous",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 14,
  },
  glass: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderCurve: "continuous",
    overflow: "hidden",
    padding: BAR_PADDING,
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT / 2,
  },
  rim: {
    borderRadius: BAR_HEIGHT / 2,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  bubble: {
    position: "absolute",
    top: BAR_PADDING,
    left: BAR_PADDING,
    bottom: BAR_PADDING,
    borderRadius: BUBBLE_HEIGHT / 2,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth * 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tabs: {
    flex: 1,
    flexDirection: "row",
  },
  tab: {
    flex: 1,
  },
  avatarRing: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 1,
  },
  tabContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.1,
  },
});
