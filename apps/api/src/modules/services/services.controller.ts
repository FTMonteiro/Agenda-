import type { Request, Response } from "express";
import { ValidationError } from "../../shared/errors";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { servicesService } from "./services.service";
import type { CreateServiceInput, UpdateServiceInput } from "./services.schema";

export const servicesController = {
  async create(req: Request, res: Response) {
    const service = await servicesService.create(req.user!.id, req.body as CreateServiceInput);
    sendSuccess(res, service, 201);
  },

  async listByBusiness(req: Request, res: Response) {
    const businessId = req.query.businessId as string | undefined;
    if (!businessId) throw new ValidationError("O parâmetro businessId é obrigatório.");

    const services = await servicesService.listByBusiness(businessId);
    sendSuccess(res, services);
  },

  async getById(req: Request<{ id: string }>, res: Response) {
    const service = await servicesService.getById(req.params.id);
    sendSuccess(res, service);
  },

  async update(req: Request<{ id: string }>, res: Response) {
    const service = await servicesService.update(req.params.id, req.user!.id, req.body as UpdateServiceInput);
    sendSuccess(res, service);
  },

  async remove(req: Request<{ id: string }>, res: Response) {
    await servicesService.remove(req.params.id, req.user!.id);
    sendSuccess(res, { deleted: true });
  },
};
