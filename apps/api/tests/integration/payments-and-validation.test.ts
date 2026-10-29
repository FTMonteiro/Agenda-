import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appointmentsRepository } from "../../src/modules/appointments/appointments.repository";
import { resetRateLimits } from "../../src/shared/middleware/rateLimit";
import { app, auth, createAppointment, createBusinessFixture, createPayment, createUser, PASSWORD, prisma, resetDatabase, type BusinessFixture } from "./helpers";

let a: BusinessFixture;

beforeEach(async () => {
  await resetDatabase();
  resetRateLimits();
  a = await createBusinessFixture("A");
});

afterEach(() => vi.restoreAllMocks());

describe("R-16: pagamentos e o estado da marcação", () => {
  it("o cliente não cria pagamento para uma marcação cancelada entretanto", async () => {
    const appointment = await createAppointment(a, { status: "CONFIRMED", scheduledAt: new Date(Date.now() - 60_000) });
    const stale = { ...appointment };
    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELLED" } });
    vi.spyOn(appointmentsRepository, "findById").mockResolvedValueOnce(stale);

    const response = await request(app).post("/api/v1/payments").set(auth(a.customer.token)).send({ appointmentId: appointment.id, method: "CASH" });
    expect(response.status).toBe(409);
    expect(await prisma.payment.count()).toBe(0);
  });

  it("o dono não marca como pago um pagamento cuja marcação foi cancelada", async () => {
    const appointment = await createAppointment(a, { status: "CONFIRMED" });
    const payment = await createPayment(a, appointment.id, "PENDING");
    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELLED" } });

    const response = await request(app).patch(`/api/v1/payments/${payment.id}/pay`).set(auth(a.owner.token));
    expect(response.status).toBe(409);
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))!.status).toBe("PENDING");
  });

  it("cancelar e marcar como pago em simultâneo nunca deixa um pagamento pago numa marcação cancelada", async () => {
    for (let round = 0; round < 5; round++) {
      const appointment = await createAppointment(a, { status: "CONFIRMED", scheduledAt: new Date(Date.now() + (round + 2) * 86_400_000) });
      const payment = await createPayment(a, appointment.id, "PENDING");
      await Promise.all([
        request(app).patch(`/api/v1/appointments/${appointment.id}/cancel`).set(auth(a.customer.token)),
        request(app).patch(`/api/v1/payments/${payment.id}/pay`).set(auth(a.owner.token)),
      ]);
      const [apt, pay] = await Promise.all([
        prisma.appointment.findUnique({ where: { id: appointment.id } }),
        prisma.payment.findUnique({ where: { id: payment.id } }),
      ]);
      expect(apt!.status === "CANCELLED" && pay!.status === "PAID" && pay!.paidAt! > apt!.updatedAt).toBe(false);
    }
  });

  it("os fluxos normais continuam: o cliente paga e o dono confirma", async () => {
    const appointment = await createAppointment(a, { status: "CONFIRMED", scheduledAt: new Date(Date.now() - 60_000) });
    const created = await request(app).post("/api/v1/payments").set(auth(a.customer.token)).send({ appointmentId: appointment.id, method: "CARD" });
    expect(created.status).toBe(201);
    const paid = await request(app).patch(`/api/v1/payments/${created.body.data.id}/pay`).set(auth(a.owner.token));
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe("PAID");
  });
});

describe("R-10: preço dentro do Decimal(10,2)", () => {
  it("aceita o máximo do tipo e recusa acima, com 400 e não 500", async () => {
    const create = (price: number) =>
      request(app).post("/api/v1/services").set(auth(a.owner.token)).send({ businessId: a.business.id, name: "Serviço caro", price, duration: 30 });
    const max = await create(99_999_999.99);
    expect(max.status).toBe(201);
    expect(max.body.data.price).toBe(99_999_999.99);
    expect((await create(100_000_000)).status).toBe(400);
    expect((await request(app).patch(`/api/v1/services/${a.service.id}`).set(auth(a.owner.token)).send({ price: 100_000_000 })).status).toBe(400);
  });
});

describe("R-12: password atual errada", () => {
  it("dá 400 (não 401) e não toca na sessão", async () => {
    const user = await createUser("OWNER");
    const session = (await request(app).post("/api/v1/auth/login").send({ email: user.user.email, password: PASSWORD })).body.data;
    const before = await prisma.refreshToken.count({ where: { userId: user.user.id, revokedAt: null } });

    const response = await request(app).post("/api/v1/users/me/password").set(auth(session.accessToken)).send({ currentPassword: "errada-123", newPassword: "NovaPass123!" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("CURRENT_PASSWORD_INCORRECT");
    expect(await prisma.refreshToken.count({ where: { userId: user.user.id, revokedAt: null } })).toBe(before);
    expect((await request(app).get("/api/v1/users/me").set(auth(session.accessToken))).status).toBe(200);
  });
});

describe("R-11: formatos de imagem", () => {
  it("a API recusa fotos de profissional em formatos não suportados, com mensagem clara", async () => {
    for (const imageUrl of ["data:image/heic;base64,AAAA", "data:image/svg+xml;base64,PHN2Zz4=", "http://example.com/a.jpg"]) {
      const response = await request(app).patch(`/api/v1/professionals/${a.professional.id}`).set(auth(a.owner.token)).send({ imageUrl });
      expect(response.status).toBe(400);
      expect(response.body.error.message).toMatch(/imagem/i);
    }
    expect((await request(app).patch(`/api/v1/professionals/${a.professional.id}`).set(auth(a.owner.token)).send({ imageUrl: "data:image/jpeg;base64,/9j/4AAQ" })).status).toBe(200);
  });
});
