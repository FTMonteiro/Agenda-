import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET é obrigatória"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET é obrigatória"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  WEB_URL: z.string().optional(),
  // Extra browser origins allowed by CORS, comma-separated (see app.ts).
  CORS_ORIGINS: z.string().optional(),
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

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Falha ao validar as variáveis de ambiente no arranque.");
}

export const env = parsed.data;
