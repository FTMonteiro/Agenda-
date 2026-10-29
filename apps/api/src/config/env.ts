import "dotenv/config";
import { z } from "zod";

// Missing (or blank, see parseEnv) required variables say so by name.
function requiredString(name: string) {
  const message = `${name} é obrigatória`;
  return z.string({ error: (issue) => (issue.input === undefined ? message : undefined) }).min(1, message);
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: requiredString("DATABASE_URL"),
  JWT_ACCESS_SECRET: requiredString("JWT_ACCESS_SECRET"),
  JWT_REFRESH_SECRET: requiredString("JWT_REFRESH_SECRET"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  // Optional: the key for the OAuth browser flows' short-lived state/handoff tokens. Without
  // it one is derived from JWT_ACCESS_SECRET (still a different key; see utils/jwt.ts).
  JWT_OAUTH_SECRET: z.string().min(32).optional(),
  WEB_URL: z.string().optional(),
  // Extra browser origins allowed by CORS, comma-separated (see app.ts).
  CORS_ORIGINS: z.string().optional(),
  // Behind a reverse proxy / load balancer: how many hops to trust for the client's IP
  // (X-Forwarded-For), e.g. "1". Unset = the socket's address is the client's. Used by the
  // per-IP request limits; never set it when the API is reachable without the proxy.
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).optional(),
  // The Swagger docs (/api/v1/docs) are off in production unless this is "true".
  ENABLE_API_DOCS: z.enum(["true", "false"]).optional(),
  // Shared with the web dashboard's server (never the browser): it signs the requests it
  // forwards, so the API can trust the end user's IP it reports. See shared/internalProxy.ts.
  INTERNAL_PROXY_SECRET: z.string().min(32).optional(),
  MOBILE_APP_SCHEME: z.string().optional(),
  // The clients' time zone: decides what "today" and "tomorrow" mean in the appointment
  // reminders, and the hour written in them (the server itself runs in UTC).
  APP_TIMEZONE: z.string().default("Africa/Luanda"),
  // Optional: without these the API boots normally and only "Continuar com Google" fails
  // (GOOGLE_NOT_CONFIGURED). OAuth client of type "Web application" in Google Cloud.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // The address the phone's browser reaches this API at, when it can't be read from the
  // request (behind a proxy that rewrites Host). Used for Google's redirect in the app flow.
  API_PUBLIC_URL: z.string().optional(),
  // "Sign in with Apple": who the identity tokens must have been issued for — the iOS
  // bundle id (comma-separated if there are several).
  APPLE_CLIENT_IDS: z.string().default("com.nevrix.slotix"),
  // Apple on Android has no native sign-in: it goes through Apple's web page, which needs
  // a "Services ID" (Apple Developer → Identifiers). Without it only the iPhone flow works.
  APPLE_SERVICE_ID: z.string().optional(),
  // Optional: the app boots fine without these, only Gallery uploads need them.
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default("slotix-gallery"),
  // Geocoding (OpenStreetMap). The public Nominatim server needs no key, but its usage
  // policy requires the application to identify itself — see modules/geo.
  NOMINATIM_URL: z.string().default("https://nominatim.openstreetmap.org"),
  NOMINATIM_USER_AGENT: z.string().default("AgendaPlus/1.0"),
  NOMINATIM_EMAIL: z.string().optional(),
  // Where the list of Angola's provinces is read from (OpenStreetMap, via Overpass).
  OVERPASS_URL: z.string().default("https://overpass-api.de/api/interpreter"),
});

export type Env = z.infer<typeof envSchema>;

// A variable set to an empty string (`ENABLE_API_DOCS=` in a .env file, a blank field in a
// hosting panel) means "not set": optional ones fall back to their default, required ones
// still fail as missing. Only explicitly invalid values stop the boot.
export function parseEnv(source: Record<string, string | undefined>) {
  const cleaned = Object.fromEntries(Object.entries(source).map(([key, value]) => [key, value?.trim() === "" ? undefined : value]));
  return envSchema.safeParse(cleaned);
}

const parsed = parseEnv(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Falha ao validar as variáveis de ambiente no arranque.");
}

export const env = parsed.data;

// Warnings rather than a refusal to boot, so an existing deployment keeps running: but a
// shared or short secret weakens every token this API signs.
if (env.NODE_ENV === "production") {
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    console.warn("[segurança] JWT_ACCESS_SECRET e JWT_REFRESH_SECRET são iguais: defina segredos diferentes.");
  }
  if (env.JWT_ACCESS_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32) {
    console.warn("[segurança] Os segredos JWT devem ter pelo menos 32 caracteres aleatórios.");
  }
}
