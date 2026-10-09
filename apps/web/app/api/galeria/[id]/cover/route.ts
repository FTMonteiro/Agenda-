import type { GalleryImageDTO } from "@slotix/types";
import { requireOwner } from "@/lib/auth";
import { apiCall, errorResponse } from "@/lib/dashboard-api";
import { syncBusinessImage, toPageImage } from "../../gallery";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireOwner();
    const { id } = await params;

    const images = await apiCall<GalleryImageDTO[]>(`/businesses/${owner.businessId}/gallery/${id}/cover`, { method: "PATCH" });
    await syncBusinessImage(owner.businessId, images);

    return Response.json({ success: true, images: images.sort((a, b) => a.position - b.position).map(toPageImage) });
  } catch (error) {
    return errorResponse(error, "Não foi possível definir a capa.");
  }
}
