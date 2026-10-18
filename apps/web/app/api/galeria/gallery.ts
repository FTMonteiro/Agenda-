import type { BusinessDTO, GalleryImageDTO } from "@slotix/types";
import { apiCall, jsonBody } from "@/lib/dashboard-api";

// The gallery page's own shape. The API has no file name, size or cover flag: the
// caption carries the original file name, and the image at position 0 is the cover.
export function toPageImage(image: GalleryImageDTO) {
  return {
    id: image.id,
    name: image.caption ?? "Imagem",
    url: image.url,
    isCover: image.position === 0,
    size: 0,
    createdAt: Date.parse(image.createdAt),
  };
}

export async function listGallery(businessId: string): Promise<GalleryImageDTO[]> {
  const images = await apiCall<GalleryImageDTO[]>(`/businesses/${businessId}/gallery`);
  return images.sort((a, b) => a.position - b.position);
}

// The cover also becomes the business's main image, which is what the app shows on
// its lists of spaces (Explorar, Início...) — unless the owner set a logo of their own in
// Configurações: that one stays. `previous` is the gallery before the change, so an
// imageUrl that came from it (e.g. a cover just deleted) is still recognised as the
// gallery's. Best-effort: the gallery change already happened.
export async function syncBusinessImage(businessId: string, images: GalleryImageDTO[], previous: GalleryImageDTO[] = images) {
  const cover = images.find((image) => image.position === 0) ?? images[0];
  if (!cover) return;

  const business = await apiCall<BusinessDTO>(`/businesses/${businessId}`).catch(() => null);
  if (!business) return;
  if (business.imageUrl && !previous.some((image) => image.url === business.imageUrl)) return;

  await apiCall(`/businesses/${businessId}`, jsonBody("PATCH", { imageUrl: cover.url })).catch(() => undefined);
}
