import { randomUUID } from "node:crypto";
import { GALLERY_BUCKET, getStorageClient, isStorageConfigured } from "../../config/storage";
import { ValidationError } from "../../shared/errors";

// Without Supabase configured, the image itself is kept in the database row as a data
// URL instead of failing the upload. That only suits small images (the dashboard shrinks
// them before sending), hence the cap; `path` marks these rows so delete knows there is
// no file in a bucket to remove. Once Supabase is configured, new uploads go there.
const INLINE_PATH = "inline";
const MAX_INLINE_BYTES = 600 * 1024;

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// The type a client declares (multer's mimetype) is only a claim: the file's first bytes
// have to match it, or a script/HTML page could be stored and served as an "image".
function hasImageSignature(buffer: Buffer, mimetype: string): boolean {
  switch (mimetype) {
    case "image/jpeg":
      return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP";
    case "image/gif":
      return ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("latin1"));
    default:
      return false;
  }
}

export function uploadGalleryImage(businessId: string, file: { buffer: Buffer; mimetype: string }): Promise<{ url: string; path: string }> {
  return uploadImage(`businesses/${businessId}`, file);
}

// Same storage for any other picture (e.g. a user's profile photo), kept under `folder`.
export async function uploadImage(folder: string, file: { buffer: Buffer; mimetype: string }): Promise<{ url: string; path: string }> {
  if (!hasImageSignature(file.buffer, file.mimetype)) {
    throw new ValidationError("O ficheiro não é uma imagem válida (JPEG, PNG, WEBP ou GIF).", "IMAGE_CONTENT_INVALID");
  }

  if (!isStorageConfigured()) {
    if (file.buffer.length > MAX_INLINE_BYTES) {
      throw new ValidationError(
        "A imagem é demasiado grande para guardar sem armazenamento externo (máximo 600 KB depois de reduzida).",
        "GALLERY_IMAGE_TOO_LARGE",
      );
    }
    return { url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`, path: INLINE_PATH };
  }

  const client = getStorageClient();
  const extension = EXTENSION_BY_MIME_TYPE[file.mimetype] ?? "bin";
  const path = `${folder}/${randomUUID()}.${extension}`;

  const { error } = await client.storage.from(GALLERY_BUCKET).upload(path, file.buffer, { contentType: file.mimetype });
  if (error) {
    throw new Error(`Falha ao enviar imagem para o storage: ${error.message}`);
  }

  const { data } = client.storage.from(GALLERY_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteGalleryImage(path: string): Promise<void> {
  if (path === INLINE_PATH) return;

  const client = getStorageClient();
  const { error } = await client.storage.from(GALLERY_BUCKET).remove([path]);
  if (error) {
    throw new Error(`Falha ao apagar imagem do storage: ${error.message}`);
  }
}
