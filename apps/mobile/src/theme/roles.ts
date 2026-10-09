import { useColorScheme } from "@/hooks/use-color-scheme";

/*
 * Os ecrãs foram desenhados com cores claras fixas. Em vez de manter duas paletas por
 * ecrã, cada cor passa por uma destas funções conforme o papel que tem (fundo, texto ou
 * contorno): no tema claro devolvem a cor tal como está, no escuro devolvem a cor
 * equivalente do modo escuro do iOS. Valores que não são cores (animações, undefined)
 * passam sem alteração.
 */

export interface ThemeRoles {
  dark: boolean;
  bg: <T>(value: T) => T;
  fg: <T>(value: T) => T;
  border: <T>(value: T) => T;
  // Para listas de cores de gradientes (LinearGradient).
  bgs: <T extends readonly unknown[]>(values: T) => T;
}

type RGBA = { r: number; g: number; b: number; a: number };

function parse(value: string): RGBA | null {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(value.trim());
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3)
      digits = digits
        .split("")
        .map((d) => d + d)
        .join("");
    const n = parseInt(digits.slice(0, 6), 16);
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255,
      a: digits.length === 8 ? parseInt(digits.slice(6), 16) / 255 : 1,
    };
  }

  const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i.exec(value.trim());
  if (rgb)
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: rgb[4] === undefined ? 1 : Number(rgb[4]) };

  return null;
}

function lightnessAndSaturation({ r, g, b }: RGBA) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  const s = max === min ? 0 : l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
  return { l, s };
}

function rgba({ r, g, b }: RGBA, alpha: number): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.round(alpha * 100) / 100})`;
}

// A mesma tonalidade, mais viva e a meia luminosidade — base dos fundos coloridos suaves no escuro.
function vivid(color: RGBA): RGBA {
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  if (max === min) return color;
  const stretch = (channel: number) => ((channel - min) / (max - min)) * 235 + 10;
  return { r: stretch(color.r), g: stretch(color.g), b: stretch(color.b), a: 1 };
}

const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };
const isNeutral = (l: number, s: number) => s < 0.12 || (l > 0.9 && s < 0.35);

function darkBackground(color: RGBA): string | null {
  const { l, s } = lightnessAndSaturation(color);

  if (color.a < 1) {
    if (l > 0.9) return rgba({ r: 28, g: 28, b: 30, a: 1 }, color.a);
    if (l < 0.1 && color.a <= 0.2) return rgba(WHITE, color.a);
    return null;
  }

  if (isNeutral(l, s)) {
    if (l >= 0.985) return "#1C1C1E";
    if (l >= 0.925) return "#000000";
    if (l >= 0.875) return "#2C2C2E";
    if (l >= 0.8) return "#3A3A3C";
    if (l >= 0.6) return "#48484A";
    if (l < 0.12) return "#0A84FF";
    if (l < 0.25) return "#2C2C2E";
    return null;
  }

  return l >= 0.85 ? rgba(vivid(color), 0.22) : null;
}

function darkForeground(color: RGBA): string | null {
  const { l, s } = lightnessAndSaturation(color);

  if (color.a < 1) return l < 0.2 ? rgba(WHITE, color.a) : null;

  if (isNeutral(l, s)) {
    if (l < 0.12) return "#FFFFFF";
    if (l < 0.3) return "#EBEBF5";
    if (l < 0.45) return "#AEAEB2";
    return null;
  }

  if (l < 0.36) {
    const bright = vivid(color);
    return rgba({ r: bright.r * 0.75 + 64, g: bright.g * 0.75 + 64, b: bright.b * 0.75 + 64, a: 1 }, 1);
  }
  return null;
}

function darkBorder(color: RGBA): string | null {
  const { l, s } = lightnessAndSaturation(color);

  if (color.a < 1) {
    if (l < 0.2) return rgba(WHITE, Math.min(color.a * 1.8, 0.4));
    if (l > 0.9) return rgba(WHITE, Math.min(color.a, 0.16));
    return null;
  }

  if (isNeutral(l, s)) {
    if (l >= 0.985) return "#2C2C2E";
    if (l >= 0.8) return "#38383A";
    if (l >= 0.6) return "#48484A";
    if (l < 0.25) return "#636366";
    return null;
  }

  return l >= 0.85 ? rgba(vivid(color), 0.35) : null;
}

function darkGradientStop(color: RGBA): string | null {
  // Véus sobre imagens (pretos translúcidos) têm de continuar escuros.
  if (color.a < 1) return null;
  const { l, s } = lightnessAndSaturation(color);
  if (isNeutral(l, s) && l < 0.3) return "#0A84FF";
  return darkBackground(color);
}

function mapper(convert: (color: RGBA) => string | null) {
  const cache = new Map<string, string>();
  return <T>(value: T): T => {
    if (typeof value !== "string") return value;
    const cached = cache.get(value);
    if (cached !== undefined) return cached as T;

    const color = parse(value);
    const result = (color && convert(color)) ?? value;
    cache.set(value, result);
    return result as T;
  };
}

const identity = <T>(value: T): T => value;

const LIGHT_ROLES: ThemeRoles = { dark: false, bg: identity, fg: identity, border: identity, bgs: identity };

const darkStop = mapper(darkGradientStop);
const DARK_ROLES: ThemeRoles = {
  dark: true,
  bg: mapper(darkBackground),
  fg: mapper(darkForeground),
  border: mapper(darkBorder),
  bgs: <T extends readonly unknown[]>(values: T): T => values.map((value) => darkStop(value)) as unknown as T,
};

const styleCache = new WeakMap<object, { light?: unknown; dark?: unknown }>();

// Devolve as funções de cor do tema atual e os estilos do ecrã criados para esse tema
// (criados uma vez por tema e reutilizados).
export function useThemed<T>(createStyles: (tc: ThemeRoles) => T): { tc: ThemeRoles; styles: T } {
  const scheme = useColorScheme();
  const tc = scheme === "dark" ? DARK_ROLES : LIGHT_ROLES;

  let entry = styleCache.get(createStyles);
  if (!entry) {
    entry = {};
    styleCache.set(createStyles, entry);
  }
  if (entry[scheme] === undefined) entry[scheme] = createStyles(tc);

  return { tc, styles: entry[scheme] as T };
}

export function useThemeRoles(): ThemeRoles {
  return useColorScheme() === "dark" ? DARK_ROLES : LIGHT_ROLES;
}
