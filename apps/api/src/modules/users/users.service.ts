import bcrypt from "bcryptjs";
import type { AuthTokensDTO, UserDTO } from "@slotix/types";
import { NotFoundError, ValidationError } from "../../shared/errors";
import { uploadImage } from "../gallery/gallery.storage";
import { usersRepository } from "./users.repository";
import type { ChangePasswordInput, UpdateLocationInput, UpdateProfileInput } from "./users.schema";
import { endAllSessions, issueTokens } from "../auth/auth.service";
import { forgetSessionUser } from "../../shared/sessionUsers";

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

const AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

  // The profile photo picked in the dashboard's Configurações › Perfil. It's the person's
  // own picture, separate from the business logo; a Google sign-up starts with Google's.
  async uploadAvatar(userId: string, file: { buffer: Buffer; mimetype: string }): Promise<UserDTO> {
    if (!AVATAR_MIME_TYPES.has(file.mimetype)) {
      throw new ValidationError("Formato de imagem não suportado (use JPEG, PNG ou WEBP).", "USER_AVATAR_INVALID_FILE_TYPE");
    }

    const { url } = await uploadImage(`users/${userId}`, file);
    return toUserDTO(await usersRepository.update(userId, { avatarUrl: url }));
  },

  async removeAvatar(userId: string): Promise<UserDTO> {
    return toUserDTO(await usersRepository.update(userId, { avatarUrl: null }));
  },

  async updateLocation(userId: string, input: UpdateLocationInput): Promise<UserDTO> {
    const user = await usersRepository.updateLocation(userId, input.latitude, input.longitude);
    return toUserDTO(user);
  },

  // Every other session (refresh token) ends: whoever knew the old password is signed out.
  // The caller gets a fresh pair so the device that made the change stays signed in.
  async changePassword(userId: string, input: ChangePasswordInput): Promise<AuthTokensDTO> {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError("Utilizador não encontrado.");

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    // 400, not 401: the session is fine — a 401 here made the dashboard's proxy renew the
    // session and resend the request, rotating the refresh token on every wrong attempt.
    if (!valid) throw new ValidationError("Password atual incorreta.", "CURRENT_PASSWORD_INCORRECT");

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await usersRepository.updatePasswordHash(userId, passwordHash);
    await endAllSessions(userId);
    return issueTokens(user);
  },

  // The row stays (appointments/reviews made as a client keep referencing it) but is
  // emptied and marked deleted, which blocks login/refresh (see auth.repository's
  // deletedAt filters); an owner's spaces are deleted with it. See usersRepository.
  async deleteAccount(userId: string): Promise<void> {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError("Utilizador não encontrado.");

    const removedUserIds = await usersRepository.deleteAccount(userId);
    forgetSessionUser(...removedUserIds);
  },
};
