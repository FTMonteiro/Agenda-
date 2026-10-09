import type { ReviewDTO } from "@slotix/types";
import type { CreateReviewInput } from "@slotix/validation";
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from "../../shared/errors";
import { getAppointmentOrThrow } from "../appointments";
import { reviewsRepository } from "./reviews.repository";

function toReviewDTO(review: {
  id: string;
  businessId: string;
  clientId: string;
  appointmentId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: { name: string };
}): ReviewDTO {
  return {
    id: review.id,
    businessId: review.businessId,
    clientId: review.clientId,
    clientName: review.client.name,
    appointmentId: review.appointmentId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}

export const reviewsService = {
  async create(clientId: string, input: CreateReviewInput, expectedBusinessId?: string): Promise<ReviewDTO> {
    const appointment = await getAppointmentOrThrow(input.appointmentId);

    if (appointment.clientId !== clientId) {
      throw new AuthorizationError("Só pode avaliar os seus próprios agendamentos.");
    }
    if (appointment.status !== "COMPLETED") {
      throw new ValidationError("Só é possível avaliar agendamentos concluídos.", "APPOINTMENT_NOT_COMPLETED");
    }
    if (expectedBusinessId && appointment.businessId !== expectedBusinessId) {
      throw new ValidationError("Este agendamento não pertence a este negócio.", "APPOINTMENT_BUSINESS_MISMATCH");
    }

    const existing = await reviewsRepository.findByAppointment(input.appointmentId);
    if (existing) {
      throw new ConflictError("Este agendamento já foi avaliado.", "REVIEW_ALREADY_EXISTS");
    }

    const review = await reviewsRepository.create({
      businessId: appointment.businessId,
      clientId,
      appointmentId: input.appointmentId,
      rating: input.rating,
      comment: input.comment,
    });

    return toReviewDTO(review);
  },

  async listByBusiness(businessId: string): Promise<ReviewDTO[]> {
    const reviews = await reviewsRepository.findByBusiness(businessId);
    return reviews.map(toReviewDTO);
  },

  async getById(id: string): Promise<ReviewDTO> {
    const review = await reviewsRepository.findById(id);
    if (!review) throw new NotFoundError("Avaliação não encontrada.", "REVIEW_NOT_FOUND");
    return toReviewDTO(review);
  },
};
