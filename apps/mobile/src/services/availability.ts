import type { AvailabilityQuery, AvailabilitySlotDTO } from "@slotix/types";
import { apiFetch, buildQuery } from "./api-client";

export async function getAvailability(query: AvailabilityQuery): Promise<AvailabilitySlotDTO[]> {
  return apiFetch<AvailabilitySlotDTO[]>(`/availability${buildQuery(query)}`);
}
