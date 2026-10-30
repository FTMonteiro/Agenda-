
import { Platform } from 'react-native';

/*
 * Agenda+ — SISTEMA GLOBAL DE TEMA
 *
 * O aplicativo possui dois temas:
 *
 * ☀️ light → modo claro
 * 🌙 dark  → modo escuro
 *
 * O app/_layout.tsx detecta o modo do telefone
 * através do useColorScheme().
 *
 * IMPORTANTE:
 * Este é o ÚNICO arquivo de tema do projeto.
 */

/* =========================================================
   CORES
   ========================================================= */

// Base nas cores de sistema do iOS (Human Interface Guidelines), com as chaves que todos
// os ecrãs já usam. `primary` é o azul do logótipo (#1451D6), chapado, e é o
// único destaque para tudo o que se toca; os fundos agrupados ficam atrás dos cartões.
export const Colors = {
  light: {
    /* Texto (label / secondaryLabel / tertiaryLabel) */
    text: '#000000',
    textSecondary: 'rgba(60, 60, 67, 0.6)',
    textTertiary: 'rgba(60, 60, 67, 0.3)',

    /* Fundos (systemGroupedBackground e afins) */
    background: '#F5F5F2',
    backgroundSecondary: '#FFFFFF',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E5E5EA',

    /* Cor de destaque (azul da marca) */
    primary: '#1451D6',
    primaryForeground: '#FFFFFF',

    /* Estados */
    success: '#34C759',
    successBackground: 'rgba(52, 199, 89, 0.12)',

    warning: '#FF9500',
    warningBackground: 'rgba(255, 149, 0, 0.12)',

    error: '#FF3B30',
    errorBackground: 'rgba(255, 59, 48, 0.12)',

    info: '#1451D6',
    infoBackground: 'rgba(20, 81, 214, 0.12)',

    /* Separadores */
    border: 'rgba(60, 60, 67, 0.29)',
    borderStrong: '#C6C6C8',

    /* Componentes */
    card: '#FFFFFF',
    input: 'rgba(118, 118, 128, 0.12)',

    /* Overlay */
    overlay: 'rgba(0, 0, 0, 0.4)',

    /* Elementos extras */
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    divider: 'rgba(60, 60, 67, 0.29)',
    icon: '#3C3C43',
    iconSecondary: '#C7C7CC',
  },

  dark: {
    /* Texto */
    text: '#FFFFFF',
    textSecondary: 'rgba(235, 235, 245, 0.6)',
    textTertiary: 'rgba(235, 235, 245, 0.3)',

    /* Fundos */
    background: '#000000',
    backgroundSecondary: '#1C1C1E',
    backgroundElement: '#1C1C1E',
    backgroundSelected: '#2C2C2E',

    /* Cor de destaque */
    primary: '#1451D6',
    primaryForeground: '#FFFFFF',

    /* Estados */
    success: '#30D158',
    successBackground: 'rgba(48, 209, 88, 0.16)',

    warning: '#FF9F0A',
    warningBackground: 'rgba(255, 159, 10, 0.16)',

    error: '#FF453A',
    errorBackground: 'rgba(255, 69, 58, 0.16)',

    info: '#1451D6',
    infoBackground: 'rgba(20, 81, 214, 0.16)',

    /* Separadores */
    border: 'rgba(84, 84, 88, 0.6)',
    borderStrong: '#38383A',

    /* Componentes */
    card: '#1C1C1E',
    input: 'rgba(118, 118, 128, 0.24)',

    /* Overlay */
    overlay: 'rgba(0, 0, 0, 0.6)',

    /* Elementos extras */
    surface: '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    divider: 'rgba(84, 84, 88, 0.6)',
    icon: '#EBEBF5',
    iconSecondary: '#48484A',
  },
} as const;

/* =========================================================
   TIPOS DO TEMA
   ========================================================= */

export type ThemeColor =
  keyof typeof Colors.light & keyof typeof Colors.dark;

export type ThemeName = 'light' | 'dark';

/* =========================================================
   FONTES
   ========================================================= */

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },

  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-rounded',
    mono: 'monospace',
  },

  web: {
    sans: 'system-ui',
    serif: 'serif',
    rounded: 'system-ui',
    mono: 'monospace',
  },

  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

/* =========================================================
   ESPAÇAMENTOS
   ========================================================= */

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 40,
  eight: 48,
  nine: 64,
} as const;

/* =========================================================
   BORDER RADIUS
   ========================================================= */

export const Radius = {
  small: 8,
  medium: 10,
  large: 12,
  extraLarge: 16,
  pill: 999,
} as const;

/* =========================================================
   TAMANHOS
   ========================================================= */

export const Sizes = {
  iconSmall: 16,
  iconMedium: 20,
  iconLarge: 24,
  iconXLarge: 32,

  buttonHeight: 50,
  inputHeight: 44,

  avatarSmall: 32,
  avatarMedium: 40,
  avatarLarge: 48,
  avatarXLarge: 64,
} as const;

/* =========================================================
   TIPOGRAFIA
   =========================================================

   A escala de texto do iOS (Dynamic Type, tamanho "Large").
   Os títulos grandes ficam mais juntos (tracking positivo
   menor) e o texto pequeno mais espaçado, como no San Francisco.
*/

export const Typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.32 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400', letterSpacing: 0.07 },
} as const;

/* =========================================================
   SOMBRAS
   ========================================================= */

export const Shadows = {
  small: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  medium: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },

  large: {
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

/* =========================================================
   SAFE AREA / TABS
   ========================================================= */

export const BottomTabInset =
  Platform.select({
    ios: 50,
    android: 80,
    default: 0,
  }) ?? 0;

/* =========================================================
   LARGURA MÁXIMA
   ========================================================= */

export const MaxContentWidth = 800;

