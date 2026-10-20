import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AppointmentDTO } from "@slotix/types";

/*
 * "Apagar histórico" das marcações. Fica guardado só neste telemóvel: a data em que a
 * pessoa apagou. As marcações já terminadas (concluídas, canceladas, faltas) até essa data
 * deixam de aparecer; as que terminarem depois voltam a aparecer normalmente. Nada é
 * apagado no servidor — o espaço continua a ter a agenda, os pagamentos e os recibos.
 */

const FINISHED = new Set(["COMPLETED", "CANCELLED", "NO_SHOW"]);

// Uma data por conta, para quem usa duas contas no mesmo telemóvel.
function storageKey(userId: string) {
  return `slotix.historyClearedAt.${userId}`;
}

export async function getHistoryClearedAt(userId: string): Promise<number | null> {
  try {
    const raw =
      Platform.OS === "web" ? (globalThis.localStorage?.getItem(storageKey(userId)) ?? null) : await SecureStore.getItemAsync(storageKey(userId));
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export async function clearHistory(userId: string): Promise<number> {
  const now = Date.now();
  if (Platform.OS === "web") globalThis.localStorage?.setItem(storageKey(userId), String(now));
  else await SecureStore.setItemAsync(storageKey(userId), String(now));
  return now;
}

export function withoutClearedHistory(appointments: AppointmentDTO[], clearedAt: number | null): AppointmentDTO[] {
  if (clearedAt === null) return appointments;
  return appointments.filter(
    (appointment) => !FINISHED.has(appointment.status) || new Date(appointment.updatedAt).getTime() > clearedAt,
  );
}
