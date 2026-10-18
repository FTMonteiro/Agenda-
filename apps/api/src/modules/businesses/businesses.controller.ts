import type { Request, Response } from "express";
import { ValidationError } from "../../shared/errors";
import { sendListSuccess, sendSuccess } from "../../shared/utils/apiResponse";
import { withStoredLocation } from "../users/viewerLocation";
import { businessesService } from "./businesses.service";
import type { CreateBusinessInput, GetBusinessQuery, ListBusinessesQuery, SetBusinessHoursInput, UpdateBusinessInput } from "./businesses.schema";

export const businessesController = {
  async create(req: Request, res: Response) {
    const result = await businessesService.create(req.user!.id, req.body as CreateBusinessInput);
    sendSuccess(res, result, 201);
  },

  async list(req: Request, res: Response) {
    const query = await withStoredLocation(req.validatedQuery as unknown as ListBusinessesQuery, req.user?.id);
    const { data, meta } = await businessesService.list(query);
    sendListSuccess(res, data, meta);
  },

  async listMine(req: Request, res: Response) {
    const businesses = await businessesService.listMine(req.user!.id);
    sendSuccess(res, businesses);
  },

  async getById(req: Request<{ id: string }>, res: Response) {
    const { latitude, longitude } = await withStoredLocation(req.validatedQuery as unknown as GetBusinessQuery, req.user?.id);
    const viewerCoords = latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined;
    const business = await businessesService.getById(req.params.id, viewerCoords);
    sendSuccess(res, business);
  },

  async listLocalities(_req: Request, res: Response) {
    sendSuccess(res, await businessesService.listLocalities());
  },

  async update(req: Request<{ id: string }>, res: Response) {
    const business = await businessesService.update(req.params.id, req.user!.id, req.body as UpdateBusinessInput);
    sendSuccess(res, business);
  },

  async uploadLogo(req: Request<{ id: string }>, res: Response) {
    if (!req.file) {
      throw new ValidationError("Nenhum ficheiro enviado (campo \"file\").", "BUSINESS_LOGO_FILE_REQUIRED");
    }

    const business = await businessesService.uploadLogo(req.params.id, req.user!.id, req.file);
    sendSuccess(res, business);
  },

  async remove(req: Request<{ id: string }>, res: Response) {
    await businessesService.remove(req.params.id, req.user!.id);
    sendSuccess(res, { deleted: true });
  },

  async getHours(req: Request<{ id: string }>, res: Response) {
    const hours = await businessesService.getHours(req.params.id);
    sendSuccess(res, hours);
  },

  async setHours(req: Request<{ id: string }>, res: Response) {
    const hours = await businessesService.setHours(req.params.id, req.user!.id, req.body as SetBusinessHoursInput);
    sendSuccess(res, hours);
  },
};
