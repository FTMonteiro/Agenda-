import type {
  AppointmentDTO,
  BusinessDTO,
  BusinessHoursEntryDTO,
  ProfessionalDTO,
  ServiceDTO,
  UserDTO,
  WalkInClientDTO,
} from "@slotix/types";
import { requireAuth, requireOwner } from "@/lib/auth";
import { matchBusinessCategory } from "@slotix/types";
import { apiCall, errorJson, errorResponse, jsonBody } from "@/lib/dashboard-api";

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];

function toClock(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

function toMinute(clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock);
  if (!match) return null;

  const minute = Number(match[1]) * 60 + Number(match[2]);
  return minute >= 0 && minute <= 1440 ? minute : null;
}

// The settings form models opening hours as one opening/closing time shared by a set of
// working days; the API stores one window per weekday. A business with no hours saved is
// treated by the API as always open, shown here as blank times.
function toHoursForm(hours: BusinessHoursEntryDTO[]) {
  if (hours.length === 0) return { openingTime: "", closingTime: "", workingDays: DEFAULT_WORKING_DAYS };

  return {
    openingTime: toClock(Math.min(...hours.map((entry) => entry.startMinute))),
    closingTime: toClock(Math.max(...hours.map((entry) => entry.endMinute))),
    workingDays: [...new Set(hours.map((entry) => entry.dayOfWeek))].sort((a, b) => a - b),
  };
}

// email, slotInterval and rules have no equivalent in the API's Business, so they are
// always returned empty/default and ignored on save.
async function businessPayload(businessId: string) {
  const query = `businessId=${businessId}`;
  const count = (list: Promise<unknown[]>) => list.then((items) => items.length).catch(() => 0);

  const [business, hours, clients, professionals, services, appointments] = await Promise.all([
    apiCall<BusinessDTO>(`/businesses/${businessId}`),
    apiCall<BusinessHoursEntryDTO[]>(`/businesses/${businessId}/hours`),
    count(apiCall<WalkInClientDTO[]>(`/clients/walk-in?${query}`)),
    count(apiCall<ProfessionalDTO[]>(`/professionals?${query}`)),
    count(apiCall<ServiceDTO[]>(`/services?${query}`)),
    count(apiCall<AppointmentDTO[]>(`/appointments?${query}`)),
  ]);

  const hoursForm = { ...toHoursForm(hours), slotInterval: 30, rules: "" };

  return {
    role: "OWNER" as const,
    business: {
      id: business.id,
      name: business.name,
      // Empty when the space has none yet (created before the type was asked at signup).
      category: matchBusinessCategory(business.category) ?? "",
      email: "",
      phone: business.phone ?? "",
      address: business.address ?? "",
      provincia: business.provincia ?? "",
      municipio: business.municipio ?? "",
      distrito: business.distrito ?? "",
      bairro: business.bairro ?? "",
      rua: business.rua ?? "",
      latitude: business.latitude,
      longitude: business.longitude,
      logo: business.imageUrl ?? "",
      ...hoursForm,
      createdAt: business.createdAt,
      updatedAt: business.updatedAt,
      _count: { clients, professionals, services, appointments },
    },
    // The new-appointment form reads the opening hours from the top level.
    ...hoursForm,
  };
}

export async function GET() {
  try {
    const user = await requireAuth();

    if (user.role === "EMPLOYEE") {
      const [professional, account] = await Promise.all([
        apiCall<ProfessionalDTO>("/professionals/me"),
        apiCall<UserDTO>("/users/me"),
      ]);

      return Response.json({
        role: "EMPLOYEE",
        employee: {
          id: professional.id,
          name: professional.name,
          email: account.email,
          phone: account.phone ?? "",
          specialty: professional.specialty ?? "",
          active: professional.active,
        },
      });
    }

    return Response.json(await businessPayload(user.businessId));
  } catch (error) {
    return errorResponse(error, "Não foi possível carregar as configurações.");
  }
}

export async function PUT(request: Request) {
  try {
    const owner = await requireOwner();
    const body = (await request.json()) as Record<string, unknown>;

    const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
    const name = text(body.name);
    const logo = text(body.logo);
    const openingTime = text(body.openingTime);
    const closingTime = text(body.closingTime);

    if (name.length < 2) return errorJson("O nome do estabelecimento é obrigatório.", 400);

    // Optional: a space saved without a type keeps the one it had (or none, and then it
    // just isn't listed under any category in the app).
    const category = matchBusinessCategory(text(body.category));

    // The pin from the map. Optional: without it the app shows "Localização não
    // disponível" for the space, with no distance and outside "perto de si".
    const { latitude, longitude } = body;
    const hasPin =
      typeof latitude === "number" && typeof longitude === "number" && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;

    const workingDays = Array.isArray(body.workingDays)
      ? [...new Set(body.workingDays.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
      : DEFAULT_WORKING_DAYS;

    let hours: BusinessHoursEntryDTO[] = [];
    if (openingTime || closingTime) {
      const startMinute = toMinute(openingTime);
      const endMinute = toMinute(closingTime);

      if (startMinute === null || endMinute === null) return errorJson("Indique a hora de abertura e a de fecho.", 400);
      if (endMinute <= startMinute) return errorJson("A hora de fecho tem de ser depois da hora de abertura.", 400);

      hours = workingDays.map((dayOfWeek) => ({ dayOfWeek, startMinute, endMinute }));
    }

    await apiCall<BusinessDTO>(
      `/businesses/${owner.businessId}`,
      jsonBody("PATCH", {
        name,
        ...(category ? { category } : {}),
        phone: text(body.phone),
        address: text(body.address),
        // The region travels with the pin: both come from the same point on the map.
        ...(hasPin
          ? {
              latitude,
              longitude,
              provincia: text(body.provincia) || null,
              municipio: text(body.municipio) || null,
              distrito: text(body.distrito) || null,
              bairro: text(body.bairro) || null,
              rua: text(body.rua) || null,
            }
          : {}),
        // Only a hosted image can be stored: the API has no upload for the business logo.
        ...(/^https?:\/\//.test(logo) ? { imageUrl: logo } : {}),
      }),
    );
    await apiCall(`/businesses/${owner.businessId}/hours`, jsonBody("PUT", { hours }));

    return Response.json(await businessPayload(owner.businessId));
  } catch (error) {
    return errorResponse(error, "Não foi possível salvar.");
  }
}
