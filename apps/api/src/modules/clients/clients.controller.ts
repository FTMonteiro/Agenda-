import type { Request, Response } from "express";
import { ValidationError } from "../../shared/errors";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { clientsService } from "./clients.service";
import type { CreateWalkInClientInput, UpdateWalkInClientInput } from "./clients.schema";

export const clientsController = {
  async listByBusiness(req: Request, res: Response) {
    const businessId = req.query.businessId as string | undefined;
    if (!businessId) throw new ValidationError("O parâmetro businessId é obrigatório.");

    const clients = await clientsService.listByBusiness(businessId, req.user!.id, req.query.includeBookers === "true");
    sendSuccess(res, clients);
  },

  async getOne(req: Request<{ userId: string }>, res: Response) {
    const businessId = req.query.businessId as string | undefined;
    if (!businessId) throw new ValidationError("O parâmetro businessId é obrigatório.");

    const client = await clientsService.getByBusinessAndUser(businessId, req.user!.id, req.params.userId);
    sendSuccess(res, client);
  },

  async createWalkIn(req: Request, res: Response) {
    const client = await clientsService.createWalkIn(req.user!.id, req.body as CreateWalkInClientInput);
    sendSuccess(res, client, 201);
  },

  async listWalkIns(req: Request, res: Response) {
    const businessId = req.query.businessId as string | undefined;
    if (!businessId) throw new ValidationError("O parâmetro businessId é obrigatório.");

    const clients = await clientsService.listWalkInsByBusiness(businessId, req.user!.id);
    sendSuccess(res, clients);
  },

  async getWalkIn(req: Request<{ id: string }>, res: Response) {
    const client = await clientsService.getWalkInById(req.params.id, req.user!.id);
    sendSuccess(res, client);
  },

  async updateWalkIn(req: Request<{ id: string }>, res: Response) {
    const client = await clientsService.updateWalkIn(req.params.id, req.user!.id, req.body as UpdateWalkInClientInput);
    sendSuccess(res, client);
  },

  async removeWalkIn(req: Request<{ id: string }>, res: Response) {
    await clientsService.removeWalkIn(req.params.id, req.user!.id);
    sendSuccess(res, { deleted: true });
  },
};
