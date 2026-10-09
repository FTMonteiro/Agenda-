import type { GalleryImageDTO } from "@slotix/types";
import { requireAuth, requireOwner } from "@/lib/auth";
import { apiCall, errorJson, errorResponse } from "@/lib/dashboard-api";
import { listGallery, syncBusinessImage, toPageImage } from "./gallery";

// The images live in the API (Supabase Storage + the gallery table), so whatever is
// uploaded here is exactly what the mobile app shows on the space's page.
export async function GET() {
  try {
    const user = await requireAuth();
    const images = await listGallery(user.businessId);

    return Response.json({ success: true, images: images.map(toPageImage) });
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar a galeria.");
  }
}

export async function POST(request: Request) {
  try {
    const owner = await requireOwner();

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) return errorJson("Selecione uma imagem.", 400);

    const upload = new FormData();
    upload.append("file", file, file.name);
    upload.append("caption", file.name.slice(0, 500));

    const image = await apiCall<GalleryImageDTO>(`/businesses/${owner.businessId}/gallery`, {
      method: "POST",
      body: upload,
    });

    if (image.position === 0) await syncBusinessImage(owner.businessId, [image]);

    return Response.json({ success: true, image: toPageImage(image) }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar a imagem.");
  }
}
