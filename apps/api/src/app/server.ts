import { env } from "../config/env";
import { registerNotificationListeners, startAppointmentReminders } from "../modules/notifications";
import { createApp } from "./app";

registerNotificationListeners();

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Agenda+ API a correr em http://localhost:${env.PORT}`);
  startAppointmentReminders();
});
