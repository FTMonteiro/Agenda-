import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { professionalsService } from "./professionals.service";
import type { CreateBlockInput, CreateProfessionalInput, InviteProfessionalInput, UpdateProfessionalInput } from "./professionals.schema";
import { queryId } from "../../shared/utils/queryId";

export const professionalsController = {
  async create(req: Request, res: Response) {
    const professional = await professionalsService.create(req.user!.id, req.body as CreateProfessionalInput);
    sendSuccess(res, professional, 201);
  },

  async invite(req: Request, res: Response) {
    const result = await professionalsService.invite(req.user!.id, req.body as InviteProfessionalInput);
    sendSuccess(res, result, 201);
  },

  async resetPassword(req: Request<{ id: string }>, res: Response) {
    const result = await professionalsService.resetPassword(req.params.id, req.user!.id);
    sendSuccess(res, result);
  },

  async listByBusiness(req: Request, res: Response) {
    const businessId = queryId(req, "businessId", { required: true });

    const professionals = await professionalsService.listByBusiness(businessId);
    sendSuccess(res, professionals);
  },

  async getById(req: Request<{ id: string }>, res: Response) {
    const professional = await professionalsService.getById(req.params.id);
    sendSuccess(res, professional);
  },

  async getMine(req: Request, res: Response) {
    const professional = await professionalsService.getMine(req.user!.id);
    sendSuccess(res, professional);
  },

  async update(req: Request<{ id: string }>, res: Response) {
    const professional = await professionalsService.update(req.params.id, req.user!.id, req.body as UpdateProfessionalInput);
    sendSuccess(res, professional);
  },

  async remove(req: Request<{ id: string }>, res: Response) {
    await professionalsService.remove(req.params.id, req.user!.id);
    sendSuccess(res, { deleted: true });
  },

  async addBlock(req: Request<{ id: string }>, res: Response) {
    const block = await professionalsService.addBlock(req.params.id, req.user!.id, req.body as CreateBlockInput);
    sendSuccess(res, block, 201);
  },

  async listBlocks(req: Request<{ id: string }>, res: Response) {
    const blocks = await professionalsService.listBlocks(req.params.id, req.user!.id);
    sendSuccess(res, blocks);
  },

  async removeBlock(req: Request<{ id: string; blockId: string }>, res: Response) {
    await professionalsService.removeBlock(req.params.id, req.params.blockId, req.user!.id);
    sendSuccess(res, { deleted: true });
  },
};
