import bcrypt from "bcryptjs";
import type { UserDTO } from "@slotix/types";
import { AuthenticationError, NotFoundError } from "../../shared/errors";
import { usersRepository } from "./users.repository";
import type { ChangePasswordInput, UpdateLocationInput, UpdateProfileInput } from "./users.schema";

function toUserDTO(user: {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserDTO["role"];
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: Date | null;
  createdAt: Date;
}): UserDTO {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    latitude: user.latitude,
    longitude: user.longitude,
    locationUpdatedAt: user.locationUpdatedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export const usersService = {
  async getProfile(userId: string): Promise<UserDTO> {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError("Utilizador não encontrado.");
    return toUserDTO(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDTO> {
    const user = await usersRepository.update(userId, input);
    return toUserDTO(user);
  },

  async updateLocation(userId: string, input: UpdateLocationInput): Promise<UserDTO> {
    const user = await usersRepository.updateLocation(userId, input.latitude, input.longitude);
    return toUserDTO(user);
  },

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError("Utilizador não encontrado.");

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) throw new AuthenticationError("Password atual incorreta.");

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await usersRepository.updatePasswordHash(userId, passwordHash);
  },

  // Soft delete: appointments/reviews keep referencing this user (and OWNER/EMPLOYEE
  // accounts may own businesses or be linked as professionals), so a hard DELETE would
  // either violate foreign keys or silently orphan business history. Marking the account
  // deleted and revoking its refresh tokens preserves that history while blocking further
  // login/refresh (see auth.repository's deletedAt filters).
  async deleteAccount(userId: string): Promise<void> {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError("Utilizador não encontrado.");

    await usersRepository.softDelete(userId);
    await usersRepository.revokeAllRefreshTokens(userId);
  },
};
