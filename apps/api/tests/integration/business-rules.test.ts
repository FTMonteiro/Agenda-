import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appointmentsRepository } from "../../src/modules/appointments/appointments.repository";
import { paymentsRepository } from "../../src/modules/payments/payments.repository";
import { domainEvents } from "../../src/shared/events/domainEvents";
import { resetRateLimits } from "../../src/shared/middleware/rateLimit";
import { app, auth, createAppointment, createBusinessFixture, createPayment, prisma, resetDatabase, type BusinessFixture } from "./helpers";

// A fixed hour tomorrow (process time zone): "now + N hours" made the result depend on the
// time the suite ran, since a booking may not run past midnight.
function tomorrowAt(hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

let a: BusinessFixture;
let b: BusinessFixture;

beforeEach(async () => {
  await resetDatabase();
  resetRateLimits();
  a = await createBusinessFixture("A");
  b = await createBusinessFixture("B");
});

afterEach(() => vi.restoreAllMocks());

describe("isolamento entre empresas", () => {
  it("M-01: não é possível marcar para um cliente presencial de outra empresa", async () => {
    const response = await request(app)
      .post("/api/v1/appointments/walk-in")
      .set(auth(a.owner.token))
      .send({
        businessId: a.business.id,
        walkInClientId: b.walkIn.id,
        serviceId: a.service.id,
        professionalId: a.professional.id,
        scheduledAt: tomorrowAt(10),
      });
    expect(response.status).toBe(404);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("marcação presencial com cliente da própria empresa continua a funcionar", async () => {
    const response = await request(app)
      .post("/api/v1/appointments/walk-in")
      .set(auth(a.employee.token))
      .send({
        businessId: a.business.id,
        walkInClientId: a.walkIn.id,
        serviceId: a.service.id,
        professionalId: a.professional.id,
        scheduledAt: tomorrowAt(10),
      });
    expect(response.status).toBe(201);
  });

  it("o espaço marca para um cliente da app que é seu cliente, e ele é avisado", async () => {
    const emit = vi.spyOn(domainEvents, "emitEvent");
    await prisma.businessClient.create({ data: { businessId: a.business.id, userId: a.customer.user.id } });

    const response = await request(app)
      .post("/api/v1/appointments/walk-in")
      .set(auth(a.employee.token))
      .send({
        businessId: a.business.id,
        clientId: a.customer.user.id,
        serviceId: a.service.id,
        professionalId: a.professional.id,
        scheduledAt: tomorrowAt(10),
      });
    expect(response.status).toBe(201);
    expect(response.body.data.clientId).toBe(a.customer.user.id);
    expect(response.body.data.walkInClientId).toBeNull();

    expect(emit).toHaveBeenCalledWith("AppointmentBookedForClient", expect.objectContaining({ clientId: a.customer.user.id }));
  });

  it("não é possível marcar para um utilizador da app que não é cliente do espaço", async () => {
    const response = await request(app)
      .post("/api/v1/appointments/walk-in")
      .set(auth(a.owner.token))
      .send({
        businessId: a.business.id,
        clientId: b.customer.user.id,
        serviceId: a.service.id,
        professionalId: a.professional.id,
        scheduledAt: tomorrowAt(10),
      });
    expect(response.status).toBe(404);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it("a marcação pelo espaço exige exatamente um cliente", async () => {
    const response = await request(app)
      .post("/api/v1/appointments/walk-in")
      .set(auth(a.owner.token))
      .send({
        businessId: a.business.id,
        walkInClientId: a.walkIn.id,
        clientId: a.customer.user.id,
        serviceId: a.service.id,
        professionalId: a.professional.id,
        scheduledAt: tomorrowAt(10),
      });
    expect(response.status).toBe(400);
  });

  it.each([
    ["GET", (fx: BusinessFixture) => `/api/v1/appointments?businessId=${fx.business.id}`],
    ["GET", (fx: BusinessFixture) => `/api/v1/payments?businessId=${fx.business.id}`],
    ["GET", (fx: BusinessFixture) => `/api/v1/clients?businessId=${fx.business.id}`],
    ["GET", (fx: BusinessFixture) => `/api/v1/clients/walk-in?businessId=${fx.business.id}`],
    ["GET", (fx: BusinessFixture) => `/api/v1/businesses/${fx.business.id}/financials`],
  ])("dono e funcionário da empresa B não acedem a %s da empresa A", async (_method, path) => {
    for (const token of [b.owner.token, b.employee.token, b.customer.token]) {
      const response = await request(app).get(path(a)).set(auth(token));
      expect(response.status).toBe(403);
    }
  });

  it("dono e funcionário de B não alteram marcações nem pagamentos de A", async () => {
    const appointment = await createAppointment(a, { status: "PENDING" });
    const payment = await createPayment(a, (await createAppointment(a, { status: "CONFIRMED", scheduledAt: new Date(Date.now() + 48 * 3600_000) })).id, "PENDING");
    for (const token of [b.owner.token, b.employee.token]) {
      expect((await request(app).get(`/api/v1/appointments/${appointment.id}`).set(auth(token))).status).toBe(403);
      expect((await request(app).patch(`/api/v1/appointments/${appointment.id}/confirm`).set(auth(token))).status).toBe(403);
      expect((await request(app).patch(`/api/v1/appointments/${appointment.id}/cancel`).set(auth(token))).status).toBe(403);
      expect((await request(app).get(`/api/v1/payments/${payment.id}`).set(auth(token))).status).toBe(403);
    }
    expect((await request(app).patch(`/api/v1/payments/${payment.id}/pay`).set(auth(b.owner.token))).status).toBe(403);
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))!.status).toBe("PENDING");
  });

  it("um cliente não marca o próprio pagamento como pago", async () => {
    const appointment = await createAppointment(a, { status: "CONFIRMED" });
    const payment = await createPayment(a, appointment.id, "PENDING");
    const response = await request(app).patch(`/api/v1/payments/${payment.id}/pay`).set(auth(a.customer.token));
    expect(response.status).toBe(403);
  });

  it("um funcionário não acede ao financeiro nem edita serviços (só o dono)", async () => {
    expect((await request(app).get(`/api/v1/businesses/${a.business.id}/financials`).set(auth(a.employee.token))).status).toBe(403);
    expect((await request(app).patch(`/api/v1/services/${a.service.id}`).set(auth(a.employee.token)).send({ price: 1 })).status).toBe(403);
  });

  it("o preço da marcação vem do serviço, nunca do pedido", async () => {
    const response = await request(app)
      .post("/api/v1/appointments")
      .set(auth(a.customer.token))
      .send({
        businessId: a.business.id,
        serviceId: a.service.id,
        professionalId: a.professional.id,
        scheduledAt: tomorrowAt(12),
        price: 1,
      });
    expect(response.status).toBe(201);
    expect(response.body.data.price).toBe(5000);
  });

  it("B-05: um dono não associa ao seu espaço um funcionário que não criou", async () => {
    const stray = await prisma.user.create({ data: { email: "solto@example.test", name: "Solto", passwordHash: "x", role: "EMPLOYEE" } });
    const response = await request(app).post("/api/v1/professionals").set(auth(b.owner.token)).send({ businessId: b.business.id, userId: stray.id });
    expect(response.status).toBe(403);
  });
});

describe("M-02: transições de estado atómicas", () => {
  it("receber pagamento de uma marcação cancelada entretanto é recusado", async () => {
    const appointment = await createAppointment(a, { status: "CONFIRMED", scheduledAt: new Date(Date.now() - 60_000) });
    const stale = { ...appointment };
    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELLED" } });
    // Simula a leitura feita antes do cancelamento concorrente.
    vi.spyOn(appointmentsRepository, "findById").mockResolvedValueOnce(stale);

    const response = await request(app).post("/api/v1/payments/receive").set(auth(a.owner.token)).send({ appointmentId: appointment.id, method: "CASH" });
    expect(response.status).toBe(409);
    expect(await prisma.payment.count()).toBe(0);
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))!.status).toBe("CANCELLED");
  });

  it("dois pagamentos simultâneos da mesma marcação: um entra, o outro dá 409 (não 500)", async () => {
    const appointment = await createAppointment(a, { status: "CONFIRMED", scheduledAt: new Date(Date.now() - 60_000) });
    const send = () => request(app).post("/api/v1/payments/receive").set(auth(a.owner.token)).send({ appointmentId: appointment.id, method: "CASH" });
    const statuses = (await Promise.all([send(), send(), send()])).map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409]);
    expect(await prisma.payment.count()).toBe(1);
  });

  it("cancelar uma marcação concluída entretanto é recusado", async () => {
    const appointment = await createAppointment(a, { status: "PENDING" });
    const stale = { ...appointment };
    await prisma.appointment.update({ where: { id: appointment.id }, data: { status: "COMPLETED" } });
    vi.spyOn(appointmentsRepository, "findById").mockResolvedValueOnce(stale);

    const response = await request(app).patch(`/api/v1/appointments/${appointment.id}/cancel`).set(auth(a.customer.token));
    expect(response.status).toBe(409);
    expect((await prisma.appointment.findUnique({ where: { id: appointment.id } }))!.status).toBe("COMPLETED");
  });

  it("marcar como pago um pagamento reembolsado entretanto é recusado", async () => {
    const appointment = await createAppointment(a, { status: "CONFIRMED" });
    const payment = await createPayment(a, appointment.id, "PENDING");
    const stale = { ...payment };
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    vi.spyOn(paymentsRepository, "findById").mockResolvedValueOnce(stale);

    const response = await request(app).patch(`/api/v1/payments/${payment.id}/pay`).set(auth(a.owner.token));
    expect(response.status).toBe(409);
    expect((await prisma.payment.findUnique({ where: { id: payment.id } }))!.status).toBe("FAILED");
  });

  it("duas marcações simultâneas no mesmo horário: só uma entra", async () => {
    const scheduledAt = tomorrowAt(14);
    const book = () =>
      request(app)
        .post("/api/v1/appointments")
        .set(auth(a.customer.token))
        .send({ businessId: a.business.id, serviceId: a.service.id, professionalId: a.professional.id, scheduledAt });
    const statuses = (await Promise.all([book(), book(), book()])).map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409]);
  });
});

describe("validação de parâmetros", () => {
  it("businessId em falta ou repetido na query dá 400, não 500", async () => {
    expect((await request(app).get("/api/v1/clients").set(auth(a.owner.token))).status).toBe(400);
    expect((await request(app).get(`/api/v1/appointments?businessId=${a.business.id}&businessId=${b.business.id}`).set(auth(a.owner.token))).status).toBe(400);
    expect((await request(app).get("/api/v1/payments?businessId=nao-e-um-id").set(auth(a.owner.token))).status).toBe(400);
  });

  it("campos de texto têm limite de tamanho", async () => {
    const response = await request(app)
      .post("/api/v1/clients/walk-in")
      .set(auth(a.owner.token))
      .send({ businessId: a.business.id, name: "x".repeat(5000), phone: "923000000" });
    expect(response.status).toBe(400);
  });

  it("URLs de imagem só aceitam https ou data:image", async () => {
    for (const avatarUrl of ["javascript:alert(1)", "http://example.com/a.png", "data:text/html;base64,PHNjcmlwdD4="]) {
      const response = await request(app).patch("/api/v1/users/me").set(auth(a.customer.token)).send({ avatarUrl });
      expect(response.status).toBe(400);
    }
    for (const avatarUrl of ["https://cdn.example.com/a.png", "data:image/jpeg;base64,/9j/4AAQ"]) {
      const response = await request(app).patch("/api/v1/users/me").set(auth(a.customer.token)).send({ avatarUrl });
      expect(response.status).toBe(200);
    }
  });

  it("uploads cujo conteúdo não corresponde ao tipo declarado são recusados", async () => {
    const response = await request(app)
      .post("/api/v1/users/me/avatar")
      .set(auth(a.customer.token))
      .attach("file", Buffer.from("<html><script>alert(1)</script></html>"), { filename: "a.png", contentType: "image/png" });
    expect(response.status).toBe(400);

    const png = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b40000000049454e44ae426082", "hex");
    const ok = await request(app).post("/api/v1/users/me/avatar").set(auth(a.customer.token)).attach("file", png, { filename: "a.png", contentType: "image/png" });
    expect(ok.status).toBe(200);
  });

  it("push tokens têm de ter o formato da Expo", async () => {
    expect((await request(app).post("/api/v1/notifications/push-token").set(auth(a.customer.token)).send({ token: "x".repeat(5000) })).status).toBe(400);
    expect((await request(app).post("/api/v1/notifications/push-token").set(auth(a.customer.token)).send({ token: "ExponentPushToken[abc123]" })).status).toBe(200);
  });
});
