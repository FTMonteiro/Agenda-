import type { BusinessMembershipDTO, ClientDTO, WalkInClientDTO } from "@slotix/types";
import { ConflictError, NotFoundError } from "../../shared/errors";
import { assertStaffOfBusiness } from "../../shared/authz";
import { assertBusinessOwner, getBusinessOrThrow } from "../businesses";
import { notificationsService } from "../notifications";
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

// Phone numbers are typed in many ways (+244 923 000 000, 923000000, 00244…): compared by
// their last 9 digits, the length of an Angolan number without the country code.
function phoneKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : null;
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
  // The business's app clients are the users who chose to be its clients (the app asks
  // when they book). Booking alone does not put someone on this list. Visits and spending
  // count their completed appointments here.
  //
  // includeBookers also returns the people who booked without becoming clients
  // (clientSince: null) — the dashboard needs their names to show its appointments.
  async listByBusiness(businessId: string, requesterId: string, includeBookers = false): Promise<ClientDTO[]> {
    await assertStaffOfBusiness(businessId, requesterId);

    const [members, appointments, bookings] = await Promise.all([
      clientsRepository.findMembersByBusiness(businessId),
      clientsRepository.findCompletedAppointmentsByBusiness(businessId),
      includeBookers ? clientsRepository.findAppointmentsWithClientByBusiness(businessId) : Promise.resolve([]),
    ]);

    const history = new Map<string, { visits: number; totalSpent: number; lastVisit: Date | null }>();
    for (const appointment of appointments) {
      if (!appointment.clientId) continue;
      const entry = history.get(appointment.clientId) ?? { visits: 0, totalSpent: 0, lastVisit: null };
      entry.visits += 1;
      entry.totalSpent += appointment.price.toNumber();
      if (!entry.lastVisit || appointment.scheduledAt > entry.lastVisit) entry.lastVisit = appointment.scheduledAt;
      history.set(appointment.clientId, entry);
    }

    const toDTO = (
      user: { id: string; name: string; email: string; phone: string | null; avatarUrl: string | null },
      clientSince: Date | null,
    ): ClientDTO => {
      const entry = history.get(user.id) ?? { visits: 0, totalSpent: 0, lastVisit: null };
      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        clientSince: clientSince?.toISOString() ?? null,
        visits: entry.visits,
        totalSpent: entry.totalSpent,
        lastVisit: entry.lastVisit?.toISOString() ?? null,
        status: deriveStatus(entry.visits, entry.lastVisit),
      };
    };

    const clients = members.map((member) => toDTO(member.user, member.createdAt));
    const known = new Set(clients.map((client) => client.userId));
    for (const booking of bookings) {
      if (!booking.client || known.has(booking.client.id)) continue;
      known.add(booking.client.id);
      clients.push(toDTO(booking.client, null));
    }
    return clients;
  },

  async getByBusinessAndUser(businessId: string, ownerId: string, clientId: string): Promise<ClientDTO> {
    const business = await getBusinessOrThrow(businessId);
    assertBusinessOwner(business, ownerId);

    const [membership, appointments] = await Promise.all([
      clientsRepository.findMembership(businessId, clientId),
      clientsRepository.findCompletedAppointmentsForClient(businessId, clientId),
    ]);
    if (!membership && appointments.length === 0) {
      throw new NotFoundError("Este cliente ainda não tem histórico neste negócio.", "CLIENT_NOT_FOUND");
    }

    const user = appointments[0]?.client ?? (await clientsRepository.findMembersByBusiness(businessId)).find((m) => m.userId === clientId)?.user;
    if (!user) throw new NotFoundError("Cliente não encontrado.", "CLIENT_NOT_FOUND");

    const visits = appointments.length;
    const totalSpent = appointments.reduce((sum, appointment) => sum + appointment.price.toNumber(), 0);
    const lastVisit = appointments[0]?.scheduledAt ?? null;

    return {
      userId: clientId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      clientSince: membership?.createdAt.toISOString() ?? null,
      visits,
      totalSpent,
      lastVisit: lastVisit?.toISOString() ?? null,
      status: deriveStatus(visits, lastVisit),
    };
  },

  // A user is a client if they became one in the app, or if the business already has
  // them on its own list (registered by hand in the dashboard) with the same email or
  // phone number — then the app recognises them and doesn't ask.
  async getMembership(businessId: string, userId: string): Promise<BusinessMembershipDTO> {
    await getBusinessOrThrow(businessId);
    const membership = await clientsRepository.findMembership(businessId, userId);
    if (membership) return { businessId, isClient: true, clientSince: membership.createdAt.toISOString() };

    const [user, walkIns] = await Promise.all([
      clientsRepository.findUserContact(userId),
      clientsRepository.findWalkInsByBusiness(businessId),
    ]);
    const email = user?.email.trim().toLowerCase();
    const phone = phoneKey(user?.phone);
    const match = walkIns.find(
      (client) =>
        client.active &&
        ((email && client.email?.trim().toLowerCase() === email) || (phone && phoneKey(client.phone) === phone)),
    );

    return { businessId, isClient: match !== undefined, clientSince: match?.createdAt.toISOString() ?? null };
  },

  // The signed-in customer becomes a client of the business. Their details are read from
  // their own account, so there is nothing to fill in; the owner is told in the bell.
  async join(businessId: string, userId: string, userName: string): Promise<BusinessMembershipDTO> {
    const business = await getBusinessOrThrow(businessId);
    const existing = await clientsRepository.findMembership(businessId, userId);
    const membership = existing ?? (await clientsRepository.upsertMembership(businessId, userId));

    if (!existing) {
      void notificationsService
        .notify(business.ownerId, "CLIENT_JOINED", "Novo cliente", `${userName} tornou-se cliente do espaço pela app.`)
        .catch(() => undefined);
    }

    return { businessId, isClient: true, clientSince: membership.createdAt.toISOString() };
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
