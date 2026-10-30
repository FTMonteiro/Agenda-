import { isoDateTime } from "@slotix/validation";
import { z } from "zod";

export { createAppointmentSchema, rescheduleAppointmentSchema } from "@slotix/validation";

// Staff booking on behalf of a client — same shape as createAppointmentSchema plus who
// it's for, in place of the implicit "requester is the client" of the customer flow:
// walkInClientId for someone registered by hand, clientId for an app user who is a
// client of the space. Exactly one of the two.
export const createWalkInAppointmentSchema = z
  .object({
    businessId: z.guid(),
    walkInClientId: z.guid().optional(),
    clientId: z.guid().optional(),
    serviceId: z.guid(),
    professionalId: z.guid(),
    scheduledAt: isoDateTime,
    notes: z.string().max(1000).optional(),
  })
  .refine((input) => Boolean(input.walkInClientId) !== Boolean(input.clientId), {
    message: "Indique o cliente.",
    path: ["walkInClientId"],
  });

export type CreateWalkInAppointmentInput = z.infer<typeof createWalkInAppointmentSchema>;
