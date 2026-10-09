const UNITS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export default function ms(duration: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Formato de duração inválido: "${duration}"`);
  }

  const [, value, unit] = match;
  return Number(value) * UNITS[unit];
}
