import { env } from "../config/env";
import { registerNotificationListeners, startAppointmentReminders } from "../modules/notifications";
import { registerRealtimeListeners } from "../modules/realtime";
import { createApp } from "./app";

registerNotificationListeners();
registerRealtimeListeners();

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Agenda+ API a correr em http://localhost:${env.PORT}`);
  startAppointmentReminders();
});
