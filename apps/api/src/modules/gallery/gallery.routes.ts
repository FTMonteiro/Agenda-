import { Router } from "express";
import multer from "multer";
import { authenticate } from "../../shared/middleware/authenticate";
import { authorize } from "../../shared/middleware/authorize";
import { validate } from "../../shared/middleware/validate";
import { galleryController } from "./gallery.controller";
import { uploadGalleryImageSchema } from "./gallery.schema";

// Buffered in memory, not written to local disk: the file is forwarded straight to
// Supabase Storage, and the API may run on an ephemeral/read-only filesystem.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// mergeParams: true — this router is mounted at /businesses/:businessId/gallery, and
// needs that :businessId from the parent path.
export const galleryRoutes = Router({ mergeParams: true });

galleryRoutes.get("/", galleryController.listByBusiness);
galleryRoutes.post(
  "/",
  authenticate,
  authorize("OWNER"),
  upload.single("file"),
  validate(uploadGalleryImageSchema),
  galleryController.upload,
);
galleryRoutes.patch("/:id/cover", authenticate, authorize("OWNER"), galleryController.setCover);
galleryRoutes.delete("/:id", authenticate, authorize("OWNER"), galleryController.remove);
