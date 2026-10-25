export type Role = "CUSTOMER" | "OWNER" | "EMPLOYEE" | "ADMIN";

export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiListSuccess<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

export type ApiListResponse<T> = ApiListSuccess<T> | ApiError;

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  // The last position the app saved for this user; null until they allow location.
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: string | null;
  createdAt: string;
}

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginResponse extends AuthTokensDTO {
  user: UserDTO;
}

export interface BusinessDTO {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  category: string | null;
  // The gallery cover.
  imageUrl: string | null;
  // The logo set in the dashboard; apps show it ahead of imageUrl.
  logoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  // The region the pin falls in, as OpenStreetMap names it. All null until the owner
  // marks the location.
  provincia: string | null;
  municipio: string | null;
  distrito: string | null;
  bairro: string | null;
  rua: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  // How many users have this business in their favorites.
  favoriteCount: number;
  // Only present when the request included the viewer's latitude/longitude.
  distanceKm: number | null;
  createdAt: string;
  updatedAt: string;
}

export type BusinessSortBy = "recommended" | "nearest" | "topRated" | "mostFavorited";

export interface BusinessListQuery {
  category?: string;
  provincia?: string;
  municipio?: string;
  bairro?: string;
  search?: string;
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  sortBy?: BusinessSortBy;
  // Only the businesses favorited by a good share of the app's customers.
  popular?: boolean;
  page?: number;
  limit?: number;
}

// A place where businesses exist, with how many. municipio/bairro are null for the
// businesses whose pin has no such level in OpenStreetMap.
export interface LocalityDTO {
  provincia: string;
  municipio: string | null;
  bairro: string | null;
  count: number;
}

// A province of Angola as OpenStreetMap has it, with the centre of its territory.
export interface ProvinceDTO {
  name: string;
  latitude: number;
  longitude: number;
}

// A named place inside a province (town, bairro, neighbourhood) and where it is.
export interface ZoneDTO {
  name: string;
  latitude: number;
  longitude: number;
}

// What OpenStreetMap knows about a point or a searched address.
export interface PlaceDTO {
  // The full address as OpenStreetMap writes it.
  displayName: string;
  // Street and number (or the place's own name), without the region.
  street: string;
  bairro: string | null;
  // The urban district ("Distrito Urbano da Maianga"), where the map has one.
  distrito: string | null;
  municipio: string | null;
  provincia: string | null;
  latitude: number;
  longitude: number;
}

export interface BusinessHoursEntryDTO {
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export interface ProfessionalBlockDTO {
  id: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
}

export interface AvailabilityQuery {
  businessId: string;
  professionalId: string;
  serviceId: string;
  date: string;
}

export interface AvailabilitySlotDTO {
  time: string;
}

export interface ServiceDTO {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  category: string | null;
  imageUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProfessionalDTO {
  id: string;
  businessId: string;
  userId: string;
  name: string;
  bio: string | null;
  specialty: string | null;
  imageUrl: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDTO {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  // The photo from the client's own app account.
  avatarUrl: string | null;
  // When they became a client of the business (accepted when booking in the app).
  clientSince: string | null;
  visits: number;
  totalSpent: number;
  lastVisit: string | null;
  status: "active" | "vip" | "inactive";
}

// Whether the signed-in app user is a client of a business. Booking there does not make
// them one: the app asks, and they can decline and still book.
export interface BusinessMembershipDTO {
  businessId: string;
  isClient: boolean;
  clientSince: string | null;
}

// A customer the business knows offline (walk-in, phone booking) with no account of
// their own. Distinct from ClientDTO, which is derived from a User's booking history.
export interface WalkInClientDTO {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email: string | null;
  active: boolean;
  visits: number;
  totalSpent: number;
  lastVisit: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWalkInClientRequest {
  name: string;
  phone: string;
  email?: string;
}

export interface UpdateWalkInClientRequest {
  name?: string;
  phone?: string;
  email?: string;
  active?: boolean;
}

export interface AppointmentDTO {
  id: string;
  businessId: string;
  // Exactly one of the two is non-null: clientId for a self-service booking, walkInClientId
  // for one entered by the business on behalf of someone without an account.
  clientId: string | null;
  walkInClientId: string | null;
  serviceId: string;
  professionalId: string;
  scheduledAt: string;
  price: number;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  businessId: string;
  serviceId: string;
  professionalId: string;
  scheduledAt: string;
  notes?: string;
}

// Booked by the business on behalf of a walk-in client, not by the client themselves.
export interface CreateWalkInAppointmentRequest {
  businessId: string;
  walkInClientId: string;
  serviceId: string;
  professionalId: string;
  scheduledAt: string;
  notes?: string;
}

export interface FavoriteDTO {
  id: string;
  businessId: string;
  business: BusinessDTO;
  createdAt: string;
}

export interface ReviewDTO {
  id: string;
  businessId: string;
  clientId: string;
  clientName: string;
  appointmentId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewRequest {
  appointmentId: string;
  rating: number;
  comment?: string;
}

export interface NotificationDTO {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type PaymentMethod = "CASH" | "CARD" | "MULTICAIXA" | "BANK_TRANSFER" | "OTHER";

export interface PaymentDTO {
  id: string;
  appointmentId: string;
  // Mirrors AppointmentDTO: exactly one of the two is non-null, matching whichever one
  // the paid appointment itself used.
  userId: string | null;
  walkInClientId: string | null;
  businessId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  appointmentId: string;
  method: PaymentMethod;
}

// Staff recording a payment received in person (cash/card/etc) on behalf of the
// business, as opposed to CreatePaymentRequest, which is the customer paying through the
// app for their own appointment.
export interface ReceivePaymentRequest {
  appointmentId: string;
  method: PaymentMethod;
}

export interface GalleryImageDTO {
  id: string;
  businessId: string;
  url: string;
  position: number;
  caption: string | null;
  createdAt: string;
}

export type SearchSortBy = "recommended" | "nearest" | "bestPrice" | "topRated";

export interface MatchedServiceDTO {
  id: string;
  name: string;
  price: number;
}

export interface SearchResultDTO {
  business: BusinessDTO;
  matchedService: MatchedServiceDTO | null;
}

export interface SearchQuery {
  q: string;
  latitude?: number;
  longitude?: number;
  sortBy?: SearchSortBy;
  page?: number;
  limit?: number;
}

export interface FinancialsPaymentDTO {
  id: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  appointmentId: string;
  scheduledAt: string;
  clientName: string;
  clientAvatarUrl: string | null;
  serviceName: string;
  professionalName: string;
}

export interface FinancialsSummaryDTO {
  period: { month: string; start: string; end: string };
  summary: { todayRevenue: number; monthlyRevenue: number; paymentsReceived: number; todayPayments: number };
  paymentMethods: Record<PaymentMethod, number>;
  payments: FinancialsPaymentDTO[];
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  avatarUrl?: string;
}

export * from "./locations";
export * from "./categories";
