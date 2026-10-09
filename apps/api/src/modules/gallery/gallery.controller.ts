import type { Request, Response } from "express";
import { ValidationError } from "../../shared/errors";
import { sendSuccess } from "../../shared/utils/apiResponse";
import { galleryService } from "./gallery.service";
import type { UploadGalleryImageInput } from "./gallery.schema";

export const galleryController = {
  async upload(req: Request<{ businessId: string }>, res: Response) {
    if (!req.file) {
      throw new ValidationError("Nenhum ficheiro enviado (campo \"file\").", "GALLERY_FILE_REQUIRED");
    }

    const { caption } = req.body as UploadGalleryImageInput;
    const image = await galleryService.upload(req.params.businessId, req.user!.id, req.file, caption);
    sendSuccess(res, image, 201);
  },

  async listByBusiness(req: Request<{ businessId: string }>, res: Response) {
    const images = await galleryService.listByBusiness(req.params.businessId);
    sendSuccess(res, images);
  },

  async setCover(req: Request<{ businessId: string; id: string }>, res: Response) {
    const images = await galleryService.setCover(req.params.id, req.user!.id);
    sendSuccess(res, images);
  },

  async remove(req: Request<{ businessId: string; id: string }>, res: Response) {
    await galleryService.remove(req.params.id, req.user!.id);
    sendSuccess(res, { deleted: true });
  },
};
