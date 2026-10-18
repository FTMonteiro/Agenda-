import { notificationsRepository } from "./notifications.repository";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Must match the channel the app creates (see apps/mobile/src/services/push.ts): on
// Android it is the channel that gives the notification its sound.
const ANDROID_CHANNEL = "agendamentos";

interface ExpoPushTicket {
  status: "ok" | "error";
  details?: { error?: string };
}

// Sends one notification to every phone the user is signed in on. Best-effort: the
// notification is already stored for the bell, so a push failure is only logged. Tokens
// Expo reports as no longer registered (app uninstalled, signed out) are forgotten.
export async function sendPush(userId: string, title: string, body: string): Promise<void> {
  const tokens = await notificationsRepository.findPushTokens(userId);
  if (tokens.length === 0) return;

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(tokens.map((to) => ({ to, title, body, sound: "default", priority: "high", channelId: ANDROID_CHANNEL }))),
    });

    const json = (await response.json().catch(() => null)) as { data?: ExpoPushTicket[] } | null;
    const gone = (json?.data ?? [])
      .map((ticket, index) => (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? tokens[index] : null))
      .filter((token): token is string => token !== null);

    if (gone.length > 0) await notificationsRepository.deletePushTokens(gone);
  } catch (error) {
    console.error("Falha ao enviar notificação push:", error);
  }
}
