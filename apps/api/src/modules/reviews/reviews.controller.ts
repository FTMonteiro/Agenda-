import type { Request, Response } from "express";
import type { CreateReviewInput } from "@slotix/validation";
import { ValidationError } from "../../shared/errors";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { reviewsService } from "./reviews.service";

export const reviewsController = {
  async create(req: Request, res: Response) {
    const review = await reviewsService.create(req.user!.id, req.body as CreateReviewInput);
    sendSuccess(res, review, 201);
  },

  async listByBusiness(req: Request, res: Response) {
    const businessId = req.query.businessId as string | undefined;
    if (!businessId) throw new ValidationError("O parâmetro businessId é obrigatório.");

    const reviews = await reviewsService.listByBusiness(businessId);
    sendSuccess(res, reviews);
  },

  async getById(req: Request<{ id: string }>, res: Response) {
    const review = await reviewsService.getById(req.params.id);
    sendSuccess(res, review);
  },
};
