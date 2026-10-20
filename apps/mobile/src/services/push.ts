import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { apiFetch } from "./api-client";
import { translate } from "@/i18n";

// O mesmo canal que a API usa ao enviar (pushNotifications.ts): no Android é o canal que
// dá som e o aviso por cima do ecrã.
const CHANNEL = "agendamentos";

// Com a ligação em tempo real aberta (realtime.ts), os avisos chegam por ela e são
// mostrados na hora como notificação local; o push do mesmo aviso, que chega uns segundos
// depois, fica então só na lista do sistema, para não tocar duas vezes.
let realtimeActive = false;

export function setRealtimeActive(active: boolean): void {
  realtimeActive = active;
}

// Com a app aberta o aviso também aparece e toca, em vez de ficar só na lista do sistema.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const trigger = notification.request.trigger;
    const duplicate = realtimeActive && trigger !== null && "type" in trigger && trigger.type === "push";
    return {
      shouldPlaySound: !duplicate,
      shouldSetBadge: false,
      shouldShowBanner: !duplicate,
      shouldShowList: true,
    };
  },
});

/**
 * Mostra já, por cima do ecrã e com som, um aviso que chegou pela ligação em tempo real.
 */
export async function showLocalNotification(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: "default" },
      trigger: Platform.OS === "android" ? { channelId: CHANNEL } : null,
    });
  } catch {
    // Sem autorização de notificações: o aviso continua na lista de notificações da app.
  }
}

let registeredToken: string | null = null;

/**
 * Liga este telemóvel à conta, para receber os avisos do espaço (agendamento confirmado,
 * cancelado...) com som, mesmo com a app fechada. Pede a autorização de notificações na
 * primeira vez. Sem autorização, num emulador ou sem ligação não faz nada: os avisos
 * continuam na lista de notificações da app.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: translate("Agendamentos"),
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) {
      permission = await Notifications.requestPermissionsAsync();
    }
    if (!permission.granted) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);

    await apiFetch<{ registered: boolean }>("/notifications/push-token", { method: "POST", body: JSON.stringify({ token }) });
    registeredToken = token;
  } catch (error) {
    console.warn("Não foi possível ativar as notificações push:", error);
  }
}

// Ao sair da conta este telemóvel deixa de receber os avisos dela.
export async function unregisterFromPush(): Promise<void> {
  if (!registeredToken) return;

  const token = registeredToken;
  registeredToken = null;
  await apiFetch("/notifications/push-token", { method: "DELETE", body: JSON.stringify({ token }) }).catch(() => undefined);
}
