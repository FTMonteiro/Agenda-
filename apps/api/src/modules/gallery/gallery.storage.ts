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

export async function uploadGalleryImage(businessId: string, file: { buffer: Buffer; mimetype: string }): Promise<{ url: string; path: string }> {
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
  const path = `businesses/${businessId}/${randomUUID()}.${extension}`;

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
