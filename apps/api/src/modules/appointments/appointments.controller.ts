import type { Request, Response } from "express";
import type { CreateAppointmentInput, RescheduleAppointmentInput } from "@slotix/validation";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { appointmentsService } from "./appointments.service";
import type { CreateWalkInAppointmentInput } from "./appointments.schema";

export const appointmentsController = {
  async create(req: Request, res: Response) {
    const appointment = await appointmentsService.create(req.user!.id, req.body as CreateAppointmentInput);
    sendSuccess(res, appointment, 201);
  },

  async createForWalkIn(req: Request, res: Response) {
    const appointment = await appointmentsService.createForWalkIn(req.user!.id, req.body as CreateWalkInAppointmentInput);
    sendSuccess(res, appointment, 201);
  },

  async list(req: Request, res: Response) {
    const businessId = req.query.businessId as string | undefined;

    if (businessId) {
      const appointments = await appointmentsService.listByBusiness(businessId, req.user!.id);
      sendSuccess(res, appointments);
      return;
    }

    const appointments = await appointmentsService.listMineAsClient(req.user!.id);
    sendSuccess(res, appointments);
  },

  async getById(req: Request<{ id: string }>, res: Response) {
    const appointment = await appointmentsService.getById(req.params.id, req.user!.id, req.user!.role);
    sendSuccess(res, appointment);
  },

  async cancel(req: Request<{ id: string }>, res: Response) {
    const appointment = await appointmentsService.cancel(req.params.id, req.user!.id, req.user!.role);
    sendSuccess(res, appointment);
  },

  async confirm(req: Request<{ id: string }>, res: Response) {
    const appointment = await appointmentsService.confirm(req.params.id, req.user!.id);
    sendSuccess(res, appointment);
  },

  async complete(req: Request<{ id: string }>, res: Response) {
    const appointment = await appointmentsService.complete(req.params.id, req.user!.id);
    sendSuccess(res, appointment);
  },

  async reschedule(req: Request<{ id: string }>, res: Response) {
    const appointment = await appointmentsService.reschedule(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.body as RescheduleAppointmentInput,
    );
    sendSuccess(res, appointment);
  },
};
