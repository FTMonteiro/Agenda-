// The image formats the API accepts (apps/api/src/shared/validation/fields.ts and the
// upload checks in gallery.storage.ts). The file pickers offer only these, and the route
// handlers check a photo before forwarding it, so the user gets a clear message instead of
// a photo that silently disappears.
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";

export const UNSUPPORTED_IMAGE_MESSAGE = "Formato de imagem não suportado. Use JPEG, PNG, WEBP ou GIF.";

const INLINE_IMAGE = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=\s]+$/;

export function isAcceptedImageUrl(value: string): boolean {
  if (INLINE_IMAGE.test(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
