import { isoDateTime } from "@slotix/validation";
import { z } from "zod";

export { createAppointmentSchema, rescheduleAppointmentSchema } from "@slotix/validation";

// Staff booking on behalf of a walk-in client — same shape as createAppointmentSchema
// plus walkInClientId in place of the implicit "requester is the client" of the customer flow.
export const createWalkInAppointmentSchema = z.object({
  businessId: z.guid(),
  walkInClientId: z.guid(),
  serviceId: z.guid(),
  professionalId: z.guid(),
  scheduledAt: isoDateTime,
  notes: z.string().max(1000).optional(),
});

export type CreateWalkInAppointmentInput = z.infer<typeof createWalkInAppointmentSchema>;
