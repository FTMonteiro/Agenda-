import { requireOwner } from "@/lib/auth";
import { apiCall, errorResponse } from "@/lib/dashboard-api";
import { listGallery, syncBusinessImage, toPageImage } from "../gallery";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const owner = await requireOwner();
    const { id } = await params;

    await apiCall(`/businesses/${owner.businessId}/gallery/${encodeURIComponent(id)}`, { method: "DELETE" });

    const images = await listGallery(owner.businessId);
    await syncBusinessImage(owner.businessId, images);

    return Response.json({ success: true, images: images.map(toPageImage) });
  } catch (error) {
    return errorResponse(error, "Não foi possível eliminar a imagem.");
  }
}
