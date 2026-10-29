import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useT } from "@/i18n";

import type { ScrollViewInstance } from "react-native";
const HEIGHT = 410;
const SLIDE_MS = 4500;

interface PhotoCarouselProps {
  photos: string[];
  name: string;
  location: string | null;
  // A avaliação do espaço: quantas pessoas o têm nos favoritos.
  likes: number;
  favorite: boolean;
  onFavorite: () => void;
}

/*
 * Carrossel das fotos do espaço (a galeria carregada no painel).
 *
 * - As fotos deslizam por baixo; o nome, os gostos e o coração ficam fixos por cima,
 *   desenhados uma só vez (não em cada foto), por isso nada pisca ao trocar.
 * - A largura é a do próprio carrossel, medida no ecrã, e não a da janela no arranque.
 * - Avança sozinho; as barras no fundo enchem-se como um temporizador. Enquanto a
 *   pessoa arrasta, o avanço automático pára e recomeça quando larga.
 */
export function PhotoCarousel({ photos, name, location, likes, favorite, onFavorite }: PhotoCarouselProps) {
  const t = useT();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const scrollRef = useRef<ScrollViewInstance>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const heart = useRef(new Animated.Value(1)).current;

  const count = photos.length;

  // Se a galeria mudar (fotos removidas), não fica preso num índice que já não existe.
  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  const goTo = useCallback(
    (next: number, animated = true) => {
      if (width === 0) return;
      scrollRef.current?.scrollTo({ x: next * width, animated });
      setIndex(next);
    },
    [width],
  );

  // Temporizador da foto atual: quando a barra enche, passa à seguinte.
  useEffect(() => {
    if (count <= 1 || paused || width === 0) return;

    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: SLIDE_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) goTo((index + 1) % count);
    });

    return () => animation.stop();
  }, [index, count, paused, width, progress, goTo]);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next !== width) setWidth(next);
  };

  // Ao rodar o ecrã ou redimensionar, mantém a mesma foto alinhada.
  useEffect(() => {
    if (width > 0) scrollRef.current?.scrollTo({ x: index * width, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width === 0) return;
    setIndex(Math.max(0, Math.min(count - 1, Math.round(event.nativeEvent.contentOffset.x / width))));
    setPaused(false);
  };

  const pressFavorite = () => {
    Animated.sequence([
      Animated.spring(heart, { toValue: 0.75, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(heart, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 14 }),
    ]).start();
    onFavorite();
  };

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      {count === 0 ? (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Ionicons name="storefront-outline" size={48} color="rgba(255,255,255,0.45)" />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          bounces={false}
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => setPaused(true)}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={(event) => {
            // Sem inércia (arrasto muito curto) não há "momentum end": retoma aqui.
            if (!event.nativeEvent.velocity || Math.abs(event.nativeEvent.velocity.x) < 0.05) onScrollEnd(event);
          }}
        >
          {photos.map((uri, position) => (
            <View key={`${position}-${uri.slice(-24)}`} style={{ width, height: HEIGHT }}>
              <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
            </View>
          ))}
        </ScrollView>
      )}

      {/* Tudo o que fica por cima das fotos, fixo. */}
      <LinearGradient
        pointerEvents="none"
        colors={["rgba(0,0,0,0.25)", "rgba(0,0,0,0)", "rgba(0,0,0,0.15)", "rgba(0,0,0,0.75)"]}
        locations={[0, 0.25, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        onPress={pressFavorite}
        style={styles.favoriteButton}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={favorite ? t("Remover dos favoritos") : t("Adicionar aos favoritos")}
      >
        <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
        <Animated.View style={{ transform: [{ scale: heart }] }}>
          <Ionicons name={favorite ? "heart" : "heart-outline"} size={21} color={favorite ? "#FF3B30" : "#FFFFFF"} />
        </Animated.View>
      </Pressable>

      {count > 1 ? (
        <View style={styles.counter} pointerEvents="none">
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          <Ionicons name="images" size={12} color="#FFFFFF" />
          <Text style={styles.counterText}>
            {index + 1}/{count}
          </Text>
        </View>
      ) : null}

      <View style={styles.bottom} pointerEvents="none">
        <View style={styles.bottomText}>
          {location ? (
            <Text style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          ) : null}
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
        </View>

        {likes > 0 ? (
          <View style={styles.rating}>
            <Ionicons name="heart" size={14} color="#FF375F" />
            <Text style={styles.ratingText}>{likes}</Text>
          </View>
        ) : null}
      </View>

      {count > 1 ? (
        <View style={styles.indicators} pointerEvents="none">
          {photos.map((_, position) => (
            <View key={position} style={styles.indicator}>
              {position < index ? <View style={[styles.indicatorFill, styles.indicatorFull]} /> : null}
              {position === index ? (
                <Animated.View
                  style={[
                    styles.indicatorFill,
                    { width: paused ? "100%" : progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) },
                  ]}
                />
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    height: HEIGHT,
    overflow: "hidden",
    backgroundColor: "#1C1C1E",
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  counter: {
    position: "absolute",
    top: 28,
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  counterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottom: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  bottomText: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  location: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: 0.36,
  },
  rating: {
    height: 34,
    paddingHorizontal: 11,
    borderRadius: 17,
    backgroundColor: "rgba(17,17,17,0.55)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  ratingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  indicators: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 18,
    flexDirection: "row",
    gap: 5,
  },
  indicator: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  indicatorFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },
  indicatorFull: {
    width: "100%",
  },
});
