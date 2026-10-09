import type { UpdateProfileRequest, UserDTO } from "@slotix/types";
import { apiFetch } from "./api-client";

export async function getMe(): Promise<UserDTO> {
  return apiFetch<UserDTO>("/users/me");
}

export async function updateMe(input: UpdateProfileRequest): Promise<UserDTO> {
  return apiFetch<UserDTO>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// Guarda no servidor a posição atual da pessoa (lida do GPS, com a autorização dela). É
// com ela que o servidor calcula a distância aos espaços quando um pedido chega sem
// coordenadas. Falhar aqui nunca impede nada: devolve só se ficou guardada.
export async function saveMyLocation(position: { latitude: number; longitude: number }): Promise<boolean> {
  try {
    await apiFetch<UserDTO>("/users/me/location", { method: "PUT", body: JSON.stringify(position) });
    return true;
  } catch {
    return false;
  }
}

// Apaga a conta no servidor: deixa de ser possível entrar com ela. As marcações já feitas
// continuam no histórico dos espaços.
export async function deleteMyAccount(): Promise<void> {
  await apiFetch<{ deleted: boolean }>("/users/me", { method: "DELETE" });
}

// Termina as sessões da conta guardadas no servidor (todos os dispositivos).
export async function logoutEverywhere(): Promise<void> {
  await apiFetch<{ loggedOut: boolean }>("/auth/logout", { method: "POST" });
}
