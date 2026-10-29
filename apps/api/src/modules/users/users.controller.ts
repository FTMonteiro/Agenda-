import type { Request, Response } from "express";
import { ValidationError } from "../../shared/errors";
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

  async uploadAvatar(req: Request, res: Response) {
    if (!req.file) {
      throw new ValidationError("Nenhum ficheiro enviado (campo \"file\").", "USER_AVATAR_FILE_REQUIRED");
    }

    const profile = await usersService.uploadAvatar(req.user!.id, req.file);
    sendSuccess(res, profile);
  },

  async removeAvatar(req: Request, res: Response) {
    const profile = await usersService.removeAvatar(req.user!.id);
    sendSuccess(res, profile);
  },

  async updateLocation(req: Request, res: Response) {
    const profile = await usersService.updateLocation(req.user!.id, req.body as UpdateLocationInput);
    sendSuccess(res, profile);
  },

  async changePassword(req: Request, res: Response) {
    const tokens = await usersService.changePassword(req.user!.id, req.body as ChangePasswordInput);
    sendSuccess(res, { changed: true, ...tokens });
  },

  async deleteMe(req: Request, res: Response) {
    await usersService.deleteAccount(req.user!.id);
    sendSuccess(res, { deleted: true });
  },
};
