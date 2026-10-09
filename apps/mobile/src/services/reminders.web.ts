export type ReminderSync = "scheduled" | "off" | "denied" | "failed";

// O browser não agenda avisos para quando a página está fechada: na versão web os
// lembretes não existem.
export async function syncReminders(_enabled: boolean, _ask = false): Promise<ReminderSync> {
  return "off";
}
