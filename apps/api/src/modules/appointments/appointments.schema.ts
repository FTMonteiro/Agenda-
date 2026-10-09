import { z } from "zod";

export { createAppointmentSchema, rescheduleAppointmentSchema } from "@slotix/validation";

// Staff booking on behalf of a walk-in client — same shape as createAppointmentSchema
// plus walkInClientId in place of the implicit "requester is the client" of the customer flow.
export const createWalkInAppointmentSchema = z.object({
  businessId: z.string().uuid(),
  walkInClientId: z.string().uuid(),
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

export type CreateWalkInAppointmentInput = z.infer<typeof createWalkInAppointmentSchema>;
