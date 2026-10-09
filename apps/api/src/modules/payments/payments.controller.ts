import type { Request, Response } from "express";
import type { CreatePaymentInput } from "@slotix/validation";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { paymentsService } from "./payments.service";

export const paymentsController = {
  async create(req: Request, res: Response) {
    const payment = await paymentsService.create(req.user!.id, req.user!.role, req.body as CreatePaymentInput);
    sendSuccess(res, payment, 201);
  },

  async receivePayment(req: Request, res: Response) {
    const payment = await paymentsService.receivePayment(req.user!.id, req.body as CreatePaymentInput);
    sendSuccess(res, payment, 201);
  },

  async list(req: Request, res: Response) {
    const businessId = req.query.businessId as string | undefined;

    if (businessId) {
      const payments = await paymentsService.listByBusiness(businessId, req.user!.id);
      sendSuccess(res, payments);
      return;
    }

    const payments = await paymentsService.listMine(req.user!.id);
    sendSuccess(res, payments);
  },

  async getById(req: Request<{ id: string }>, res: Response) {
    const payment = await paymentsService.getById(req.params.id, req.user!.id, req.user!.role);
    sendSuccess(res, payment);
  },

  async markAsPaid(req: Request<{ id: string }>, res: Response) {
    const payment = await paymentsService.markAsPaid(req.params.id, req.user!.id, req.user!.role);
    sendSuccess(res, payment);
  },

  async markAsFailed(req: Request<{ id: string }>, res: Response) {
    const payment = await paymentsService.markAsFailed(req.params.id, req.user!.id, req.user!.role);
    sendSuccess(res, payment);
  },

  async refund(req: Request<{ id: string }>, res: Response) {
    const payment = await paymentsService.refund(req.params.id, req.user!.id, req.user!.role);
    sendSuccess(res, payment);
  },
};
