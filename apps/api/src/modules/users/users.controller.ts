import type { Request, Response } from "express";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { usersService } from "./users.service";
import type { ChangePasswordInput, UpdateLocationInput, UpdateProfileInput } from "./users.schema";

export const usersController = {
  async me(req: Request, res: Response) {
    const profile = await usersService.getProfile(req.user!.id);
    sendSuccess(res, profile);
  },

  async updateMe(req: Request, res: Response) {
    const profile = await usersService.updateProfile(req.user!.id, req.body as UpdateProfileInput);
    sendSuccess(res, profile);
  },

  async updateLocation(req: Request, res: Response) {
    const profile = await usersService.updateLocation(req.user!.id, req.body as UpdateLocationInput);
    sendSuccess(res, profile);
  },

  async changePassword(req: Request, res: Response) {
    await usersService.changePassword(req.user!.id, req.body as ChangePasswordInput);
    sendSuccess(res, { changed: true });
  },

  async deleteMe(req: Request, res: Response) {
    await usersService.deleteAccount(req.user!.id);
    sendSuccess(res, { deleted: true });
  },
};
