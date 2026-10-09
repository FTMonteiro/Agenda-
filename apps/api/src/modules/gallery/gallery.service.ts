import type { GalleryImageDTO } from "@slotix/types";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { assertBusinessOwner, getBusinessOrThrow } from "../businesses";
import { galleryRepository } from "./gallery.repository";
import { deleteGalleryImage, uploadGalleryImage } from "./gallery.storage";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGES_PER_BUSINESS = 20;

function toGalleryImageDTO(image: {
  id: string;
  businessId: string;
  url: string;
  position: number;
  caption: string | null;
  createdAt: Date;
}): GalleryImageDTO {
  return {
    id: image.id,
    businessId: image.businessId,
    url: image.url,
    position: image.position,
    caption: image.caption,
    createdAt: image.createdAt.toISOString(),
  };
}

async function getImageOrThrow(id: string) {
  const image = await galleryRepository.findById(id);
  if (!image) throw new NotFoundError("Imagem não encontrada.", "GALLERY_IMAGE_NOT_FOUND");
  return image;
}

export const galleryService = {
  async upload(businessId: string, ownerId: string, file: { buffer: Buffer; mimetype: string }, caption?: string): Promise<GalleryImageDTO> {
    const business = await getBusinessOrThrow(businessId);
    assertBusinessOwner(business, ownerId);

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new ValidationError("Formato de imagem não suportado (use JPEG, PNG, WEBP ou GIF).", "GALLERY_INVALID_FILE_TYPE");
    }

    const count = await galleryRepository.countByBusiness(businessId);
    if (count >= MAX_IMAGES_PER_BUSINESS) {
      throw new ValidationError(`Este negócio já atingiu o limite de ${MAX_IMAGES_PER_BUSINESS} imagens.`, "GALLERY_LIMIT_REACHED");
    }

    const { url, path } = await uploadGalleryImage(businessId, file);
    const image = await galleryRepository.create({ businessId, url, path, position: count, caption });
    return toGalleryImageDTO(image);
  },

  async listByBusiness(businessId: string): Promise<GalleryImageDTO[]> {
    const images = await galleryRepository.findByBusiness(businessId);
    return images.map(toGalleryImageDTO);
  },

  // No separate isCover flag: the image at position 0 is the cover by convention. This
  // moves the chosen image to position 0 and shifts the rest down, preserving their
  // relative order — the same invariant the old dashboard enforced with a boolean column,
  // achieved here with the field the schema already has.
  async setCover(imageId: string, ownerId: string): Promise<GalleryImageDTO[]> {
    const image = await getImageOrThrow(imageId);
    const business = await getBusinessOrThrow(image.businessId);
    assertBusinessOwner(business, ownerId);

    const images = await galleryRepository.findByBusiness(image.businessId);
    const rest = images.filter((img) => img.id !== imageId);
    const orderedIds = [imageId, ...rest.map((img) => img.id)];

    await galleryRepository.reorder(orderedIds);
    const updated = await galleryRepository.findByBusiness(image.businessId);
    return updated.map(toGalleryImageDTO);
  },

  async remove(imageId: string, ownerId: string): Promise<void> {
    const image = await getImageOrThrow(imageId);
    const business = await getBusinessOrThrow(image.businessId);
    assertBusinessOwner(business, ownerId);

    // The DB row (what the UI actually reads) goes first; a failure below leaves an
    // orphaned file in the bucket, never a row that points at a deleted image.
    await galleryRepository.delete(imageId);

    try {
      await deleteGalleryImage(image.path);
    } catch (error) {
      console.error("Falha ao apagar imagem do storage:", error);
    }
  },
};
