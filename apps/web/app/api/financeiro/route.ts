import type { FinancialsSummaryDTO, PaymentDTO } from "@slotix/types";
import { requireStaff } from "@/lib/auth";
import { apiCall, errorJson, errorResponse, fromApiMethod } from "@/lib/dashboard-api";

// Paid payments for a month (default: the current one), by the date they were received.
// The monthly report is the owner's. An EMPLOYEE only gets today's two figures, which is
// all the dashboard home shows them.
export async function GET(request: Request) {
  try {
    const user = await requireStaff();

    const month = new URL(request.url).searchParams.get("month");
    if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return errorJson("O parâmetro month deve estar no formato YYYY-MM.", 400);
    }

    if (user.role === "EMPLOYEE") {
      const payments = await apiCall<PaymentDTO[]>(`/payments?businessId=${user.businessId}`);
      const today = new Date().toDateString();
      const paidToday = payments.filter(
        (payment) => payment.status === "PAID" && payment.paidAt && new Date(payment.paidAt).toDateString() === today,
      );
      const revenueToday = paidToday.reduce((sum, payment) => sum + payment.amount, 0);

      return Response.json({
        success: true,
        summary: { todayRevenue: revenueToday, monthlyRevenue: 0, paymentsReceived: 0, todayPayments: paidToday.length },
        revenueToday,
        paidToday: paidToday.length,
        paymentMethods: {},
        payments: [],
      });
    }

    const financials = await apiCall<FinancialsSummaryDTO>(
      `/businesses/${user.businessId}/financials${month ? `?month=${month}` : ""}`,
    );

    const paymentMethods: Record<string, number> = { CASH: 0, CARD: 0, TRANSFER: 0, MOBILE_MONEY: 0 };
    for (const [method, total] of Object.entries(financials.paymentMethods)) {
      const key = fromApiMethod(method as keyof FinancialsSummaryDTO["paymentMethods"]);
      paymentMethods[key] = (paymentMethods[key] ?? 0) + total;
    }

    return Response.json({
      success: true,
      period: financials.period,
      summary: financials.summary,
      // The dashboard home reads today's figures from the top level.
      revenueToday: financials.summary.todayRevenue,
      paidToday: financials.summary.todayPayments,
      paymentMethods,
      payments: financials.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        method: fromApiMethod(payment.method),
        status: "PAID",
        paidAt: payment.paidAt,
        createdAt: payment.paidAt,
        reference: "",
        client: { id: "", name: payment.clientName },
        service: { id: "", name: payment.serviceName },
        professional: { id: "", name: payment.professionalName },
        appointment: { id: payment.appointmentId, date: payment.scheduledAt, status: "COMPLETED" },
      })),
    });
  } catch (error) {
    return errorResponse(error, "Erro ao carregar os dados financeiros.");
  }
}
