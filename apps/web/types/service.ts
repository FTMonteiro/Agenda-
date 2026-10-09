export interface Service {
  id: string;

  name: string;

  description: string | null;

  price: number;

  duration: number;

  active: boolean;

  businessId: string;

  createdAt: string;

  updatedAt: string;
}