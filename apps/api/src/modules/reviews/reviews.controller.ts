import type { Request, Response } from "express";
import type { CreateReviewInput } from "@slotix/validation";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { reviewsService } from "./reviews.service";
import { queryId } from "../../shared/utils/queryId";

export const reviewsController = {
  async create(req: Request, res: Response) {
    const review = await reviewsService.create(req.user!.id, req.body as CreateReviewInput);
    sendSuccess(res, review, 201);
  },

  async listByBusiness(req: Request, res: Response) {
    const businessId = queryId(req, "businessId", { required: true });

    const reviews = await reviewsService.listByBusiness(businessId);
    sendSuccess(res, reviews);
  },

  async getById(req: Request<{ id: string }>, res: Response) {
    const review = await reviewsService.getById(req.params.id);
    sendSuccess(res, review);
  },
};
