import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { availabilityService } from "./availability.service";
import type { GetAvailabilityInput } from "./availability.schema";

export const availabilityController = {
  async getSlots(req: Request, res: Response) {
    const query = req.validatedQuery as unknown as GetAvailabilityInput;
    const slots = await availabilityService.getSlots(query);
    sendSuccess(res, slots);
  },
};
