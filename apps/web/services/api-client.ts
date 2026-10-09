import type { ApiResponse } from "@slotix/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export class ApiRequestError extends Error {
  constructor(public code: string, message: string, public statusCode: number) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  const body = (await response.json()) as ApiResponse<T>;

  if (!body.success) {
    throw new ApiRequestError(body.error.code, body.error.message, response.status);
  }

  return body.data;
}
