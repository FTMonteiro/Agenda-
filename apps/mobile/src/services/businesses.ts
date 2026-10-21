import type {
  BusinessDTO,
  BusinessMembershipDTO,
  BusinessHoursEntryDTO,
  BusinessListQuery,
  GalleryImageDTO,
  ProfessionalDTO,
  ReviewDTO,
  ServiceDTO,
} from "@slotix/types";
import { apiFetch, apiFetchList, buildQuery } from "./api-client";

export async function listBusinesses(query: BusinessListQuery = {}): Promise<{ data: BusinessDTO[]; meta: { page: number; limit: number; total: number } }> {
  return apiFetchList<BusinessDTO>(`/businesses${buildQuery(query)}`);
}

// Com a posição de quem vê, o espaço vem com a distância até lá (distanceKm).
export async function getBusiness(id: string, viewer?: { latitude: number; longitude: number } | null): Promise<BusinessDTO> {
  return apiFetch<BusinessDTO>(`/businesses/${id}${buildQuery(viewer ? { latitude: viewer.latitude, longitude: viewer.longitude } : {})}`);
}

export async function getBusinessHours(id: string): Promise<BusinessHoursEntryDTO[]> {
  return apiFetch<BusinessHoursEntryDTO[]>(`/businesses/${id}/hours`);
}

export async function getBusinessServices(id: string): Promise<ServiceDTO[]> {
  return apiFetch<ServiceDTO[]>(`/businesses/${id}/services`);
}

export async function getBusinessProfessionals(id: string): Promise<ProfessionalDTO[]> {
  return apiFetch<ProfessionalDTO[]>(`/businesses/${id}/professionals`);
}

export async function getBusinessReviews(id: string): Promise<ReviewDTO[]> {
  return apiFetch<ReviewDTO[]>(`/businesses/${id}/reviews`);
}

// Se a pessoa com sessão iniciada é cliente do espaço (marcar não a torna cliente).
export async function getMembership(id: string): Promise<BusinessMembershipDTO> {
  return apiFetch<BusinessMembershipDTO>(`/businesses/${id}/membership`);
}

// Torna a pessoa cliente do espaço. Os dados (nome, telefone, email, foto) vêm da conta dela.
export async function joinBusiness(id: string): Promise<BusinessMembershipDTO> {
  return apiFetch<BusinessMembershipDTO>(`/businesses/${id}/membership`, { method: "POST" });
}

export async function getBusinessGallery(id: string): Promise<GalleryImageDTO[]> {
  return apiFetch<GalleryImageDTO[]>(`/businesses/${id}/gallery`);
}
