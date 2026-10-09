import { usersRepository } from "./users.repository";

/**
 * Fills in the viewer's position on a query that came without one, from the last position
 * the app saved for that user (PUT /users/me/location). This is what lets distances keep
 * showing when the phone can't give a fresh GPS reading. An explicit latitude/longitude
 * on the request always wins, and an anonymous request is returned untouched.
 */
export async function withStoredLocation<T extends { latitude?: number; longitude?: number }>(query: T, userId: string | undefined): Promise<T> {
  if (!userId || (query.latitude !== undefined && query.longitude !== undefined)) return query;

  const user = await usersRepository.findById(userId);
  if (!user || user.latitude === null || user.longitude === null) return query;

  return { ...query, latitude: user.latitude, longitude: user.longitude };
}
