import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { ApiListResponse, ApiResponse, PaginationMeta } from "@slotix/types";

// The web build runs in a browser, so the API must allow its origin (CORS). The deployed
// API doesn't allow localhost, so while developing the web build talks to the local API
// instead; the native app keeps using EXPO_PUBLIC_API_URL.
const API_URL =
  Platform.OS === "web" && __DEV__
    ? (process.env.EXPO_PUBLIC_WEB_API_URL ?? "http://localhost:3000/api/v1")
    : (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api/v1");
const ACCESS_TOKEN_KEY = "slotix.accessToken";

let accessToken: string | null = null;

// expo-secure-store has no web implementation (every call throws there), so the web build
// keeps the token in localStorage instead.
const tokenStorage = {
  async get(): Promise<string | null> {
    if (Platform.OS !== "web") return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    try {
      return globalThis.localStorage?.getItem(ACCESS_TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  },
  async set(token: string | null): Promise<void> {
    if (Platform.OS !== "web") {
      if (token) await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
      else await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      return;
    }
    try {
      if (token) globalThis.localStorage?.setItem(ACCESS_TOKEN_KEY, token);
      else globalThis.localStorage?.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // storage unavailable (private mode, static render): the session just won't persist
    }
  },
};

export async function loadStoredAccessToken(): Promise<string | null> {
  accessToken = await tokenStorage.get();
  return accessToken;
}

export function getApiUrl(): string {
  return API_URL;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export async function setAccessToken(token: string | null): Promise<void> {
  accessToken = token;
  await tokenStorage.set(token);
}

export class ApiRequestError extends Error {
  constructor(public code: string, message: string, public statusCode: number) {
    super(message);
  }
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await request(path, options);
  const body = (await response.json()) as ApiResponse<T>;

  if (!body.success) {
    throw new ApiRequestError(body.error.code, body.error.message, response.status);
  }

  return body.data;
}

// For endpoints returning the {data, meta} paginated envelope (GET /businesses, /search,
// etc.) rather than a single item — apiFetch alone would silently drop `meta`.
export async function apiFetchList<T>(path: string, options: RequestInit = {}): Promise<{ data: T[]; meta: PaginationMeta }> {
  const response = await request(path, options);
  const body = (await response.json()) as ApiListResponse<T>;

  if (!body.success) {
    throw new ApiRequestError(body.error.code, body.error.message, response.status);
  }

  return { data: body.data, meta: body.meta };
}

// Builds a URLSearchParams-style query string, skipping undefined values so callers can
// pass a plain object of optional filters (a BusinessListQuery, SearchQuery, etc.)
// without manually filtering it first. `object` (not Record<string, ...>) as the
// parameter type so named DTO interfaces — which have no index signature — are accepted
// directly, without TS's implicit-index-signature restriction rejecting the call.
export function buildQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
    (entry): entry is [string, string | number | boolean] => entry[1] !== undefined,
  );
  if (entries.length === 0) return "";
  return `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join("&")}`;
}
