import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { listMyAppointments } from "./appointments";
import { getBusiness } from "./businesses";
import { translate, dateLocale } from "@/i18n";

// Os lembretes são avisos agendados no próprio telemóvel (não dependem do servidor nem de
// internet na hora do aviso): um na véspera e outro uma hora antes de cada marcação.
const LEAD_TIMES: { minutes: number; text: string }[] = [
  { minutes: 24 * 60, text: "amanhã" },
  { minutes: 60, text: "daqui a 1 hora" },
];

const CHANNEL = "lembretes";

// Com a app aberta o aviso também aparece, em vez de ficar só na lista do sistema.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const timeOf = (date: Date) => new Intl.DateTimeFormat(dateLocale(), { hour: "2-digit", minute: "2-digit" }).format(date);

async function allowed(ask: boolean): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export type ReminderSync = "scheduled" | "off" | "denied" | "failed";

/**
 * Põe os lembretes no telemóvel de acordo com as marcações atuais: apaga os que estavam
 * agendados e agenda de novo os das marcações futuras (pendentes ou confirmadas). Chamar
 * sempre que as marcações mudam ou a opção é ligada/desligada.
 *
 * `ask` pede a autorização de notificações se ainda não foi dada — só quando é a pessoa
 * que acaba de ligar a opção, nunca em segundo plano.
 */
export async function syncReminders(enabled: boolean, ask = false): Promise<ReminderSync> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return "off";
    if (!(await allowed(ask))) return "denied";

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: translate("Lembretes de marcações"),
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const now = Date.now();
    const upcoming = (await listMyAppointments()).filter(
      (appointment) =>
        (appointment.status === "PENDING" || appointment.status === "CONFIRMED") &&
        new Date(appointment.scheduledAt).getTime() > now,
    );

    const names = new Map<string, string>();
    for (const appointment of upcoming) {
      if (!names.has(appointment.businessId)) {
        names.set(appointment.businessId, await getBusiness(appointment.businessId).then((business) => business.name).catch(() => translate("o seu espaço")));
      }

      const when = new Date(appointment.scheduledAt);
      for (const lead of LEAD_TIMES) {
        const date = new Date(when.getTime() - lead.minutes * 60_000);
        if (date.getTime() <= now) continue;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: translate("Lembrete de marcação"),
            body: translate("Tem uma marcação em {0} {1}, às {2}.", [names.get(appointment.businessId), translate(lead.text), timeOf(when)]),
            data: { appointmentId: appointment.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
        });
      }
    }

    return "scheduled";
  } catch {
    return "failed";
  }
}
