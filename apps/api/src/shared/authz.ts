import { AuthorizationError } from "./errors";
import { getBusinessOrThrow } from "../modules/businesses";
import { professionalsRepository } from "../modules/professionals";

// The owner, or an EMPLOYEE professional linked to this specific business — used
// wherever an action is open to "any staff of the business", not just its owner (e.g.
// walk-in clients, walk-in appointments, receiving a payment in person).
export async function assertStaffOfBusiness(businessId: string, requesterId: string): Promise<void> {
  const business = await getBusinessOrThrow(businessId);
  if (business.ownerId === requesterId) return;

  const professional = await professionalsRepository.findByUserId(requesterId);
  if (professional && professional.businessId === businessId) return;

  throw new AuthorizationError();
}
