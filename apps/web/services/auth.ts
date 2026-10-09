import type { LoginRequest, LoginResponse, RegisterRequest } from "@slotix/types";
import { apiFetch, setAccessToken } from "./api-client";

export async function login(input: LoginRequest): Promise<LoginResponse> {
  const result = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAccessToken(result.accessToken);
  return result;
}

export async function register(input: RegisterRequest): Promise<LoginResponse> {
  const result = await apiFetch<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAccessToken(result.accessToken);
  return result;
}
