import type { ServiceDTO } from "@slotix/types";
import { NotFoundError } from "../../shared/errors";
import { assertBusinessOwner, getBusinessOrThrow } from "../businesses";
import { servicesRepository } from "./services.repository";
import type { CreateServiceInput, UpdateServiceInput } from "./services.schema";

function toServiceDTO(service: {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: { toNumber(): number };
  duration: number;
  category: string | null;
  imageUrl: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): ServiceDTO {
  return {
    id: service.id,
    businessId: service.businessId,
    name: service.name,
    description: service.description,
    price: service.price.toNumber(),
    duration: service.duration,
    category: service.category,
    imageUrl: service.imageUrl,
    active: service.active,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

export async function getServiceOrThrow(id: string) {
  const service = await servicesRepository.findById(id);
  if (!service) throw new NotFoundError("Serviço não encontrado.", "SERVICE_NOT_FOUND");
  return service;
}

export const servicesService = {
  async create(ownerId: string, input: CreateServiceInput): Promise<ServiceDTO> {
    const business = await getBusinessOrThrow(input.businessId);
    assertBusinessOwner(business, ownerId);

    const service = await servicesRepository.create(input);
    return toServiceDTO(service);
  },

  async listByBusiness(businessId: string): Promise<ServiceDTO[]> {
    const services = await servicesRepository.findByBusiness(businessId);
    return services.map(toServiceDTO);
  },

  async getById(id: string): Promise<ServiceDTO> {
    const service = await getServiceOrThrow(id);
    return toServiceDTO(service);
  },

  async update(id: string, ownerId: string, input: UpdateServiceInput): Promise<ServiceDTO> {
    const service = await getServiceOrThrow(id);
    const business = await getBusinessOrThrow(service.businessId);
    assertBusinessOwner(business, ownerId);

    const updated = await servicesRepository.update(id, input);
    return toServiceDTO(updated);
  },

  async remove(id: string, ownerId: string): Promise<void> {
    const service = await getServiceOrThrow(id);
    const business = await getBusinessOrThrow(service.businessId);
    assertBusinessOwner(business, ownerId);

    await servicesRepository.delete(id);
  },
};
