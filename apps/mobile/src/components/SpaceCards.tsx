import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { BusinessDTO } from '@slotix/types';
import { formatDistance, formatLocation } from '@slotix/types';

import { useIOSColors } from '@/components/ios';
import { Typography } from '@/constants/theme';
import { translate, useT } from "@/i18n";

/*
 * Cartões de espaço reutilizados na Home, no Explorar e nos Favoritos, ao estilo da
 * App Store: imagem grande com cantos contínuos, texto curto e hierarquia por peso.
 * Todos encolhem ligeiramente no instante do toque.
 */

// A cor das estrelas em toda a app.
export const STAR_COLOR = '#F5A623';

// A nota média do espaço, de 1 a 5 estrelas, com o número de avaliações: "★ 4.8 (12)".
export function starsText(space: BusinessDTO): string | null {
  return space.ratingAvg !== null && space.ratingCount > 0
    ? `★ ${space.ratingAvg.toFixed(1)} (${space.ratingCount})`
    : null;
}

// A linha de resumo dos cartões: as estrelas (a avaliação) e os favoritos (os gostos),
// "★ 4.8 (12)  ·  ♥ 8". Sem nenhum dos dois, o espaço é "Novo".
export function ratingLabel(space: BusinessDTO): string {
  const parts = [starsText(space), space.favoriteCount > 0 ? `♥ ${space.favoriteCount}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join('  ·  ') : translate('Novo');
}

// Onde o espaço fica, em poucas palavras: "Talatona, Luanda". Sem zona marcada no mapa
// fica a morada que o dono escreveu, que costuma dizê-la.
export function placeText(space: BusinessDTO): string | null {
  const zona = space.bairro ?? space.municipio;
  if (zona) return formatLocation({ bairro: zona, provincia: space.provincia });
  return space.address ?? space.provincia ?? null;
}

function usePressScale(to = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (toValue: number) =>
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 40, bounciness: toValue === 1 ? 6 : 0 }).start();
  return { scale, onPressIn: () => spring(to), onPressOut: () => spring(1) };
}

function Placeholder({ size = 34 }: { size?: number }) {
  const colors = useIOSColors();
  return (
    <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: colors.backgroundSelected }]}>
      <Ionicons name="storefront-outline" size={size} color={colors.textTertiary} />
    </View>
  );
}

function FavoriteButton({ favorite, onPress, glass }: { favorite: boolean; onPress: () => void; glass?: boolean }) {
  const t = useT();
  const colors = useIOSColors();
  const pop = useRef(new Animated.Value(1)).current;

  const press = () => {
    Animated.sequence([
      Animated.spring(pop, { toValue: 0.7, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 14 }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      onPress={press}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={favorite ? t("Remover dos favoritos") : t("Adicionar aos favoritos")}
    >
      <Animated.View style={[glass && styles.glassButton, { transform: [{ scale: pop }] }]}>
        {glass ? <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} /> : null}
        <Ionicons
          name={favorite ? 'heart' : 'heart-outline'}
          size={glass ? 18 : 22}
          color={favorite ? '#FF3B30' : glass ? '#FFFFFF' : colors.textTertiary}
        />
      </Animated.View>
    </Pressable>
  );
}

/* Cartão de destaque grande, com o texto sobre a imagem. */
export function HeroSpaceCard({
  space,
  width,
  height,
  favorite,
  onFavorite,
  onPress,
  eyebrow,
  parallax,
}: {
  space: BusinessDTO;
  width: number;
  height: number;
  favorite: boolean;
  onFavorite: () => void;
  onPress: () => void;
  eyebrow?: string;
  // Deslocamento horizontal da fotografia dentro do cartão (efeito de profundidade no carrossel).
  parallax?: Animated.AnimatedInterpolation<number>;
}) {
  const t = useT();
  const press = usePressScale(0.98);
  const place = placeText(space);

  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} accessibilityRole="button">
      <Animated.View style={[styles.hero, { width, height, transform: [{ scale: press.scale }] }]}>
        {space.imageUrl ? (
          // A fotografia é um pouco mais larga do que o cartão, para poder deslizar sem mostrar as bordas.
          <Animated.View style={[styles.heroImage, parallax ? { transform: [{ translateX: parallax }] } : null]}>
            <Image source={{ uri: space.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
          </Animated.View>
        ) : (
          <Placeholder size={44} />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.78)']}
          locations={[0, 0.25, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.heroTop}>
          {eyebrow ? (
            <View style={styles.heroChip}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <Text style={styles.heroChipText}>{eyebrow}</Text>
            </View>
          ) : (
            <View />
          )}
          <FavoriteButton favorite={favorite} onPress={onFavorite} glass />
        </View>

        <View style={styles.heroBottom}>
          {space.category ? <Text style={styles.heroCategory}>{t(space.category).toUpperCase()}</Text> : null}
          <Text style={styles.heroTitle} numberOfLines={2}>
            {space.name}
          </Text>
          <Text style={styles.heroMeta} numberOfLines={1}>
            {ratingLabel(space)}
            {place ? `  ·  ${place}` : ''}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* Cartão para filas horizontais (imagem em cima, texto em baixo). */
export function SpaceTile({
  space,
  width = 220,
  favorite,
  onFavorite,
  onPress,
}: {
  space: BusinessDTO;
  width?: number;
  favorite: boolean;
  onFavorite: () => void;
  onPress: () => void;
}) {
  const t = useT();
  const colors = useIOSColors();
  const press = usePressScale();
  const place = placeText(space);

  return (
    <Pressable onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} accessibilityRole="button">
      <Animated.View style={{ width, transform: [{ scale: press.scale }] }}>
        <View style={[styles.tileImage, { height: width * 0.72 }]}>
          {space.imageUrl ? (
            <Image source={{ uri: space.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
          ) : (
            <Placeholder />
          )}
          <View style={styles.tileFavorite}>
            <FavoriteButton favorite={favorite} onPress={onFavorite} glass />
          </View>
          {space.distanceKm !== null ? (
            <View style={styles.tileDistance}>
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <Ionicons name="location" size={11} color="#FFFFFF" />
              <Text style={styles.tileDistanceText}>{formatDistance(space.distanceKm)}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.tileTitle, { color: colors.text }]} numberOfLines={1}>
          {space.name}
        </Text>
        <Text style={[styles.tileMeta, { color: colors.textSecondary }]} numberOfLines={1}>
          {ratingLabel(space)}
          {space.category ? `  ·  ${t(space.category)}` : ''}
        </Text>
        {place ? (
          <Text style={[styles.tileMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {place}
          </Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/* Linha de lista agrupada (miniatura, texto, coração). */
export function SpaceRow({
  space,
  favorite,
  onFavorite,
  onPress,
  subtitle,
  rank,
}: {
  space: BusinessDTO;
  favorite: boolean;
  onFavorite: () => void;
  onPress: () => void;
  subtitle?: string;
  // Posição numa lista ordenada ("Mais bem avaliados"), mostrada antes da miniatura.
  rank?: number;
}) {
  const t = useT();
  const colors = useIOSColors();

  const details = [
    ratingLabel(space),
    space.distanceKm !== null ? formatDistance(space.distanceKm) : null,
    t(space.category),
  ].filter(Boolean);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={space.name}>
      {({ pressed }) => (
        <View style={[styles.row, pressed && { backgroundColor: colors.backgroundSelected }]}>
          {rank !== undefined ? (
            <Text style={[styles.rowRank, { color: rank <= 3 ? colors.text : colors.textTertiary }]}>{rank}</Text>
          ) : null}
          <View style={styles.rowImage}>
            {space.imageUrl ? (
              <Image source={{ uri: space.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            ) : (
              <Placeholder size={22} />
            )}
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
              {space.name}
            </Text>
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {subtitle ?? placeText(space) ?? t("Sem morada")}
            </Text>
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              {details.join('  ·  ')}
            </Text>
          </View>
          <FavoriteButton favorite={favorite} onPress={onFavorite} />
        </View>
      )}
    </Pressable>
  );
}

/* Grupo de linhas com separadores recuados, como uma lista agrupada do iOS. */
export function RowGroup({ children }: { children: React.ReactNode[] }) {
  const colors = useIOSColors();
  return (
    <View style={[styles.group, { backgroundColor: colors.card }]}>
      {children.map((child, index) => (
        <View key={index}>
          {child}
          {index < children.length - 1 ? <View style={[styles.separator, { backgroundColor: colors.divider }]} /> : null}
        </View>
      ))}
    </View>
  );
}

/* Cabeçalho de secção ao estilo da App Store: título à esquerda, "Ver tudo" à direita. */
export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useIOSColors();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionTitleText, { color: colors.text }]}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          {({ pressed }) => <Text style={[styles.sectionAction, { color: colors.primary, opacity: pressed ? 0.4 : 1 }]}>{action}</Text>}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -40,
    right: -40,
  },
  hero: {
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  heroChip: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  heroChipText: {
    ...Typography.caption1,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  heroBottom: {
    padding: 18,
    gap: 3,
  },
  heroCategory: {
    ...Typography.caption1,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  heroTitle: {
    ...Typography.title1,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: '#FFFFFF',
  },
  heroMeta: {
    ...Typography.subheadline,
    color: 'rgba(255,255,255,0.85)',
  },
  tileImage: {
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    marginBottom: 8,
  },
  tileFavorite: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  tileDistance: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  tileDistanceText: {
    ...Typography.caption2,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tileTitle: {
    ...Typography.headline,
  },
  tileMeta: {
    ...Typography.footnote,
    marginTop: 1,
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowRank: {
    ...Typography.title3,
    fontWeight: '700',
    width: 18,
    textAlign: 'center',
  },
  rowImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    ...Typography.headline,
  },
  rowSubtitle: {
    ...Typography.subheadline,
  },
  rowMeta: {
    ...Typography.footnote,
  },
  group: {
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 92,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleText: {
    ...Typography.title2,
  },
  sectionAction: {
    ...Typography.body,
  },
});
