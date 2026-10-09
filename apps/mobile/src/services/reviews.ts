import type { CreateReviewRequest, ReviewDTO } from "@slotix/types";
import { apiFetch } from "./api-client";

export async function createReview(businessId: string, input: CreateReviewRequest): Promise<ReviewDTO> {
  return apiFetch<ReviewDTO>(`/businesses/${businessId}/reviews`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}
