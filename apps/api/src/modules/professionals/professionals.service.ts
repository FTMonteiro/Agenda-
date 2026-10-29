import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { ProfessionalBlockDTO, ProfessionalDTO } from "@slotix/types";
import { authRepository } from "../auth/auth.repository";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/errors";
import { assertBusinessOwner, getBusinessOrThrow } from "../businesses";
import { usersRepository } from "../users";
import { professionalsRepository } from "./professionals.repository";
import type { CreateBlockInput, CreateProfessionalInput, InviteProfessionalInput, UpdateProfessionalInput } from "./professionals.schema";
import { normalizeEmail } from "../../shared/utils/email";
import { endAllSessions } from "../auth/auth.service";

// Base64url, no padding — short enough to read out loud, long enough to not be guessable
// as a one-time credential the owner relays manually (chat, in person) to a new hire.
function generateTemporaryPassword(): string {
  return randomBytes(9).toString("base64url");
}

function toProfessionalDTO(professional: {
  id: string;
  businessId: string;
  userId: string;
  bio: string | null;
  specialty: string | null;
  imageUrl: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string };
  appointments: { review: { rating: number } | null }[];
}): ProfessionalDTO {
  const ratings = professional.appointments.map((a) => a.review?.rating).filter((rating): rating is number => rating !== undefined && rating !== null);
  const ratingAvg = ratings.length > 0 ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10 : null;

  return {
    id: professional.id,
    businessId: professional.businessId,
    userId: professional.userId,
    name: professional.user.name,
    bio: professional.bio,
    specialty: professional.specialty,
    imageUrl: professional.imageUrl,
    ratingAvg,
    ratingCount: ratings.length,
    active: professional.active,
    createdAt: professional.createdAt.toISOString(),
    updatedAt: professional.updatedAt.toISOString(),
  };
}

export async function getProfessionalOrThrow(id: string) {
  const professional = await professionalsRepository.findById(id);
  if (!professional) throw new NotFoundError("Profissional não encontrado.", "PROFESSIONAL_NOT_FOUND");
  return professional;
}

function toBlockDTO(block: { id: string; professionalId: string; startAt: Date; endAt: Date; reason: string | null }): ProfessionalBlockDTO {
  return {
    id: block.id,
    professionalId: block.professionalId,
    startAt: block.startAt.toISOString(),
    endAt: block.endAt.toISOString(),
    reason: block.reason,
  };
}

async function assertCanManageBlocks(professional: { businessId: string; userId: string }, requesterId: string): Promise<void> {
  if (professional.userId === requesterId) return;

  const business = await getBusinessOrThrow(professional.businessId);
  assertBusinessOwner(business, requesterId);
}

export const professionalsService = {
  async create(_requesterId: string, input: CreateProfessionalInput): Promise<ProfessionalDTO> {
    // Admin-only route (see professionals.routes.ts): the business only has to exist.
    await getBusinessOrThrow(input.businessId);

    const user = await usersRepository.findById(input.userId);
    if (!user) throw new NotFoundError("Utilizador não encontrado.", "USER_NOT_FOUND");
    if (user.role !== "EMPLOYEE") {
      throw new ValidationError("O utilizador tem de ter o papel EMPLOYEE.", "USER_NOT_EMPLOYEE");
    }

    const existing = await professionalsRepository.findByUserId(input.userId);
    if (existing) throw new ConflictError("Este utilizador já é profissional noutro negócio.", "PROFESSIONAL_ALREADY_LINKED");

    const professional = await professionalsRepository.create(input);
    return toProfessionalDTO(professional);
  },

  // Creates the login (User, role EMPLOYEE) and the Professional together — unlike
  // `create`, which links an *existing* user. The plaintext temporary password is
  // returned exactly once, here, for the owner to relay to the new hire; it is never
  // recoverable afterwards (only its hash is stored).
  async invite(ownerId: string, input: InviteProfessionalInput): Promise<{ professional: ProfessionalDTO; temporaryPassword: string }> {
    const business = await getBusinessOrThrow(input.businessId);
    assertBusinessOwner(business, ownerId);

    if (await authRepository.isEmailTaken(input.email)) throw new ConflictError("Este email já está registado.", "EMAIL_ALREADY_REGISTERED");

    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const professional = await professionalsRepository.createWithNewUser({
      businessId: input.businessId,
      name: input.name,
      email: normalizeEmail(input.email),
      passwordHash,
      phone: input.phone,
      specialty: input.specialty,
      imageUrl: input.imageUrl,
    });

    return { professional: toProfessionalDTO(professional), temporaryPassword };
  },

  // Passwords are stored only as a hash, so the owner can never be shown the one an
  // employee is using. What they can do is replace it: a new temporary password is
  // generated and returned once, and the employee is signed out everywhere.
  async resetPassword(id: string, ownerId: string): Promise<{ temporaryPassword: string }> {
    const professional = await getProfessionalOrThrow(id);
    const business = await getBusinessOrThrow(professional.businessId);
    assertBusinessOwner(business, ownerId);

    const temporaryPassword = generateTemporaryPassword();
    await usersRepository.updatePasswordHash(professional.userId, await bcrypt.hash(temporaryPassword, 10));
    await endAllSessions(professional.userId);

    return { temporaryPassword };
  },

  // The caller's own professional profile — how an EMPLOYEE resolves "which business
  // and professional record am I", the same role /api/profile played in the old dashboard.
  async getMine(userId: string): Promise<ProfessionalDTO> {
    const professional = await professionalsRepository.findByUserId(userId);
    if (!professional) throw new NotFoundError("Não tem um perfil de profissional associado.", "PROFESSIONAL_PROFILE_NOT_FOUND");

    return this.getById(professional.id);
  },

  async listByBusiness(businessId: string): Promise<ProfessionalDTO[]> {
    const professionals = await professionalsRepository.findByBusiness(businessId);
    return professionals.map(toProfessionalDTO);
  },

  async getById(id: string): Promise<ProfessionalDTO> {
    const professional = await getProfessionalOrThrow(id);
    return toProfessionalDTO(professional);
  },

  async update(id: string, ownerId: string, input: UpdateProfessionalInput): Promise<ProfessionalDTO> {
    const professional = await getProfessionalOrThrow(id);
    const business = await getBusinessOrThrow(professional.businessId);
    assertBusinessOwner(business, ownerId);

    const updated = await professionalsRepository.update(id, input);
    return toProfessionalDTO(updated);
  },

  async remove(id: string, ownerId: string): Promise<void> {
    const professional = await getProfessionalOrThrow(id);
    const business = await getBusinessOrThrow(professional.businessId);
    assertBusinessOwner(business, ownerId);

    await professionalsRepository.delete(id);
  },

  async addBlock(professionalId: string, requesterId: string, input: CreateBlockInput): Promise<ProfessionalBlockDTO> {
    const professional = await getProfessionalOrThrow(professionalId);
    await assertCanManageBlocks(professional, requesterId);

    const block = await professionalsRepository.createBlock({
      professionalId,
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      reason: input.reason,
    });
    return toBlockDTO(block);
  },

  async listBlocks(professionalId: string, requesterId: string): Promise<ProfessionalBlockDTO[]> {
    const professional = await getProfessionalOrThrow(professionalId);
    await assertCanManageBlocks(professional, requesterId);

    const blocks = await professionalsRepository.findBlocksByProfessional(professionalId);
    return blocks.map(toBlockDTO);
  },

  async removeBlock(professionalId: string, blockId: string, requesterId: string): Promise<void> {
    const professional = await getProfessionalOrThrow(professionalId);
    await assertCanManageBlocks(professional, requesterId);

    const block = await professionalsRepository.findBlockById(blockId);
    if (!block || block.professionalId !== professionalId) {
      throw new NotFoundError("Bloqueio não encontrado.", "BLOCK_NOT_FOUND");
    }

    await professionalsRepository.deleteBlock(blockId);
  },
};
