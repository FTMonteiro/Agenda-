import { apiProxyFetch } from "./api-proxy";

// Only these two roles ever reach the dashboard — a CUSTOMER or ADMIN session (if one
// ever hit these routes) is treated as "not a dashboard user", same as no session at all.
export type AuthRole = "OWNER" | "EMPLOYEE";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  businessId: string;
  // What the header shows in the profile icon: an employee's own photo (the one the owner
  // picked when creating the account, until they set another), an owner's business logo.
  avatar: string | null;
  logo: string | null;
}

// Reconstructs the old dashboard's AuthUser (id, name, email, role, businessId) on top
// of the new API, which has no businessId on User at all: an OWNER's business comes from
// GET /businesses/mine, an EMPLOYEE's from their own GET /professionals/me. Never trusts
// anything the client sent — every field here comes from the API, freshly fetched.
export async function getCurrentUser(): Promise<AuthUser | null> {
  const meResponse = await apiProxyFetch("/auth/me");
  const meJson = await meResponse.json();
  if (!meResponse.ok || !meJson.success) return null;

  const user = meJson.data as { id: string; name: string; email: string; role: string; avatarUrl?: string | null };
  if (user.role !== "OWNER" && user.role !== "EMPLOYEE") return null;

  let businessId: string | null = null;
  let avatar: string | null = user.avatarUrl ?? null;
  let logo: string | null = null;

  if (user.role === "OWNER") {
    const bizResponse = await apiProxyFetch("/businesses/mine");
    const bizJson = await bizResponse.json();
    businessId = bizJson.success ? (bizJson.data[0]?.id ?? null) : null;
    logo = bizJson.success ? (bizJson.data[0]?.logoUrl ?? null) : null;
  } else {
    const profResponse = await apiProxyFetch("/professionals/me");
    const profJson = await profResponse.json();
    businessId = profJson.success ? profJson.data.businessId : null;
    avatar ??= profJson.success ? (profJson.data.imageUrl ?? null) : null;
  }

  if (!businessId) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role, businessId, avatar, logo };
}

// Every route below throws a plain Error with one of these two messages — the same
// string-based convention the old dashboard's routes used, so route handlers built on
// top of this can keep the exact same catch-and-map-to-status-code pattern they had before.
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireOwner(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== "OWNER") throw new Error("FORBIDDEN");
  return user;
}

// Kept distinct from requireAuth (rather than an alias) even though both current roles
// pass it, so a future third dashboard role doesn't silently start passing this check.
export async function requireStaff(): Promise<AuthUser> {
  return requireAuth();
}
