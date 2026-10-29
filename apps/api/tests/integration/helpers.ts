import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { createApp } from "../../src/app/app";
import { prisma } from "../../src/config/database";
import { issueTokens } from "../../src/modules/auth/auth.service";
import { assertLocalTestDatabase } from "./dbGuard";

export const app = createApp();
export { prisma };

export const PASSWORD = "Password123!";
const passwordHash = bcrypt.hashSync(PASSWORD, 4);

let counter = 0;
const unique = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

// Esvazia todas as tabelas. Volta a confirmar que a base é local antes de o fazer.
export async function resetDatabase(): Promise<void> {
  assertLocalTestDatabase(process.env.DATABASE_URL);
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export async function createUser(role: Role = "CUSTOMER", data: { email?: string; name?: string; phone?: string } = {}) {
  const user = await prisma.user.create({
    data: {
      email: data.email ?? `user-${unique()}@example.test`,
      name: data.name ?? `Utilizador ${role}`,
      phone: data.phone,
      passwordHash,
      role,
    },
  });
  // A real session, as a login creates it (tokens without one are refused).
  const { accessToken } = await issueTokens(user);
  return { user, token: accessToken };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// Uma empresa completa: dono, funcionário (profissional), serviço, horário de todos os
// dias, um cliente com conta e um cliente presencial.
export async function createBusinessFixture(label: string) {
  const owner = await createUser("OWNER", { name: `Dono ${label}` });
  const business = await prisma.business.create({ data: { ownerId: owner.user.id, name: `Espaço ${label}` } });
  const employee = await createUser("EMPLOYEE", { name: `Funcionário ${label}` });
  const professional = await prisma.professional.create({ data: { businessId: business.id, userId: employee.user.id } });
  const service = await prisma.service.create({ data: { businessId: business.id, name: `Corte ${label}`, price: 5000, duration: 30 } });
  await prisma.businessHours.createMany({
    data: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ businessId: business.id, dayOfWeek, startMinute: 0, endMinute: 1440 })),
  });
  const customer = await createUser("CUSTOMER", { name: `Cliente ${label}` });
  const walkIn = await prisma.walkInClient.create({ data: { businessId: business.id, name: `Presencial ${label}`, phone: "923000000" } });
  return { owner, business, employee, professional, service, customer, walkIn };
}

export type BusinessFixture = Awaited<ReturnType<typeof createBusinessFixture>>;

export async function createAppointment(
  fx: BusinessFixture,
  data: { status?: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"; scheduledAt?: Date; walkIn?: boolean } = {},
) {
  return prisma.appointment.create({
    data: {
      businessId: fx.business.id,
      clientId: data.walkIn ? null : fx.customer.user.id,
      walkInClientId: data.walkIn ? fx.walkIn.id : null,
      serviceId: fx.service.id,
      professionalId: fx.professional.id,
      scheduledAt: data.scheduledAt ?? new Date(Date.now() + 24 * 60 * 60_000),
      durationMinutes: 30,
      price: 5000,
      status: data.status ?? "PENDING",
    },
  });
}

export async function createPayment(fx: BusinessFixture, appointmentId: string, status: "PENDING" | "PAID" = "PAID") {
  return prisma.payment.create({
    data: {
      appointmentId,
      userId: fx.customer.user.id,
      businessId: fx.business.id,
      amount: 5000,
      method: "CASH",
      status,
      paidAt: status === "PAID" ? new Date() : null,
    },
  });
}
