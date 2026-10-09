import type { ClientDTO, WalkInClientDTO } from "@slotix/types";
import { ConflictError, NotFoundError } from "../../shared/errors";
import { assertStaffOfBusiness } from "../../shared/authz";
import { assertBusinessOwner, getBusinessOrThrow } from "../businesses";
import { clientsRepository } from "./clients.repository";
import type { CreateWalkInClientInput, UpdateWalkInClientInput } from "./clients.schema";

export async function getWalkInClientOrThrow(id: string) {
  const client = await clientsRepository.findWalkInById(id);
  if (!client) throw new NotFoundError("Cliente não encontrado.", "WALK_IN_CLIENT_NOT_FOUND");
  return client;
}

function toWalkInClientDTO(
  client: { id: string; businessId: string; name: string; phone: string; email: string | null; active: boolean; createdAt: Date; updatedAt: Date },
  history: { visits: number; totalSpent: number; lastVisit: Date | null },
): WalkInClientDTO {
  return {
    id: client.id,
    businessId: client.businessId,
    name: client.name,
    phone: client.phone,
    email: client.email,
    active: client.active,
    visits: history.visits,
    totalSpent: history.totalSpent,
    lastVisit: history.lastVisit?.toISOString() ?? null,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

async function computeWalkInHistory(businessId: string, walkInClientId: string) {
  const appointments = await clientsRepository.findCompletedAppointmentsForWalkIn(businessId, walkInClientId);
  return {
    visits: appointments.length,
    totalSpent: appointments.reduce((sum, a) => sum + a.price.toNumber(), 0),
    lastVisit: appointments[0]?.scheduledAt ?? null,
  };
}

// VIP/inactive thresholds aren't specified by the product yet; kept as simple, easy-to-tune
// placeholders rather than a config surface no one has asked for.
const VIP_VISIT_THRESHOLD = 5;
const INACTIVE_AFTER_DAYS = 90;

function deriveStatus(visits: number, lastVisit: Date | null): ClientDTO["status"] {
  // No completed visit yet: someone who has just booked is a new client, not a lapsed one.
  if (!lastVisit) return "active";
  const daysSinceLastVisit = (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLastVisit > INACTIVE_AFTER_DAYS) return "inactive";
  if (visits >= VIP_VISIT_THRESHOLD) return "vip";
  return "active";
}

export const clientsService = {
  async listByBusiness(businessId: string, requesterId: string): Promise<ClientDTO[]> {
    await assertStaffOfBusiness(businessId, requesterId);

    // The repository query already filters clientId != null; this narrows the type to
    // match (Prisma's generated type doesn't know the WHERE clause guarantees it).
    const appointments = (await clientsRepository.findAppointmentsWithClientByBusiness(businessId)).filter(
      (a): a is typeof a & { clientId: string; client: NonNullable<typeof a.client> } => a.clientId !== null && a.client !== null,
    );

    const byClient = new Map<string, { name: string; email: string; phone: string | null; visits: number; totalSpent: number; lastVisit: Date | null }>();

    // Anyone who booked is listed; visits and spending only count completed appointments.
    for (const appointment of appointments) {
      const entry = byClient.get(appointment.clientId) ?? {
        name: appointment.client.name,
        email: appointment.client.email,
        phone: appointment.client.phone,
        visits: 0,
        totalSpent: 0,
        lastVisit: null,
      };

      if (appointment.status === "COMPLETED") {
        entry.visits += 1;
        entry.totalSpent += appointment.price.toNumber();
        if (!entry.lastVisit || appointment.scheduledAt > entry.lastVisit) {
          entry.lastVisit = appointment.scheduledAt;
        }
      }

      byClient.set(appointment.clientId, entry);
    }

    return Array.from(byClient.entries()).map(([userId, entry]) => ({
      userId,
      name: entry.name,
      email: entry.email,
      phone: entry.phone,
      visits: entry.visits,
      totalSpent: entry.totalSpent,
      lastVisit: entry.lastVisit?.toISOString() ?? null,
      status: deriveStatus(entry.visits, entry.lastVisit),
    }));
  },

  async getByBusinessAndUser(businessId: string, ownerId: string, clientId: string): Promise<ClientDTO> {
    const business = await getBusinessOrThrow(businessId);
    assertBusinessOwner(business, ownerId);

    const appointments = await clientsRepository.findCompletedAppointmentsForClient(businessId, clientId);
    if (appointments.length === 0) {
      throw new NotFoundError("Este cliente ainda não tem histórico neste negócio.", "CLIENT_NOT_FOUND");
    }

    const visits = appointments.length;
    const totalSpent = appointments.reduce((sum, appointment) => sum + appointment.price.toNumber(), 0);
    const lastVisit = appointments[0].scheduledAt;
    // Guaranteed non-null: the query filtered on this exact clientId, a real User's id.
    const client = appointments[0].client!;

    return {
      userId: clientId,
      name: client.name,
      email: client.email,
      phone: client.phone,
      visits,
      totalSpent,
      lastVisit: lastVisit.toISOString(),
      status: deriveStatus(visits, lastVisit),
    };
  },

  async createWalkIn(requesterId: string, input: CreateWalkInClientInput): Promise<WalkInClientDTO> {
    await assertStaffOfBusiness(input.businessId, requesterId);

    const client = await clientsRepository.createWalkIn(input);
    return toWalkInClientDTO(client, { visits: 0, totalSpent: 0, lastVisit: null });
  },

  async listWalkInsByBusiness(businessId: string, requesterId: string): Promise<WalkInClientDTO[]> {
    await assertStaffOfBusiness(businessId, requesterId);

    const clients = await clientsRepository.findWalkInsByBusiness(businessId);
    return Promise.all(clients.map(async (client) => toWalkInClientDTO(client, await computeWalkInHistory(businessId, client.id))));
  },

  async getWalkInById(id: string, requesterId: string): Promise<WalkInClientDTO> {
    const client = await getWalkInClientOrThrow(id);
    await assertStaffOfBusiness(client.businessId, requesterId);

    return toWalkInClientDTO(client, await computeWalkInHistory(client.businessId, client.id));
  },

  // OWNER-only, unlike create — matches the old dashboard's rule (any staff can add a
  // walk-in, but editing/removing one is an owner decision).
  async updateWalkIn(id: string, ownerId: string, input: UpdateWalkInClientInput): Promise<WalkInClientDTO> {
    const client = await getWalkInClientOrThrow(id);
    const business = await getBusinessOrThrow(client.businessId);
    assertBusinessOwner(business, ownerId);

    const updated = await clientsRepository.updateWalkIn(id, input);
    return toWalkInClientDTO(updated, await computeWalkInHistory(client.businessId, id));
  },

  // Preserve-history pattern also used by services/professionals: refuses to delete a
  // client with appointment history so past bookings/payments never dangle. The owner is
  // told to deactivate (active: false) instead.
  async removeWalkIn(id: string, ownerId: string): Promise<void> {
    const client = await getWalkInClientOrThrow(id);
    const business = await getBusinessOrThrow(client.businessId);
    assertBusinessOwner(business, ownerId);

    const appointmentCount = await clientsRepository.countAppointmentsForWalkIn(id);
    if (appointmentCount > 0) {
      throw new ConflictError(
        `Este cliente tem ${appointmentCount} agendamento(s) associado(s). Desative-o em vez de remover, para preservar o histórico.`,
        "CLIENT_HAS_APPOINTMENTS",
      );
    }

    await clientsRepository.deleteWalkIn(id);
  },
};
