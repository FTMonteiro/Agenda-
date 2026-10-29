import { z } from "zod";

// Shared field rules for the request schemas: every free-text field has a ceiling, so a
// single request can't park a megabyte of text in a row, and every image address is one
// the clients can render safely.

export const shortText = (max = 120) => z.string().trim().max(max);
export const longText = (max = 2000) => z.string().max(max);
export const phone = z.string().trim().max(40);
export const personName = z.string().trim().min(2).max(120);

// An image is either a file on the web over https (Supabase storage, Google's avatar), or
// an inline picture the app sends as a data URL (avatar, professional photo). Anything else
// — javascript:, http:, data:text/html — is refused.
const INLINE_IMAGE = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=\s]+$/;

export const imageUrl = z
  .string()
  .max(1_000_000)
  .refine((value) => {
    if (INLINE_IMAGE.test(value)) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Endereço de imagem inválido (use https ou uma imagem enviada pela app).");
