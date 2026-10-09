import { getAvailabilitySchema } from "../../modules/availability/availability.schema";
import { commonErrors, registry, successResponse } from "../registry";
import { availabilitySlotSchema } from "../schemas";

registry.registerPath({
  method: "get",
  path: "/availability",
  tags: ["Availability"],
  summary: "Horários livres de um profissional para um serviço, num dia",
  request: { query: getAvailabilitySchema },
  responses: {
    200: successResponse(availabilitySlotSchema.array()),
    ...commonErrors,
  },
});
